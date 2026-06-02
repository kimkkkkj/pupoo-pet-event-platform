import fs from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();
const frontendRoot = path.join(repoRoot, "pupoo_frontend", "src");
const sourceExtensions = new Set([".js", ".jsx", ".ts", ".tsx"]);
const resolveExtensions = [".js", ".jsx", ".ts", ".tsx", ".json", ".css"];
const importPatterns = [
  /(?:import|export)\s+(?:[^"'`]+?\s+from\s+)?["'`](\.{1,2}\/[^"'`]+)["'`]/g,
  /import\(\s*["'`](\.{1,2}\/[^"'`]+)["'`]\s*\)/g,
  /require\(\s*["'`](\.{1,2}\/[^"'`]+)["'`]\s*\)/g,
];

const sourceFiles = [];
collectSourceFiles(frontendRoot);

const mismatches = [];
for (const sourceFile of sourceFiles) {
  const content = fs.readFileSync(sourceFile, "utf8");
  for (const pattern of importPatterns) {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      const importPath = match[1];
      const resolvedFile = resolveImport(sourceFile, importPath);
      if (!resolvedFile) {
        continue;
      }

      const expectedRelative = toPosixPath(path.relative(path.dirname(sourceFile), resolvedFile));
      const expectedImport = expectedRelative.startsWith(".")
        ? expectedRelative
        : `./${expectedRelative}`;
      const actualWithoutExtension = stripResolvableExtension(importPath);
      const expectedWithoutExtension = stripResolvableExtension(expectedImport);

      if (
        actualWithoutExtension.toLowerCase() === expectedWithoutExtension.toLowerCase() &&
        actualWithoutExtension !== expectedWithoutExtension
      ) {
        mismatches.push({
          file: toPosixPath(path.relative(repoRoot, sourceFile)),
          importPath,
          expectedImport,
        });
      }
    }
  }
}

if (mismatches.length > 0) {
  console.error("Import case mismatch detected:");
  for (const mismatch of mismatches) {
    console.error(
      `- ${mismatch.file}: "${mismatch.importPath}" -> "${mismatch.expectedImport}"`,
    );
  }
  process.exit(1);
}

console.log("Import case check passed.");

function collectSourceFiles(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      collectSourceFiles(fullPath);
      continue;
    }
    if (sourceExtensions.has(path.extname(entry.name))) {
      sourceFiles.push(fullPath);
    }
  }
}

function resolveImport(sourceFile, importPath) {
  const basePath = path.resolve(path.dirname(sourceFile), importPath);
  const candidates = [];

  if (path.extname(basePath)) {
    candidates.push(basePath);
  } else {
    for (const extension of resolveExtensions) {
      candidates.push(`${basePath}${extension}`);
    }
    for (const extension of resolveExtensions) {
      candidates.push(path.join(basePath, `index${extension}`));
    }
  }

  for (const candidate of candidates) {
    const actualPath = resolveActualCase(candidate);
    if (actualPath && fs.existsSync(actualPath) && fs.statSync(actualPath).isFile()) {
      return actualPath;
    }
  }

  return null;
}

function resolveActualCase(targetPath) {
  const absolutePath = path.resolve(targetPath);
  const parsed = path.parse(absolutePath);
  const relativeParts = absolutePath
    .slice(parsed.root.length)
    .split(path.sep)
    .filter(Boolean);

  let currentPath = parsed.root;
  const actualParts = [];

  for (const part of relativeParts) {
    if (!fs.existsSync(currentPath)) {
      return null;
    }
    const entries = fs.readdirSync(currentPath);
    const actualEntry = entries.find((entry) => entry.toLowerCase() === part.toLowerCase());
    if (!actualEntry) {
      return null;
    }
    actualParts.push(actualEntry);
    currentPath = path.join(currentPath, actualEntry);
  }

  return path.join(parsed.root, ...actualParts);
}

function stripResolvableExtension(importPath) {
  return importPath.replace(/\.(js|jsx|ts|tsx|json|css)$/i, "");
}

function toPosixPath(value) {
  return value.split(path.sep).join("/");
}
