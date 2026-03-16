import fs from "node:fs/promises";
import path from "node:path";
import { execSync } from "node:child_process";

const DEPLOYMENT_ID = process.argv[2];
const TREE_FILE = process.argv[3] ?? ".tmp-deploy-files.json";

if (!DEPLOYMENT_ID) {
  console.error("Usage: node scripts/restore-from-vercel.mjs <deploymentId> [treeFile]");
  process.exit(1);
}

const repoRoot = process.cwd();
const treeRaw = await fs.readFile(path.join(repoRoot, TREE_FILE), "utf8");
const tree = JSON.parse(treeRaw.replace(/^\uFEFF/, ""));
const deployRoot = Array.isArray(tree) ? tree[0] : tree;

const allowedRootFiles = new Set([
  "package.json",
  "package-lock.json",
  "next.config.ts",
  "tsconfig.json",
  "next-env.d.ts",
  "eslint.config.mjs",
  "postcss.config.mjs",
]);

function shouldRestore(filePath) {
  if (
    filePath.startsWith(".codex/") ||
    filePath.startsWith("out/") ||
    filePath.startsWith("node_modules/") ||
    filePath.startsWith(".next/") ||
    filePath.startsWith(".git/") ||
    filePath.startsWith(".vercel/") ||
    filePath.endsWith(".log") ||
    filePath.endsWith(".pid") ||
    filePath.endsWith(".tsbuildinfo") ||
    filePath.startsWith(".env")
  ) {
    return false;
  }

  if (filePath.startsWith("src/")) return true;
  if (filePath.startsWith("public/")) return true;
  if (filePath.startsWith("scripts/")) return true;
  return allowedRootFiles.has(filePath);
}

function collectFiles(node, prefix = "", files = []) {
  const currentPath = prefix ? `${prefix}/${node.name}` : node.name;

  if (node.type === "file" && node.uid) {
    files.push({ path: currentPath, uid: node.uid });
    return files;
  }

  if (Array.isArray(node.children)) {
    for (const child of node.children) {
      collectFiles(child, currentPath, files);
    }
  }

  return files;
}

function readApiJson(endpoint) {
  const safeEndpoint = endpoint.replaceAll('"', '\\"');
  const out = execSync(`npx vercel api "${safeEndpoint}" --raw`, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  return JSON.parse(out);
}

const allFiles = collectFiles(deployRoot)
  .filter((f) => f.path.startsWith(`${deployRoot.name}/`))
  .map((f) => ({
    ...f,
    path: f.path.slice(deployRoot.name.length + 1),
  }))
  .filter((f) => shouldRestore(f.path));

console.log(`Found ${allFiles.length} files to restore.`);

let restored = 0;
for (const file of allFiles) {
  const endpoint = `/v8/deployments/${DEPLOYMENT_ID}/files/${file.uid}`;
  const json = readApiJson(endpoint);
  if (!json?.data) {
    console.warn(`Skipped (no data): ${file.path}`);
    continue;
  }

  const targetPath = path.join(repoRoot, file.path);
  await fs.mkdir(path.dirname(targetPath), { recursive: true });
  await fs.writeFile(targetPath, Buffer.from(json.data, "base64"));
  restored += 1;

  if (restored % 20 === 0) {
    console.log(`Restored ${restored}/${allFiles.length}...`);
  }
}

console.log(`Done. Restored ${restored} files.`);
