import * as fs from "fs";
import * as path from "path";
import { normalizeDoc } from "./normalizer";
import { DocSchema } from "./schema";

// Read .env.local manually
let supabaseUrl = "";
let supabaseAnonKey = "";

try {
  const envPath = path.resolve(process.cwd(), ".env.local");
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, "utf-8");
    envContent.split("\n").forEach((line) => {
      const parts = line.split("=");
      if (parts.length >= 2) {
        const key = parts[0].trim();
        const val = parts.slice(1).join("=").trim().replace(/^['"]|['"]$/g, "");
        if (key === "NEXT_PUBLIC_SUPABASE_URL") {
          supabaseUrl = val;
        } else if (key === "NEXT_PUBLIC_SUPABASE_ANON_KEY") {
          supabaseAnonKey = val;
        }
      }
    });
  }
} catch (e) {
  console.error("Error reading .env.local:", e);
}

async function validateDocs() {
  const headers = {
    "apikey": supabaseAnonKey,
    "Authorization": `Bearer ${supabaseAnonKey}`,
    "Content-Type": "application/json",
  };

  try {
    console.log("Fetching all documents for validation...");
    const res = await fetch(`${supabaseUrl}/rest/v1/docs?select=*`, { headers });
    if (res.ok) {
      const data = await res.json();
      console.log(`Retrieved ${data.length} docs.`);
      data.forEach((doc: any, index: number) => {
        console.log(`\n--- [Doc ${index + 1}] ID: ${doc.id} | Slug: "${doc.slug}" | Title: "${doc.title}" ---`);
        
        let parsedContent = typeof doc.content === "string"
          ? JSON.parse(doc.content)
          : doc.content;

        if (!parsedContent) {
          parsedContent = {};
        }

        console.log("Sections count in DB content:", parsedContent.sections?.length || 0);

        const normalized = normalizeDoc(doc);
        if (normalized) {
          console.log("Normalization: SUCCESS");
          const validation = DocSchema.safeParse(normalized);
          if (validation.success) {
            console.log("Zod Validation: SUCCESS");
          } else {
            console.log("Zod Validation: FAILED", JSON.stringify(validation.error.format(), null, 2));
          }
        } else {
          console.log("Normalization: FAILED (normalizeDoc returned null)");
          // Let's run a manual safeParse to see why it failed
          if ((!parsedContent.sections || parsedContent.sections.length === 0) && parsedContent.metadata?.sections) {
            parsedContent.sections = parsedContent.metadata.sections;
          }
          const validation = DocSchema.safeParse({
            title: doc.title,
            description: doc.description || parsedContent.description || "",
            ...parsedContent,
          });
          if (!validation.success) {
            console.log("Zod validation errors details:", JSON.stringify(validation.error.format(), null, 2));
          }
        }
      });
    } else {
      console.log("Failed to fetch documents:", res.status, res.statusText);
    }
  } catch (err: any) {
    console.error("Error during validation:", err.message);
  }
}

validateDocs();
