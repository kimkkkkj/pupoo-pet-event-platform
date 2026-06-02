import process from "node:process";

const canonicalHost = (process.env.APP_FRONTEND_BASE_URL || "https://www.pupoo.site").replace(/\/+$/, "");
const rootHost = "https://pupoo.site";
const googleRedirectUri = (process.env.GOOGLE_OAUTH_REDIRECT_URI || "").trim();
const googleClientId = (process.env.GOOGLE_CLIENT_ID || "").trim();
const kakaoRestKey = (process.env.KAKAO_REST_KEY || "").trim();
const kakaoPayApprovalUrl = (process.env.KAKAOPAY_APPROVAL_URL || "").trim();
const kakaoPayCancelUrl = (process.env.KAKAOPAY_CANCEL_URL || "").trim();
const kakaoPayFailUrl = (process.env.KAKAOPAY_FAIL_URL || "").trim();

const results = [];

function addResult(name, ok, details) {
  results.push({ name, ok, details });
}

function escapeMarkdown(value) {
  return String(value ?? "").replace(/\|/g, "\\|").replace(/\n/g, "<br>");
}

async function fetchWithoutRedirect(url) {
  return fetch(url, {
    method: "GET",
    redirect: "manual",
    headers: {
      "user-agent": "pupoo-provider-preflight/1.0",
      accept: "text/html,application/json",
    },
  });
}

async function checkRedirect(name, fromUrl, expectedLocation) {
  try {
    const response = await fetchWithoutRedirect(fromUrl);
    const location = response.headers.get("location") || "";
    const ok = response.status >= 300 && response.status < 400 && location === expectedLocation;
    addResult(
      name,
      ok,
      ok
        ? `${response.status} -> ${location}`
        : `expected redirect to ${expectedLocation}, got status=${response.status}, location=${location || "(none)"}`,
    );
  } catch (error) {
    addResult(name, false, `request failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function checkHtmlRoute(name, url) {
  try {
    const response = await fetch(url, {
      headers: {
        "user-agent": "pupoo-provider-preflight/1.0",
        accept: "text/html",
      },
    });
    const contentType = response.headers.get("content-type") || "";
    const ok = response.ok && contentType.includes("text/html");
    addResult(
      name,
      ok,
      ok
        ? `${response.status} ${contentType}`
        : `expected 200 text/html, got status=${response.status}, content-type=${contentType || "(none)"}`,
    );
  } catch (error) {
    addResult(name, false, `request failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function checkExactValue(name, actual, expected) {
  const ok = actual === expected;
  addResult(
    name,
    ok,
    ok ? actual : `expected ${expected}, got ${actual || "(empty)"}`,
  );
}

function checkPresent(name, value, description) {
  addResult(name, Boolean(value), value ? description : "value is missing");
}

async function main() {
  await checkRedirect(
    "루트 도메인 로그인 경로가 www로 리다이렉트되는지",
    `${rootHost}/auth/login`,
    `${canonicalHost}/auth/login`,
  );

  await checkRedirect(
    "루트 도메인 Google 콜백 경로가 www로 리다이렉트되는지",
    `${rootHost}/auth/google/callback?code=stub-code&state=stub-state`,
    `${canonicalHost}/auth/google/callback?code=stub-code&state=stub-state`,
  );

  await checkRedirect(
    "루트 도메인 KakaoPay approve 경로가 www로 리다이렉트되는지",
    `${rootHost}/payment/approve?paymentId=999999`,
    `${canonicalHost}/payment/approve?paymentId=999999`,
  );

  await checkRedirect(
    "루트 도메인 KakaoPay cancel 경로가 www로 리다이렉트되는지",
    `${rootHost}/payment/cancel?paymentId=999999`,
    `${canonicalHost}/payment/cancel?paymentId=999999`,
  );

  await checkRedirect(
    "루트 도메인 KakaoPay fail 경로가 www로 리다이렉트되는지",
    `${rootHost}/payment/fail?paymentId=999999`,
    `${canonicalHost}/payment/fail?paymentId=999999`,
  );

  await checkHtmlRoute("www 로그인 화면이 HTML로 열리는지", `${canonicalHost}/auth/login`);
  await checkHtmlRoute("www 회원가입 선택 화면이 HTML로 열리는지", `${canonicalHost}/auth/join/joinselect`);
  await checkHtmlRoute("www Google 콜백 화면이 HTML로 열리는지", `${canonicalHost}/auth/google/callback?code=stub-code&state=stub-state`);
  await checkHtmlRoute("www KakaoPay approve 화면이 HTML로 열리는지", `${canonicalHost}/payment/approve?paymentId=999999`);
  await checkHtmlRoute("www KakaoPay cancel 화면이 HTML로 열리는지", `${canonicalHost}/payment/cancel?paymentId=999999`);
  await checkHtmlRoute("www KakaoPay fail 화면이 HTML로 열리는지", `${canonicalHost}/payment/fail?paymentId=999999`);

  checkPresent("Google Client ID가 배포 변수에 있는지", googleClientId, "configured");
  checkPresent("Kakao REST Key가 배포 변수에 있는지", kakaoRestKey, "configured");
  checkExactValue("Google redirect URI가 기준 호스트와 일치하는지", googleRedirectUri, `${canonicalHost}/auth/google/callback`);
  checkExactValue("KakaoPay approve URL이 기준 호스트와 일치하는지", kakaoPayApprovalUrl, `${canonicalHost}/payment/approve?paymentId={paymentId}`);
  checkExactValue("KakaoPay cancel URL이 기준 호스트와 일치하는지", kakaoPayCancelUrl, `${canonicalHost}/payment/cancel?paymentId={paymentId}`);
  checkExactValue("KakaoPay fail URL이 기준 호스트와 일치하는지", kakaoPayFailUrl, `${canonicalHost}/payment/fail?paymentId={paymentId}`);

  const passed = results.filter((result) => result.ok).length;
  const failed = results.length - passed;

  const lines = [];
  lines.push("# 외부 연동 자동 사전점검");
  lines.push("");
  lines.push(`- 기준 호스트: \`${canonicalHost}\``);
  lines.push(`- 점검 시각(UTC): \`${new Date().toISOString()}\``);
  lines.push(`- 결과: \`${passed} passed / ${failed} failed\``);
  lines.push("");
  lines.push("| 항목 | 결과 | 상세 |");
  lines.push("| --- | --- | --- |");

  for (const result of results) {
    lines.push(`| ${escapeMarkdown(result.name)} | ${result.ok ? "PASS" : "FAIL"} | ${escapeMarkdown(result.details)} |`);
  }

  lines.push("");
  lines.push("## 수동 확인 필요 항목");
  lines.push("");
  lines.push("- Google 실제 계정 로그인과 신규 가입은 외부 인증 화면, CAPTCHA, 선택 계정 상태에 영향을 받으므로 별도 확인이 필요합니다.");
  lines.push("- KakaoPay 승인, 취소, 실패 화면은 실제 PG 리다이렉트와 pg_token 흐름을 거치므로 별도 확인이 필요합니다.");

  const report = lines.join("\n");
  process.stdout.write(`${report}\n`);

  if (failed > 0) {
    process.exitCode = 1;
  }
}

await main();
