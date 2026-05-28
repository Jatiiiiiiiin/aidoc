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

async function getGaitDocDetail() {
  const headers = {
    "apikey": supabaseAnonKey,
    "Authorization": `Bearer ${supabaseAnonKey}`,
    "Content-Type": "application/json",
  };

  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/docs?slug=eq.gait-analysis-system&select=*`, { headers });
    if (res.ok) {
      const data = await res.json();
      console.log("Gait System Content keys:", Object.keys(data[0].content));
      console.log("Sections sample (first 2):", JSON.stringify(data[0].content.sections.slice(0, 2), null, 2));
    }
  } catch (err: any) {
    console.error("Error:", err.message);
  }
}

getGaitDocDetail();
