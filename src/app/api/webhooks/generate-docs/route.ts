import { NextResponse } from 'next/server';
// Trigger webhook test 2
import { createClient } from '@supabase/supabase-js';
import { BedrockRuntimeClient, ConverseCommand } from '@aws-sdk/client-bedrock-runtime';

export const maxDuration = 300; // Allow maximum Vercel function duration

// Initialize Supabase Client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// Initialize AWS Bedrock Client
const bedrock = new BedrockRuntimeClient({
  region: process.env.AWS_REGION || 'ap-south-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  }
});

const BEDROCK_MODEL_ID = process.env.BEDROCK_MODEL_ID || 'mistral.ministral-3-14b-instruct';

export async function POST(req: Request) {
  try {
    // 1. Validate Secret (Optional but recommended)
    const authHeader = req.headers.get('authorization');
    const secret = process.env.AIDOC_WEBHOOK_SECRET;
    if (secret && authHeader !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Parse Payload
    const body = await req.json();
    const repo = body.repository?.full_name || body.repo;
    const branch = (body.ref || body.branch || 'refs/heads/main').replace('refs/heads/', '');
    
    let changedFiles: string[] = [];
    if (body.commits && Array.isArray(body.commits)) {
      changedFiles = [
        ...body.commits.flatMap((c: any) => c.added || []),
        ...body.commits.flatMap((c: any) => c.modified || [])
      ];
    } else if (Array.isArray(body.changed_files)) {
      changedFiles = body.changed_files;
    }

    if (!repo) {
      return NextResponse.json({ error: 'Missing repo in payload' }, { status: 400 });
    }

    if (changedFiles.length === 0) {
      return NextResponse.json({ success: true, message: 'No files to process' });
    }

    console.log(`Processing ${changedFiles.length} files for ${repo}@${branch}...`);

    const repoSlug = repo.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    const docPath = `content/docs/${repoSlug}.mdx`;

    // Process files sequentially to avoid race conditions when updating the same Supabase document
    for (const filePath of changedFiles) {
      console.log(`Processing file: ${filePath}`);

      // 3. Fetch Raw File from GitHub
      const rawUrl = `https://raw.githubusercontent.com/${repo}/${branch}/${filePath}`;
      let code = "";
      try {
        const fetchOptions: RequestInit = {};
        if (process.env.GITHUB_TOKEN) {
          fetchOptions.headers = {
            Authorization: `Bearer ${process.env.GITHUB_TOKEN}`
          };
        }
        const ghResponse = await fetch(rawUrl, fetchOptions);
        if (!ghResponse.ok) {
          console.log(`Skipping ${filePath} - unable to fetch from GitHub (HTTP ${ghResponse.status})`);
          continue;
        }
        code = await ghResponse.text();
      } catch (e) {
        console.error(`Failed to fetch ${filePath}:`, e);
        continue;
      }

      if (!code || code.trim() === "") continue;

      // 4. Fetch Existing Doc from Supabase
      const { data: existingDocRows, error: dbError } = await supabase
        .from('docs')
        .select('*')
        .eq('slug', repoSlug);
      
      if (dbError) {
        console.error("Supabase Error:", dbError);
        continue;
      }

      const existingDocRecord = existingDocRows && existingDocRows.length > 0 ? existingDocRows[0] : null;
      const isUpdate = !!existingDocRecord;

      let prompt = "";
      let preSkip = false;

      // 5. Generate Prompt
      if (isUpdate) {
        const lowerPath = filePath.toLowerCase();
        preSkip = lowerPath.includes('.github/') || lowerPath.includes('/workflows/') ||
          lowerPath.endsWith('.yml') || lowerPath.endsWith('.yaml') || lowerPath.endsWith('.json') ||
          lowerPath.endsWith('.lock') || lowerPath.endsWith('.md') || lowerPath.endsWith('.gitignore') ||
          lowerPath.includes('/test') || lowerPath.includes('.test.') || lowerPath.includes('.spec.');

        const rawContent = existingDocRecord.content || {};
        const existingSections = rawContent.sections || [];
        
        const sectionList = existingSections.map((s: { id: string, type: string, title: string, content: unknown }) => {
          let contentSnippet = '';
          if (typeof s.content === 'string') contentSnippet = s.content.substring(0, 800);
          else if (s.content) contentSnippet = JSON.stringify(s.content).substring(0, 800);
          return `- id: ${s.id}, type: ${s.type}, title: ${s.title}\n  FULL EXISTING CONTENT (preserve this, only append/modify the specific part that changed):\n  ${contentSnippet}`;
        }).join('\n\n');

        const updateJson = '{ "updated_sections": [ { "id": "<exact-existing-id>", "type": "<same-type-as-existing>", "title": "<same-title-as-existing>", "content": "<FULL content: existing content kept intact + only the changed part added or revised>" } ] }';

        prompt =
          'You are maintaining investor-grade product documentation for a software system.\n' +
          'This document describes the ENTIRE product. The file below is ONE component of many in the codebase.\n\n' +
          'Your task: decide if this ONE file change warrants updating any existing doc sections.\n\n' +
          'STRICT RULES — READ CAREFULLY:\n' +
          '1. The document is about the WHOLE product, not this single file. Do NOT rewrite sections to be about just this file.\n' +
          '2. LOCKED SECTIONS — these NEVER change from a single file commit unless the core product value proposition fundamentally changed: executive-summary, business-problem, superior-approach, investor-value-proposition, final-conclusion.\n' +
          '3. MOST commits should return { "skip": true }. Adding a method, fixing a bug, or updating a config file almost never justifies updating investor documentation. EXCEPTION: A brand-new file that introduces a capability not previously mentioned anywhere in the document SHOULD update the step-by-step section or add a new section.\n' +
          '4. Maximum 2 sections may be returned in updated_sections. If you think more than 2 need updating, return { "skip": true } instead — that signals a major refactor requiring human review.\n' +
          '5. Only use section ids exactly as listed below. Do NOT invent new ids.\n' +
          '6. You MUST copy the exact same id, type, and title from the existing section — never change them.\n' +
          '7. SURGICAL EDIT ONLY: your updated content field must contain the COMPLETE existing content verbatim, with only the specific changed part appended or modified inline. Do NOT summarise, shorten, or restructure existing content. If you cannot preserve the full existing content, return { "skip": true } instead.\n' +
          '8. You MUST add a NEW section (with a new unique id) if the file is a brand-new script/module that introduces a capability not mentioned in any existing section. Do not skip new files — they always warrant documentation.\n\n' +
          'EXISTING DOCUMENT SECTIONS (preserve all content exactly):\n' + sectionList + '\n\n' +
          'CHANGED FILE: ' + filePath + '\n\n' +
          'FILE CODE:\n' + (code || '').substring(0, 8000) + '\n\n' +
          'Return ONLY one of these JSON formats (no markdown, no explanation):\n' +
          'Nothing to update: { "skip": true }\n' +
          'Sections to update or add (max 2): ' + updateJson;

      } else {
        // Create Mode
        prompt = `
You are a senior technical writer producing investor-grade product documentation.

Your audience includes:
Technical investors — ex-engineers, clinical advisors, regulatory reviewers
Non-technical investors — partners, LPs, operators

Every sentence must remain understandable to both audiences.

WRITING STYLE:
Declarative
Dense with information
Short paragraphs
Bullet-heavy
Pitch-deck rhythm, not engineering-spec rhythm

RULES:
Use real function names from the code
Use exact numeric constants from the code
Never invent. If unsupported by code or briefing, omit it.

FORMATTING RULES:
Inside markdown contents, use ## for subsections and ### for constants, concepts, inputs, outputs.
Use fenced code blocks for formulas, constants, thresholds, examples, pipeline diagrams.

JSON OUTPUT SCHEMA:
You MUST output a single, strictly valid JSON object conforming exactly to this structure:
{
  "title": "Project Name - Technical Documentation",
  "description": "Investor-grade technical documentation",
  "sections": [
    {
      "id": "executive-summary",
      "type": "text",
      "title": "Executive Summary",
      "content": "A markdown string containing 2-3 short paragraphs and one bullet list. Highlight what the system does, raw inputs, outputs, target user, and 4-6 grounded use cases."
    },
    {
      "id": "step-by-step",
      "type": "text",
      "title": "1. Step-by-Step Technical Explanation",
      "content": "A markdown string explaining 4-7 total steps."
    }
  ]
}

CRITICAL JSON RULES (MUST FOLLOW STRICTLY):
1. Do NOT escape backticks (\`) in the JSON string. Write them directly as \` (e.g. \`\`\`text). Escaping backticks as \\\` is INVALID JSON and will crash the parser.
2. The output must be a single, strictly valid JSON object. Do not include any markdown fence block wrapper (like \`\`\`json ... \`\`\`) or conversational text outside the JSON.

SOURCE CODE:
${(code || "").substring(0, 12000)}

Generate professional engineering documentation now.
Return ONLY the JSON object.
`;
      }

      if (preSkip) {
        console.log(`Skipping file ${filePath} based on pre-skip rules.`);
        continue;
      }

      // 6. Call AWS Bedrock
      console.log(`Calling AWS Bedrock for ${filePath}...`);
      let aiResponseText = "";
      try {
        const command = new ConverseCommand({
          modelId: BEDROCK_MODEL_ID,
          messages: [{ role: 'user', content: [{ text: prompt }] }],
          inferenceConfig: { maxTokens: 3000, temperature: 0.1 }
        });
        const response = await bedrock.send(command);
        aiResponseText = response.output?.message?.content?.[0]?.text || "";
      } catch (err) {
        console.error("Bedrock API Error:", err);
        continue;
      }

      // 7. Extract & Parse JSON safely
      let cleaned = aiResponseText.replace(/```json/gi, "").replace(/```/g, "").trim();
      const start = cleaned.indexOf("{");
      if (start === -1) {
        console.error("No JSON object found in response");
        continue;
      }
      
      let depth = 0; let inString = false; let escapeNext = false; let end = -1;
      for (let i = start; i < cleaned.length; i++) {
        const char = cleaned[i];
        if (inString) {
          if (escapeNext) escapeNext = false;
          else if (char === "\\") escapeNext = true;
          else if (char === '"') inString = false;
        } else {
          if (char === '"') inString = true;
          else if (char === "{") depth++;
          else if (char === "}") {
            depth--;
            if (depth === 0) { end = i; break; }
          }
        }
      }
      
      if (end === -1) {
        console.error("Unbalanced JSON in AI response.");
        continue;
      }
      
      cleaned = cleaned.slice(start, end + 1);
      cleaned = cleaned.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, "");
      cleaned = cleaned.replace(/"(?:[^"\\]|\\.)*"/g, (match) => {
        return match.replace(/\n/g, "\\n").replace(/\r/g, "\\r").replace(/\t/g, "\\t").replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, "");
      });
      cleaned = cleaned.replace(/,\s*([\}\]])/g, "$1");

      let parsed = null;
      try {
        parsed = JSON.parse(cleaned);
      } catch (e) {
        console.error("Failed to parse AI JSON:", e, cleaned.substring(0, 100));
        continue;
      }

      // 8. Surgical Merge & Upsert
      let finalDoc = isUpdate ? existingDocRecord.content : {};
      
      if (isUpdate) {
        if (parsed.skip === true) {
          console.log(`AI skipped update for ${filePath}`);
          continue;
        }

        const mergedSections = [...(finalDoc.sections || [])];
        const patches = parsed.updated_sections || [];
        if (patches.length === 0) {
          console.log(`No patches found for ${filePath}`);
          continue;
        }

        for (const patch of patches) {
          if (!patch.id) continue;
          const index = mergedSections.findIndex((s: { id: string }) => s.id === patch.id);
          if (index !== -1) {
            mergedSections[index] = { ...mergedSections[index], ...patch };
          } else {
            mergedSections.push(patch);
          }
        }
        
        finalDoc.sections = mergedSections;
      } else {
        finalDoc = { ...finalDoc, ...parsed };
      }

      finalDoc.updated_at = new Date().toISOString();
      finalDoc.raw = { file_path: filePath, repo, branch, doc_path: docPath };

      // 9. Save to Supabase
      const { error: upsertError } = await supabase.from('docs').upsert({
        slug: repoSlug,
        title: finalDoc.title || existingDocRecord?.title || 'Untitled',
        description: finalDoc.description || existingDocRecord?.description || '',
        content: finalDoc
      }, { onConflict: 'slug' });

      if (upsertError) {
        console.error("Supabase Upsert Error:", upsertError);
      } else {
        console.log(`Successfully updated docs for ${repoSlug}`);
      }
    }

    return NextResponse.json({ success: true, message: `Processed ${changedFiles.length} files.` });
  } catch (err: unknown) {
    console.error('Webhook processing error:', err);
    return NextResponse.json({ error: 'Internal Server Error', details: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
