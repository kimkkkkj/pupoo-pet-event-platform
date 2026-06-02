import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(__filename), "..");
const backendDir = path.join(repoRoot, "pupoo_backend");

const apiBaseUrl = (process.env.API_BASE_URL || "https://api.pupoo.site").replace(/\/+$/, "");
const aiBaseUrl = (process.env.AI_BASE_URL || `${apiBaseUrl}/ai`).replace(/\/+$/, "");
const namespace = process.env.EKS_NAMESPACE || "pupoo";
const secretName = process.env.BACKEND_SECRET_NAME || "pupoo-backend-secret";
const mysqlClientImage = process.env.MYSQL_CLIENT_IMAGE || "mysql:8.0";
const reportPath = process.env.SMOKE_REPORT_PATH || process.env.GITHUB_STEP_SUMMARY || "";
const smokeId = buildSmokeId();
const mysqlClientPod = `auth-smoke-${smokeId}`.slice(0, 63);
const requestTimeoutMs = Number(process.env.SMOKE_REQUEST_TIMEOUT_MS || "30000");
const requestRetryCount = Number(process.env.SMOKE_REQUEST_RETRY_COUNT || "3");
const transientStatusCodes = new Set([408, 429, 502, 503, 504, 520, 521, 522, 524]);

const cleanupSql = [];
const reportLines = [];

function buildSmokeId() {
  const runId = String(process.env.GITHUB_RUN_ID || "local").replace(/[^a-zA-Z0-9]/g, "").slice(-8) || "local";
  const entropy = randomUUID().replace(/-/g, "").slice(0, 8);
  return `${runId}-${entropy}`.toLowerCase();
}

function log(message) {
  console.log(message);
  reportLines.push(message);
}

function section(title) {
  log(`\n## ${title}`);
}

function sleep(milliseconds) {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

function runCommand(command, args, options = {}) {
  const result = execFileSync(command, args, {
    cwd: options.cwd || repoRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    env: {
      ...process.env,
      ...(options.env || {}),
    },
  });
  return result.trim();
}

function kubectl(args, options = {}) {
  return runCommand("kubectl", args, options);
}

function kubectlJson(args, options = {}) {
  const text = kubectl(args, options);
  return JSON.parse(text);
}

function sqlString(value) {
  return `'${String(value).replace(/\\/g, "\\\\").replace(/'/g, "''")}'`;
}

function parseJdbcUrl(jdbcUrl) {
  const match = jdbcUrl.match(/^jdbc:mysql:\/\/([^:/?]+)(?::(\d+))?\/([^?]+)/i);
  if (!match) {
    throw new Error(`Unsupported JDBC URL: ${jdbcUrl}`);
  }
  return {
    host: match[1],
    port: match[2] || "3306",
    database: match[3],
  };
}

function getBackendDatasourceConfig() {
  const secret = kubectlJson(["get", "secret", "-n", namespace, secretName, "-o", "json"]);
  const decode = (key) => {
    const encoded = secret.data?.[key];
    if (!encoded) {
      throw new Error(`Missing ${key} in ${secretName}`);
    }
    return Buffer.from(encoded, "base64").toString("utf8");
  };

  return {
    jdbcUrl: decode("SPRING_DATASOURCE_URL"),
    username: decode("SPRING_DATASOURCE_USERNAME"),
    password: decode("SPRING_DATASOURCE_PASSWORD"),
  };
}

function ensureMysqlClientPod() {
  section("MySQL Client Pod");
  log(`Creating temporary mysql client pod: ${mysqlClientPod}`);
  kubectl([
    "run",
    mysqlClientPod,
    "-n",
    namespace,
    "--image",
    mysqlClientImage,
    "--restart=Never",
    "--command",
    "--",
    "sleep",
    "600",
  ]);
  kubectl(["wait", "--for=condition=Ready", `pod/${mysqlClientPod}`, "-n", namespace, "--timeout=120s"]);
}

function dbExec(sql, dbConfig) {
  kubectl([
    "exec",
    "-n",
    namespace,
    mysqlClientPod,
    "--",
    "env",
    `MYSQL_PWD=${dbConfig.password}`,
    "mysql",
    "-h",
    dbConfig.host,
    "-P",
    dbConfig.port,
    "-u",
    dbConfig.username,
    "-D",
    dbConfig.database,
    "--batch",
    "--raw",
    "--skip-column-names",
    "-e",
    sql,
  ]);
}

function dbScalar(sql, dbConfig) {
  const output = kubectl([
    "exec",
    "-n",
    namespace,
    mysqlClientPod,
    "--",
    "env",
    `MYSQL_PWD=${dbConfig.password}`,
    "mysql",
    "-h",
    dbConfig.host,
    "-P",
    dbConfig.port,
    "-u",
    dbConfig.username,
    "-D",
    dbConfig.database,
    "--batch",
    "--raw",
    "--skip-column-names",
    "-e",
    sql,
  ]);
  return output.split(/\r?\n/)[0]?.trim() || "";
}

async function requestJson(method, urlPath, body, cookie) {
  const headers = {
    "Content-Type": "application/json; charset=utf-8",
  };
  if (cookie) {
    headers.Cookie = cookie;
  }

  const response = await fetchWithRetry(
    `${apiBaseUrl}${urlPath}`,
    {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      redirect: "manual",
    },
    `${method} ${urlPath}`
  );

  const text = await response.text();
  let json = null;
  if (text) {
    try {
      json = JSON.parse(text);
    } catch (error) {
      json = null;
    }
  }

  return {
    status: response.status,
    json,
    text,
    setCookie: response.headers.get("set-cookie") || "",
  };
}

async function requestText(url) {
  const response = await fetchWithRetry(url, { method: "GET", redirect: "manual" }, `GET ${url}`);
  const text = await response.text();
  return {
    status: response.status,
    text,
  };
}

async function fetchWithRetry(url, init, label) {
  let lastError = null;

  for (let attempt = 1; attempt <= requestRetryCount; attempt += 1) {
    try {
      const response = await fetch(url, {
        ...init,
        signal: AbortSignal.timeout(requestTimeoutMs),
      });

      if (!transientStatusCodes.has(response.status) || attempt === requestRetryCount) {
        return response;
      }

      const bodyPreview = (await response.text()).slice(0, 240).replace(/\s+/g, " ").trim();
      log(
        `[retry] ${label} attempt ${attempt}/${requestRetryCount} got transient status ${response.status}` +
          (bodyPreview ? `: ${bodyPreview}` : "")
      );
      lastError = new Error(`${label} transient status ${response.status}`);
    } catch (error) {
      lastError = error;
      if (attempt === requestRetryCount) {
        throw error;
      }
      log(`[retry] ${label} attempt ${attempt}/${requestRetryCount} failed: ${error.message}`);
    }

    await sleep(1500 * attempt);
  }

  throw lastError || new Error(`${label} failed after retries`);
}

function getApiErrorCode(payload) {
  return payload?.errorCode || payload?.error?.code || "";
}

function getApiMessage(payload) {
  return payload?.message || payload?.error?.message || "";
}

function expect(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function extractCookie(setCookieHeader, name) {
  if (!setCookieHeader) {
    return "";
  }
  const match = setCookieHeader.match(new RegExp(`${name}=([^;]+)`));
  return match ? `${name}=${match[1]}` : "";
}

function uniquePhoneNumber() {
  const timeTail = String(Date.now()).slice(-6);
  const randomTail = String(Math.floor(Math.random() * 100)).padStart(2, "0");
  return `010${timeTail}${randomTail}`;
}

function uniqueNickname(prefix) {
  return `${prefix}${smokeId.replace(/-/g, "").slice(-8)}`.slice(0, 20);
}

function uniqueEmail(prefix) {
  return `${prefix}-${smokeId}@example.com`;
}

function scheduleCleanup(sql) {
  cleanupSql.push(sql);
}

function cleanupDatabase(dbConfig) {
  if (cleanupSql.length === 0) {
    return;
  }
  section("Cleanup");
  for (const sql of cleanupSql.reverse()) {
    try {
      dbExec(sql, dbConfig);
      log(`cleanup ok: ${sql}`);
    } catch (error) {
      log(`cleanup warn: ${error.message}`);
    }
  }
}

function deleteMysqlClientPod() {
  try {
    kubectl(["delete", "pod", mysqlClientPod, "-n", namespace, "--ignore-not-found=true", "--wait=true"]);
  } catch (error) {
    log(`cleanup warn: failed to delete mysql client pod (${error.message})`);
  }
}

function generateBcryptHash(rawPassword) {
  const args = ["-q", "printBcryptHash", "-PskipFrontendBuild=true", `-PbcryptInput=${rawPassword}`];
  const output =
    process.platform === "win32"
      ? runCommand("cmd.exe", ["/c", "gradlew.bat", ...args], { cwd: backendDir })
      : runCommand("./gradlew", args, { cwd: backendDir });
  const hash = output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .findLast((line) => line.startsWith("$2"));

  if (!hash) {
    throw new Error(`Could not parse bcrypt hash output: ${output}`);
  }
  return hash;
}

async function verifyHealth() {
  section("Health");
  const backend = await requestText(`${apiBaseUrl}/api/health`);
  expect(backend.status === 200 && backend.text.includes("ok"), `Backend health failed: ${backend.status} ${backend.text}`);
  log(`backend health ok: ${backend.status}`);

  const ai = await requestText(`${aiBaseUrl}/health`);
  expect(ai.status === 200 && ai.text.toLowerCase().includes("ok"), `AI health failed: ${ai.status} ${ai.text}`);
  log(`ai health ok: ${ai.status}`);
}

async function verifySignupStartDuplicateChecks(dbConfig) {
  section("Signup Start Duplicate Checks");
  const existingUserJson = dbScalar(
    [
      "SELECT JSON_OBJECT('email', email, 'phone', phone, 'nickname', nickname)",
      "FROM users",
      "WHERE nickname REGEXP '^[A-Za-z0-9_]{2,20}$'",
      "ORDER BY user_id",
      "LIMIT 1;",
    ].join(" "),
    dbConfig
  );
  expect(existingUserJson, "No existing user found to validate duplicate checks.");
  const existingUser = JSON.parse(existingUserJson);

  const duplicateCases = [
    {
      label: "email",
      expectedCode: "U4091",
      expectedMessage: "이미 가입된 이메일입니다.",
      payload: {
        signupType: "EMAIL",
        email: existingUser.email,
        password: "admin1234",
        nickname: uniqueNickname("smk"),
        phone: uniquePhoneNumber(),
      },
    },
    {
      label: "phone",
      expectedCode: "U4093",
      expectedMessage: "이미 가입된 전화번호입니다.",
      payload: {
        signupType: "EMAIL",
        email: uniqueEmail("auth-smoke-phone"),
        password: "admin1234",
        nickname: uniqueNickname("phn"),
        phone: existingUser.phone,
      },
    },
    {
      label: "nickname",
      expectedCode: "U4092",
      expectedMessage: "이미 사용 중인 닉네임입니다.",
      payload: {
        signupType: "EMAIL",
        email: uniqueEmail("auth-smoke-nick"),
        password: "admin1234",
        nickname: existingUser.nickname,
        phone: uniquePhoneNumber(),
      },
    },
  ];

  for (const testCase of duplicateCases) {
    if (testCase.payload.email.startsWith("auth-smoke-")) {
      scheduleCleanup(`DELETE FROM signup_sessions WHERE email = ${sqlString(testCase.payload.email)};`);
    }

    const sessionCountBefore = Number(
      dbScalar(
        `SELECT COUNT(*) FROM signup_sessions WHERE email = ${sqlString(testCase.payload.email)};`,
        dbConfig
      )
    );

    const response = await requestJson("POST", "/api/auth/signup/start", testCase.payload);
    expect(response.status === 409, `signup/start ${testCase.label} expected 409, got ${response.status}: ${response.text}`);
    expect(
      getApiErrorCode(response.json) === testCase.expectedCode,
      `signup/start ${testCase.label} expected ${testCase.expectedCode}, got ${getApiErrorCode(response.json)}`
    );
    expect(
      getApiMessage(response.json) === testCase.expectedMessage,
      `signup/start ${testCase.label} expected "${testCase.expectedMessage}", got "${getApiMessage(response.json)}"`
    );

    const sessionCountAfter = Number(
      dbScalar(
        `SELECT COUNT(*) FROM signup_sessions WHERE email = ${sqlString(testCase.payload.email)};`,
        dbConfig
      )
    );
    expect(
      sessionCountAfter === sessionCountBefore,
      `signup/start ${testCase.label} changed signup_sessions unexpectedly. before=${sessionCountBefore}, after=${sessionCountAfter}`
    );
    log(`signup/start ${testCase.label} duplicate ok -> ${testCase.expectedCode}`);
  }
}

async function verifySignupCompleteLoginAndRefresh(dbConfig) {
  section("Signup Complete + Login + Refresh");

  const password = "admin1234";
  const passwordHash = generateBcryptHash(password);
  const signupKey = randomUUID();
  const email = uniqueEmail("auth-smoke-complete");
  const nickname = uniqueNickname("cmp");
  const phone = uniquePhoneNumber();

  scheduleCleanup(`DELETE FROM refresh_token WHERE user_id IN (SELECT user_id FROM users WHERE email = ${sqlString(email)});`);
  scheduleCleanup(`DELETE FROM signup_sessions WHERE email = ${sqlString(email)};`);
  scheduleCleanup(`DELETE FROM users WHERE email = ${sqlString(email)};`);

  dbExec(
    [
      "INSERT INTO signup_sessions (",
      "signup_key, signup_type, email, password_hash, nickname, phone,",
      "otp_status, otp_verified_at, otp_fail_count,",
      "email_status, email_verified_at, email_fail_count,",
      "expires_at",
      ") VALUES (",
      `${sqlString(signupKey)}, 'EMAIL', ${sqlString(email)}, ${sqlString(passwordHash)}, ${sqlString(nickname)}, ${sqlString(phone)},`,
      "'VERIFIED', NOW(), 0,",
      "'VERIFIED', NOW(), 0,",
      "DATE_ADD(NOW(), INTERVAL 1 DAY)",
      ");",
    ].join(" "),
    dbConfig
  );

  const completeResponse = await requestJson("POST", "/api/auth/signup/complete", { signupKey });
  expect(completeResponse.status === 200, `signup/complete expected 200, got ${completeResponse.status}: ${completeResponse.text}`);
  expect(completeResponse.json?.success === true, `signup/complete success flag missing: ${completeResponse.text}`);
  expect(completeResponse.json?.data?.accessToken, "signup/complete accessToken missing.");

  const userCount = Number(dbScalar(`SELECT COUNT(*) FROM users WHERE email = ${sqlString(email)};`, dbConfig));
  expect(userCount === 1, "signup/complete did not create the user.");

  const loginResponse = await requestJson("POST", "/api/auth/login", { email, password });
  expect(loginResponse.status === 200, `login expected 200, got ${loginResponse.status}: ${loginResponse.text}`);
  expect(loginResponse.json?.success === true, `login success flag missing: ${loginResponse.text}`);
  expect(loginResponse.json?.data?.accessToken, "login accessToken missing.");

  const refreshCookie = extractCookie(loginResponse.setCookie || completeResponse.setCookie, "refresh_token");
  expect(refreshCookie, `refresh cookie missing after login/signup complete. set-cookie=${loginResponse.setCookie || completeResponse.setCookie}`);

  const refreshResponse = await requestJson("POST", "/api/auth/refresh", null, refreshCookie);
  expect(refreshResponse.status === 200, `refresh expected 200, got ${refreshResponse.status}: ${refreshResponse.text}`);
  expect(refreshResponse.json?.success === true, `refresh success flag missing: ${refreshResponse.text}`);
  expect(refreshResponse.json?.data?.accessToken, "refresh accessToken missing.");

  log("signup/complete ok");
  log("login ok");
  log("refresh ok");
}

function writeReport() {
  if (!reportPath) {
    return;
  }
  const markdown = [
    "# Auth Journey Smoke Report",
    "",
    `- smokeId: \`${smokeId}\``,
    `- apiBaseUrl: \`${apiBaseUrl}\``,
    `- namespace: \`${namespace}\``,
    "",
    "```text",
    ...reportLines,
    "```",
    "",
  ].join("\n");
  fs.appendFileSync(reportPath, markdown, "utf8");
}

async function main() {
  const datasource = getBackendDatasourceConfig();
  const dbConfig = parseJdbcUrl(datasource.jdbcUrl);
  dbConfig.username = datasource.username;
  dbConfig.password = datasource.password;

  ensureMysqlClientPod();
  await verifyHealth();
  await verifySignupStartDuplicateChecks(dbConfig);
  await verifySignupCompleteLoginAndRefresh(dbConfig);
}

try {
  await main();
  section("Result");
  log("auth journey smoke passed");
  writeReport();
} catch (error) {
  section("Result");
  log(`auth journey smoke failed: ${error.message}`);
  writeReport();
  throw error;
} finally {
  try {
    const datasource = getBackendDatasourceConfig();
    const dbConfig = parseJdbcUrl(datasource.jdbcUrl);
    dbConfig.username = datasource.username;
    dbConfig.password = datasource.password;
    cleanupDatabase(dbConfig);
  } catch (error) {
    log(`cleanup warn: ${error.message}`);
  }
  deleteMysqlClientPod();
}
