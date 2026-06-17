import * as fs from "fs";
import * as path from "path";

// Parse arguments
const args = process.argv.slice(2);
let filePath = "";
let marker = "";
let contentInline = "";
let contentFile = "";

for (let i = 0; i < args.length; i++) {
  if (args[i] === "--file" && i + 1 < args.length) {
    filePath = args[i + 1];
    i++;
  } else if (args[i] === "--marker" && i + 1 < args.length) {
    marker = args[i + 1];
    i++;
  } else if (args[i] === "--content" && i + 1 < args.length) {
    contentInline = args[i + 1];
    i++;
  } else if (args[i] === "--content-file" && i + 1 < args.length) {
    contentFile = args[i + 1];
    i++;
  }
}

export function updateFileSection(
  targetFile: string,
  sectionMarker: string,
  newSectionContent: string
): boolean {
  if (!fs.existsSync(targetFile)) {
    console.error(`Target file does not exist: ${targetFile}`);
    return false;
  }

  const fileContent = fs.readFileSync(targetFile, "utf-8");

  // Regex matches:
  // <!-- AUTO-MARKER-START -->
  // [existing content]
  // <!-- AUTO-MARKER-END -->
  // Note: Case-insensitive, ignores spacing differences within comments.
  const regexPattern = new RegExp(
    `(<!--\\s*AUTO-${sectionMarker}-START\\s*-->)([\\s\\S]*?)(<!--\\s*AUTO-${sectionMarker}-END\\s*-->)`,
    "i"
  );

  if (!regexPattern.test(fileContent)) {
    console.warn(
      `Warning: Section markers for "AUTO-${sectionMarker}" were not found in ${targetFile}.`
    );
    return false;
  }

  // Normalize newlines to prevent compounding padding issues
  const formattedContent = newSectionContent.trim() 
    ? `\n${newSectionContent.trim()}\n` 
    : "\n";

  const updatedContent = fileContent.replace(
    regexPattern,
    `$1${formattedContent}$3`
  );

  fs.writeFileSync(targetFile, updatedContent, "utf-8");
  console.log(`Successfully updated section "AUTO-${sectionMarker}" in ${targetFile}`);
  return true;
}

function main() {
  if (!filePath) {
    console.error("Error: --file parameter is required.");
    process.exit(1);
  }

  if (!marker) {
    console.error("Error: --marker parameter is required.");
    process.exit(1);
  }

  let finalContent = contentInline;
  if (contentFile) {
    if (fs.existsSync(contentFile)) {
      finalContent = fs.readFileSync(contentFile, "utf-8");
    } else {
      console.error(`Error: Content file not found: ${contentFile}`);
      process.exit(1);
    }
  }

  const success = updateFileSection(filePath, marker, finalContent);
  if (!success) {
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}
