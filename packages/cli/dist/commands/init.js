"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.init = init;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const child_process = __importStar(require("child_process"));
const chalk_1 = __importDefault(require("chalk"));
const ora_1 = __importDefault(require("ora"));
const TEMPLATES_DIR = path.join(__dirname, "../../templates");
function copyTemplate(src, dest, replacements = {}) {
    const dir = path.dirname(dest);
    if (!fs.existsSync(dir))
        fs.mkdirSync(dir, { recursive: true });
    let content = fs.readFileSync(src, "utf-8");
    for (const [key, value] of Object.entries(replacements)) {
        content = content.replaceAll(`{{${key}}}`, value);
    }
    fs.writeFileSync(dest, content, "utf-8");
}
function isGitRepo(cwd) {
    try {
        child_process.execSync("git rev-parse --git-dir", { cwd, stdio: "ignore" });
        return true;
    }
    catch {
        return false;
    }
}
function getRepoName(cwd) {
    try {
        const remote = child_process.execSync("git remote get-url origin", { cwd, encoding: "utf-8" }).trim();
        const match = remote.match(/[:/]([^/]+\/[^/.]+)(\.git)?$/);
        if (match)
            return match[1];
    }
    catch { }
    return path.basename(cwd);
}
function hasTsx(cwd) {
    try {
        const pkg = JSON.parse(fs.readFileSync(path.join(cwd, "package.json"), "utf-8"));
        return !!(pkg.dependencies?.tsx || pkg.devDependencies?.tsx);
    }
    catch {
        return false;
    }
}
async function init(options) {
    const cwd = process.cwd();
    console.log(chalk_1.default.bold("\n@codebyte/aidoc — AI Documentation Setup\n"));
    // 1. Check git repo
    if (!isGitRepo(cwd)) {
        console.error(chalk_1.default.red("✗ Not a git repository. Run `git init` first."));
        process.exit(1);
    }
    const repoName = getRepoName(cwd);
    console.log(chalk_1.default.gray(`  Repo: ${repoName}`));
    // 2. Resolve webhook URL
    const webhookUrl = options.webhookUrl || process.env.AIDOC_WEBHOOK_URL || "";
    if (!webhookUrl) {
        console.error(chalk_1.default.red("✗ Webhook URL required. Pass --webhook-url <url> or set AIDOC_WEBHOOK_URL env var."));
        process.exit(1);
    }
    // 3. Scaffold files
    const spinner = (0, ora_1.default)("Scaffolding files...").start();
    try {
        // GitHub Actions workflow
        copyTemplate(path.join(TEMPLATES_DIR, "workflow.yml"), path.join(cwd, ".github/workflows/ai-docs.yml"));
        // Scripts
        for (const script of ["detectChanges.ts", "prepareWebhookPayload.ts", "validateWebhookResponse.ts"]) {
            copyTemplate(path.join(TEMPLATES_DIR, "scripts", script), path.join(cwd, "scripts", script));
        }
        spinner.succeed("Files scaffolded");
    }
    catch (err) {
        spinner.fail("Failed to scaffold files");
        console.error(err);
        process.exit(1);
    }
    // 4. Add tsx if missing
    if (!hasTsx(cwd)) {
        if (!options.skipInstall) {
            const s2 = (0, ora_1.default)("Installing tsx (required for scripts)...").start();
            try {
                child_process.execSync("npm install --save-dev tsx", { cwd, stdio: "ignore" });
                s2.succeed("tsx installed");
            }
            catch {
                s2.warn("Could not install tsx — run `npm install --save-dev tsx` manually");
            }
        }
    }
    // 5. Add GitHub secret instruction
    console.log("\n" + chalk_1.default.bold("Almost done! One manual step:"));
    console.log(chalk_1.default.cyan("  Add this secret to your GitHub repo:"));
    console.log(chalk_1.default.white("  Settings → Secrets → Actions → New repository secret"));
    console.log(chalk_1.default.white(`  Name:  N8N_DOCS_WEBHOOK_URL`));
    console.log(chalk_1.default.white(`  Value: ${webhookUrl}`));
    console.log("\n" + chalk_1.default.green("✓ Setup complete! Push any code change to trigger your first doc generation."));
    console.log(chalk_1.default.gray(`  Doc will appear at your aidoc site under slug: ${repoName.replace("/", "-").toLowerCase()}\n`));
}
