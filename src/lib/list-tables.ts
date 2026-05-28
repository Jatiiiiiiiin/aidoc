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

async function listTables() {
  const headers = {
    "apikey": supabaseAnonKey,
    "Authorization": `Bearer ${supabaseAnonKey}`,
  };

  try {
    console.log("Fetching PostgREST OpenAPI specification...");
    const res = await fetch(`${supabaseUrl}/rest/v1/`, { headers });
    if (res.ok) {
      const spec = await res.json();
      console.log("Database tables found in API schema:");
      console.log(Object.keys(spec.paths).filter(path => path !== "/"));
    } else {
      console.log("Failed to fetch spec:", res.status, res.statusText);
    }
  } catch (err: any) {
    console.error("Error:", err.message);
  }
}

listTables();
