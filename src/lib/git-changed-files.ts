import { execSync } from "child_process";
import * as fs from "fs";

const IGNORED_EXTENSIONS = [".json", ".lock", ".md", ".yml", ".yaml", ".env"];
const IGNORED_DIRS = ["node_modules", ".next", ".git", "dist", "coverage"];

export function getChangedFiles(baseCommit: string, headCommit: string): string[] {
  const output = execSync(`git diff --name-only ${baseCommit} ${headCommit}`, {
    encoding: "utf-8",
  });
  return output.split("\n").filter(Boolean);
}

export function filterSourceFiles(files: string[]): string[] {
  return files.filter((file) => {
    const ext = "." + file.split(".").pop();
    if (IGNORED_EXTENSIONS.includes(ext)) return false;
    if (IGNORED_DIRS.some((dir) => file.includes(dir))) return false;
    return true;
  });
}

export function main() {
  const args = process.argv.slice(2);
  const base = args.find((_, i) => args[i - 1] === "--base") ?? "HEAD~1";
  const head = args.find((_, i) => args[i - 1] === "--head") ?? "HEAD";
  const output = args.find((_, i) => args[i - 1] === "--output") ?? "";

  const changed = getChangedFiles(base, head);
  const filtered = filterSourceFiles(changed);

  if (output) {
    fs.writeFileSync(output, JSON.stringify(filtered, null, 2), "utf-8");
    console.log(`Wrote ${filtered.length} changed files to ${output}`);
  } else {
    console.log(filtered);
  }

  return filtered;
}

main();
