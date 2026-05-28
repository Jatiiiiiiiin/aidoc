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

async function testInsert() {
  const headers = {
    "apikey": supabaseAnonKey,
    "Authorization": `Bearer ${supabaseAnonKey}`,
    "Content-Type": "application/json",
    "Prefer": "return=representation"
  };

  const payload = {
    title: "Test Insert Permission",
    slug: "test-insert-permission-" + Date.now(),
    content: {
      title: "Test Title",
      sections: [],
      description: "testing if anon key can insert to docs table"
    },
    description: "test insert"
  };

  try {
    console.log("Testing POST insert to 'docs' table...");
    const res = await fetch(`${supabaseUrl}/rest/v1/docs`, {
      method: "POST",
      headers,
      body: JSON.stringify(payload)
    });

    console.log("Status:", res.status, res.statusText);
    const text = await res.text();
    console.log("Response:", text);
  } catch (err: any) {
    console.error("Insert request failed:", err.message);
  }
}

testInsert();
