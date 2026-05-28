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

async function listAllDocs() {
  const headers = {
    "apikey": supabaseAnonKey,
    "Authorization": `Bearer ${supabaseAnonKey}`,
    "Content-Type": "application/json",
  };

  try {
    console.log("Fetching all documents in 'docs' table...");
    const res = await fetch(`${supabaseUrl}/rest/v1/docs?select=*`, { headers });
    if (res.ok) {
      const data = await res.json();
      console.log(`Found ${data.length} document(s) in the database:`);
      data.forEach((doc: any, index: number) => {
        console.log(`\n--- [Doc ${index + 1}] ---`);
        console.log("ID:", doc.id);
        console.log("Slug:", doc.slug);
        console.log("Title:", doc.title);
        console.log("Created At:", doc.created_at);
        console.log("Description:", doc.description);
        // Print content title & metadata title if they exist
        if (doc.content) {
          console.log("Content Title:", doc.content.title);
          console.log("Content Keys:", Object.keys(doc.content));
        }
      });
    } else {
      console.log("Failed to fetch documents:", res.status, res.statusText);
    }
  } catch (err: any) {
    console.error("Error:", err.message);
  }
}

listAllDocs();
