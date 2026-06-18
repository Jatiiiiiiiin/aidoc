import * as fs from "fs";
import * as path from "path";
import * as child_process from "child_process";
import chalk from "chalk";
import ora from "ora";

interface InitOptions {
  webhookUrl?: string;
  skipInstall?: boolean;
}

const TEMPLATES_DIR = path.join(__dirname, "../../templates");

function copyTemplate(src: string, dest: string, replacements: Record<string, string> = {}) {
  const dir = path.dirname(dest);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  let content = fs.readFileSync(src, "utf-8");
  for (const [key, value] of Object.entries(replacements)) {
    content = content.replaceAll(`{{${key}}}`, value);
  }
  fs.writeFileSync(dest, content, "utf-8");
}

function isGitRepo(cwd: string): boolean {
  try {
    child_process.execSync("git rev-parse --git-dir", { cwd, stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

function getRepoName(cwd: string): string {
  try {
    const remote = child_process.execSync("git remote get-url origin", { cwd, encoding: "utf-8" }).trim();
    const match = remote.match(/[:/]([^/]+\/[^/.]+)(\.git)?$/);
    if (match) return match[1];
  } catch {}
  return path.basename(cwd);
}

function hasTsx(cwd: string): boolean {
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(cwd, "package.json"), "utf-8"));
    return !!(pkg.dependencies?.tsx || pkg.devDependencies?.tsx);
  } catch {
    return false;
  }
}

export async function init(options: InitOptions) {
  const cwd = process.cwd();

  console.log(chalk.bold("\n@codebyte/aidoc — AI Documentation Setup\n"));

  // 1. Check git repo
  if (!isGitRepo(cwd)) {
    console.error(chalk.red("✗ Not a git repository. Run `git init` first."));
    process.exit(1);
  }

  const repoName = getRepoName(cwd);
  console.log(chalk.gray(`  Repo: ${repoName}`));

  // 2. Resolve webhook URL
  const webhookUrl = options.webhookUrl || process.env.AIDOC_WEBHOOK_URL || "";
  if (!webhookUrl) {
    console.error(chalk.red("✗ Webhook URL required. Pass --webhook-url <url> or set AIDOC_WEBHOOK_URL env var."));
    process.exit(1);
  }

  // 3. Scaffold files
  const spinner = ora("Scaffolding files...").start();

  try {
    // GitHub Actions workflow
    copyTemplate(
      path.join(TEMPLATES_DIR, "workflow.yml"),
      path.join(cwd, ".github/workflows/ai-docs.yml")
    );

    // Scripts
    for (const script of ["detectChanges.ts", "prepareWebhookPayload.ts", "validateWebhookResponse.ts"]) {
      copyTemplate(
        path.join(TEMPLATES_DIR, "scripts", script),
        path.join(cwd, "scripts", script)
      );
    }

    spinner.succeed("Files scaffolded");
  } catch (err) {
    spinner.fail("Failed to scaffold files");
    console.error(err);
    process.exit(1);
  }

  // 4. Add tsx if missing
  if (!hasTsx(cwd)) {
    if (!options.skipInstall) {
      const s2 = ora("Installing tsx (required for scripts)...").start();
      try {
        child_process.execSync("npm install --save-dev tsx", { cwd, stdio: "ignore" });
        s2.succeed("tsx installed");
      } catch {
        s2.warn("Could not install tsx — run `npm install --save-dev tsx` manually");
      }
    }
  }

  // 5. Add GitHub secret instruction
  console.log("\n" + chalk.bold("Almost done! One manual step:"));
  console.log(chalk.cyan("  Add this secret to your GitHub repo:"));
  console.log(chalk.white("  Settings → Secrets → Actions → New repository secret"));
  console.log(chalk.white(`  Name:  N8N_DOCS_WEBHOOK_URL`));
  console.log(chalk.white(`  Value: ${webhookUrl}`));

  console.log("\n" + chalk.green("✓ Setup complete! Push any code change to trigger your first doc generation."));
  console.log(chalk.gray(`  Doc will appear at your aidoc site under slug: ${repoName.replace("/", "-").toLowerCase()}\n`));
}
