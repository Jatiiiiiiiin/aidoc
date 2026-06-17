const fs = require('fs');
let data = JSON.parse(fs.readFileSync('AI Docs Generator V2 (11).json', 'utf8'));

// 1. Update the Prompt to explicitly enforce JSON escaping
const gup = data.nodes.find(n => n.name === 'Generate Update Prompt');
if (gup) {
  gup.parameters.jsCode = `
const existing = $input.first().json;
const newCode = $("Fetch GitHub File").first().json.code;

const prompt = \`
You are a SURGICAL technical writer. A file has been updated, and you must patch the existing documentation.

EXISTING DOCUMENT:
\${JSON.stringify(existing.content, null, 2)}

NEW CHANGED CODE:
\${newCode ? newCode.substring(0, 12000) : ""}

INSTRUCTIONS:
1. Analyze the code changes.
2. Determine the ABSOLUTE MINIMUM number of sections to change.
3. DO NOT output the entire document.
4. NEVER include a section if you are keeping it exactly the same.
5. CRITICAL: You must output strictly valid JSON. Escape all double quotes inside the "content" string like this: \\\\\"quote\\\\\". Do not use unescaped double quotes inside strings.

Return a JSON object:
{
  "updated_sections": [
    {
      "id": "only-the-id-of-the-changed-section",
      "type": "text",
      "title": "Existing Title",
      "content": "The new content for this section. Escape all \\\\\"quotes\\\"."
    }
  ]
}

If no changes are needed, return: { "updated_sections": [] }
\`;

return [{
  json: {
    ...$("Find Existing Doc").first().json,
    mode: "update",
    metadata: existing.content?.metadata || {},
    architecture: existing.content?.architecture || {},
    existingDoc: existing.content,
    prompt
  }
}];
  `.trim();
  console.log('✅ Updated Prompt with strict escaping rules');
}

// 2. Add trailing comma fixer to Extract Documentation JSON
const edj = data.nodes.find(n => n.name === 'Extract Documentation JSON');
if (edj) {
  if (!edj.parameters.jsCode.includes('replace(/,\\s*([\\}\\]])/g')) {
    edj.parameters.jsCode = edj.parameters.jsCode.replace(
      'let parsed;',
      `// Fix trailing commas in JSON
cleaned = cleaned.replace(/,\\s*([\\}\\]])/g, '$1');

let parsed;`
    );
    console.log('✅ Added trailing comma fixer to Extract Documentation JSON');
  }
}

// Also add to Extract Metadata JSON just in case
const emj = data.nodes.find(n => n.name === 'Extract Metadata JSON');
if (emj) {
  if (!emj.parameters.jsCode.includes('replace(/,\\s*([\\}\\]])/g')) {
    emj.parameters.jsCode = emj.parameters.jsCode.replace(
      'let parsed;',
      `// Fix trailing commas in JSON
cleaned = cleaned.replace(/,\\s*([\\}\\]])/g, '$1');

let parsed;`
    );
    console.log('✅ Added trailing comma fixer to Extract Metadata JSON');
  }
}

fs.writeFileSync('AI Docs Generator V2 (11).json', JSON.stringify(data, null, 2), 'utf8');
console.log('🎉 Done.');
