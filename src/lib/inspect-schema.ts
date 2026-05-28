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

async function inspectTable() {
  const headers = {
    "apikey": supabaseAnonKey,
    "Authorization": `Bearer ${supabaseAnonKey}`,
    "Content-Type": "application/json",
  };

  try {
    console.log("Checking structure of 'docs' table...");
    // Fetch a single document to check fields
    const res = await fetch(`${supabaseUrl}/rest/v1/docs?limit=1`, { headers });
    if (res.ok) {
      const data = await res.json();
      if (data.length > 0) {
        console.log("Existing document structure keys:", Object.keys(data[0]));
        console.log("Full columns detail:", JSON.stringify(data[0], null, 2));
      } else {
        console.log("No documents found to inspect.");
      }
    } else {
      console.log("Error fetching table:", res.status, res.statusText);
    }
  } catch (err: any) {
    console.error("Failed:", err.message);
  }
}

inspectTable();
