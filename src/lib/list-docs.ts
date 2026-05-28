import * as fs from "fs";
import * as path from "path";

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

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Credentials not found in .env.local");
  process.exit(1);
}

async function listAllDocs() {
  const headers = {
    "apikey": supabaseAnonKey,
    "Authorization": `Bearer ${supabaseAnonKey}`,
    "Content-Type": "application/json",
  };

  try {
    console.log("Fetching all documents in 'docs' table...");
    const docsRes = await fetch(`${supabaseUrl}/rest/v1/docs?select=*`, { headers });
    if (!docsRes.ok) {
      console.log("Error status:", docsRes.status, docsRes.statusText);
      const errText = await docsRes.text();
      console.log("Details:", errText);
    } else {
      const data = await docsRes.json();
      console.log(`Found ${data.length} document(s) in the database:\n`);
      data.forEach((doc: any, index: number) => {
        console.log(`[Doc ${index + 1}]`);
        console.log(`ID: ${doc.id}`);
        console.log(`Slug: ${doc.slug}`);
        console.log(`Title: ${doc.title}`);
        console.log(`Created At: ${doc.created_at}`);
        console.log(`Content keys:`, doc.content ? Object.keys(doc.content) : "null");
        console.log(`Content sections count:`, doc.content?.sections?.length || 0);
        console.log("------------------------------------------");
      });
    }
  } catch (err: any) {
    console.error("Query failed:", err.message);
  }
}

listAllDocs();
