import * as fs from "fs";
import * as path from "path";

const SEARCH_DIR = "C:\\Users\\jatin\\.gemini\\antigravity\\brain";
const QUERIES = ["projectName", "project_name", "briefing", "generate-docs", "n8n"];

function searchFile(filePath: string) {
  try {
    const content = fs.readFileSync(filePath, "utf8");
    QUERIES.forEach((query) => {
      if (content.includes(query)) {
        console.log(`Match found for "${query}" in: ${filePath}`);
        // Print lines containing the query
        const lines = content.split("\n");
        lines.forEach((line, idx) => {
          if (line.includes(query)) {
            console.log(`  Line ${idx + 1}: ${line.trim().slice(0, 150)}`);
          }
        });
      }
    });
  } catch (e) {
    // Ignore read errors
  }
}

function traverse(dir: string) {
  try {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        traverse(fullPath);
      } else if (stat.isFile() && file.endsWith(".txt") || file.endsWith(".md") || file.endsWith(".json")) {
        searchFile(fullPath);
      }
    }
  } catch (e) {
    // Ignore traverse errors
  }
}

console.log("Searching past conversation logs in:", SEARCH_DIR);
traverse(SEARCH_DIR);
console.log("Search complete.");
