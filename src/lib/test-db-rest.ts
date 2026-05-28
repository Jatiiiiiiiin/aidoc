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

async function testConnectionRest() {
  const headers = {
    "apikey": supabaseAnonKey,
    "Authorization": `Bearer ${supabaseAnonKey}`,
    "Content-Type": "application/json",
  };

  try {
    console.log("Checking 'projects' table via REST...");
    const projRes = await fetch(`${supabaseUrl}/rest/v1/projects?select=*&limit=1`, { headers });
    if (!projRes.ok) {
      console.log("Projects table check response status:", projRes.status, projRes.statusText);
      const errText = await projRes.text();
      console.log("Details:", errText);
    } else {
      const data = await projRes.json();
      console.log("Projects table check: OK. Data:", data);
    }

    console.log("\nChecking 'docs' table via REST...");
    const docsRes = await fetch(`${supabaseUrl}/rest/v1/docs?select=*&limit=1`, { headers });
    if (!docsRes.ok) {
      console.log("Docs table check response status:", docsRes.status, docsRes.statusText);
      const errText = await docsRes.text();
      console.log("Details:", errText);
    } else {
      const data = await docsRes.json();
      console.log("Docs table check: OK. Data:", data);
    }
  } catch (err: any) {
    console.error("REST connection query failed:", err.message);
  }
}

testConnectionRest();
