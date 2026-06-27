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

const MAX_FILES = 200;

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

function readProjectReadme(): string {
  const candidates = ["README.md", "readme.md", "Readme.md", "ARCHITECTURE.md", "OVERVIEW.md"];
  const parts: string[] = [];
  for (const name of candidates) {
    if (fs.existsSync(name)) {
      const content = fs.readFileSync(name, "utf-8").trim();
      if (content) {
        parts.push(`--- ${name} ---\n${content.substring(0, 4000)}`);
      }
    }
  }
  return parts.join("\n\n");
}

function sendWebhook(payload: object, webhookUrl: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(payload);
    const url = new URL(webhookUrl);
    const secret = process.env.AIDOC_WEBHOOK_SECRET;
    const headers: Record<string, string | number> = {
      "Content-Type": "application/json",
      "x-github-event": "push",
      "Content-Length": Buffer.byteLength(body),
    };
    if (secret) {
      headers["Authorization"] = `Bearer ${secret}`;
    }
    const options = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      method: "POST",
      headers,
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
    process.env.AIDOC_WEBHOOK_URL ||
    "https://jatiiiiiin.app.n8n.cloud/webhook/ai-docs-pr-merge";

  let repo = process.env.GITHUB_REPOSITORY || "";
  let branch = process.env.GITHUB_REF_NAME || "";

  if (!repo) {
    try {
      const gitUrl = execSync("git config --get remote.origin.url", { encoding: "utf-8" }).trim();
      const match = gitUrl.match(/github\.com[/:]([^/]+\/[^/.]+)(?:\.git)?$/);
      if (match) {
        repo = match[1];
      }
    } catch (e) {
      console.warn("Failed to detect repository name from git remote origin url:", e);
    }
  }

  if (!branch) {
    try {
      branch = execSync("git rev-parse --abbrev-ref HEAD", { encoding: "utf-8" }).trim();
    } catch {
      branch = "main";
    }
  }

  if (!repo) {
    console.error("GITHUB_REPOSITORY is not set and could not be detected from git remote origin url.");
    process.exit(1);
  }

  console.log(`Initializing AI documentation for ${repo}...`);

  const allFiles = getAllSourceFiles();
  const filtered = filterSourceFiles(allFiles);
  const prioritized = prioritizeFiles(filtered);
  const selected = prioritized.slice(0, MAX_FILES);

  console.log(
    `Found ${allFiles.length} tracked files → ${filtered.length} source files → sending top ${selected.length}`
  );
  console.log(JSON.stringify(selected, null, 2));

  if (selected.length === 0) {
    console.log("No source files found matching routing rules. Skipping initialization.");
    return;
  }

  // The payload format now strictly mimics a standard GitHub Push Event
  // so that the exact same webhook handler can process it seamlessly.
  const commitSha = execSync("git rev-parse HEAD", { encoding: "utf-8" }).trim();
  const projectReadme = readProjectReadme();
  if (projectReadme) {
    console.log("Including README/overview context in payload.");
  }

  const payload = {
    ref: `refs/heads/${branch}`,
    before: "0000000000000000000000000000000000000000",
    after: commitSha,
    project_readme: projectReadme,
    repository: {
      full_name: repo,
      default_branch: branch,
    },
    commits: [
      {
        id: commitSha,
        message: "feat: initial aidoc connection (bulk add)",
        added: selected,
        removed: [],
        modified: []
      }
    ],
    head_commit: {
      id: commitSha,
      added: selected,
      removed: [],
      modified: []
    }
  };

  console.log("\nSending initialization payload (mock push event) to n8n...");
  await sendWebhook(payload, webhookUrl);
  console.log("\nInitialization complete. Document will be generated shortly.");
}

main().catch((err) => {
  console.error("Initialization failed:", err);
  process.exit(1);
});
