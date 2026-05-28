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

async function detailDocs() {
  const headers = {
    "apikey": supabaseAnonKey,
    "Authorization": `Bearer ${supabaseAnonKey}`,
  };

  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/docs?select=*`, { headers });
    if (res.ok) {
      const data = await res.json();
      const docsToCheck = data.filter((d: any) => d.slug.startsWith("ai-technical-documentation"));
      console.log(`Checking ${docsToCheck.length} doc(s) starting with 'ai-technical-documentation'...`);
      
      docsToCheck.forEach((doc: any) => {
        console.log("\n==================================");
        console.log("ID:", doc.id);
        console.log("Slug:", doc.slug);
        console.log("Created At:", doc.created_at);
        console.log("Title in DB:", doc.title);
        
        const content = typeof doc.content === "string" ? JSON.parse(doc.content) : doc.content;
        console.log("Content Title:", content.title);
        console.log("Content Description:", content.description);
        console.log("Metadata keys:", content.metadata ? Object.keys(content.metadata) : "None");
        console.log("Architecture systemType:", content.architecture ? content.architecture.systemType : "None");
        if (content.metadata) {
          console.log("Metadata snippet (futureScope/highlights):", JSON.stringify(content.metadata).slice(0, 300));
        }
      });
    }
  } catch (err: any) {
    console.error("Error:", err.message);
  }
}

detailDocs();
