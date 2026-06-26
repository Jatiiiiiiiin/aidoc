import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";
import * as https from "https";

// Reuse the same filters as detectChanges.ts
const ALLOWED_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx"]);

const HIGH_PRIORITY_PATTERNS = [
  /^src\/app\/api\//,
  /^src\/services\//,
  /^src\/lib\//,
  /^src\/app\//,
  /^scripts\//,
  /^src\//,
];

const IGNORED_DIR_PATTERNS = [
  /^node_modules\//,
  /^\.github\//,
  /^\.next\//,
  /^dist\//,
  /^docs-config\//,
  /^public\//,
  /^\.git\//,
  /^scripts\/detectChanges/,
  /^scripts\/prepareWebhookPayload/,
  /^scripts\/routeDocs/,
  /^scripts\/validateWebhookResponse/,
  /^scripts\/findExistingDocs/,
  /^scripts\/updateSections/,
  /^scripts\/initializeDocs/,
];

const IGNORED_FILES = new Set([
  "next.config.ts",
  "next.config.js",
  "tailwind.config.ts",
  "tailwind.config.js",
  "postcss.config.js",
  "postcss.config.mjs",
  "eslint.config.mjs",
  "tsconfig.json",
  "package.json",
  "package-lock.json",
]);

const MAX_FILES = 15;

function getAllSourceFiles(): string[] {
  try {
    const output = execSync("git ls-files", { encoding: "utf-8" });
    return output
      .split("\n")
      .map((f) => f.trim())
      .filter((f) => f.length > 0);
  } catch {
    return [];
  }
}

function filterSourceFiles(files: string[]): string[] {
  return files.filter((file) => {
    const ext = path.extname(file);
    const basename = path.basename(file);
    if (!ALLOWED_EXTENSIONS.has(ext)) return false;
    if (IGNORED_FILES.has(basename)) return false;
    const normalized = file.replace(/\\/g, "/");
    for (const pattern of IGNORED_DIR_PATTERNS) {
      if (pattern.test(normalized)) return false;
    }
    return true;
  });
}

function prioritizeFiles(files: string[]): string[] {
  const normalized = files.map((f) => f.replace(/\\/g, "/"));
  const buckets: string[][] = HIGH_PRIORITY_PATTERNS.map(() => []);
  const rest: string[] = [];

  for (const f of normalized) {
    let placed = false;
    for (let i = 0; i < HIGH_PRIORITY_PATTERNS.length; i++) {
      if (HIGH_PRIORITY_PATTERNS[i].test(f)) {
        buckets[i].push(f);
        placed = true;
        break;
      }
    }
    if (!placed) rest.push(f);
  }

  return [...buckets.flat(), ...rest];
}

function sendWebhook(payload: object, webhookUrl: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(payload);
    const url = new URL(webhookUrl);
    const options = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(body),
      },
    };

    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        console.log(`Webhook response (${res.statusCode}): ${data}`);
        resolve();
      });
    });

    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

async function main() {
  const webhookUrl =
    process.env.N8N_WEBHOOK_URL ||
    "https://jatiiiiiin.app.n8n.cloud/webhook/ai-docs-pr-merge";

  const repo = process.env.GITHUB_REPOSITORY || "";
  const branch = process.env.GITHUB_REF_NAME || "main";

  if (!repo) {
    console.error("GITHUB_REPOSITORY is not set.");
    process.exit(1);
  }

  console.log(`Initializing AI documentation for ${repo}...`);

  const allFiles = getAllSourceFiles();
  const filtered = prioritizeFiles(filterSourceFiles(allFiles));
  const selected = filtered.slice(0, MAX_FILES);

  console.log(
    `Found ${allFiles.length} tracked files → ${filtered.length} source files → sending top ${selected.length}`
  );
  console.log(JSON.stringify(selected, null, 2));

  if (selected.length === 0) {
    console.log("No source files found. Skipping initialization.");
    return;
  }

  const payload = {
    repo,
    branch,
    changed_files: selected,
    init: true,
  };

  console.log("\nSending initialization payload to n8n...");
  await sendWebhook(payload, webhookUrl);
  console.log("\nInitialization complete. Document will be generated shortly.");
}

main().catch((err) => {
  console.error("Initialization failed:", err);
  process.exit(1);
});
