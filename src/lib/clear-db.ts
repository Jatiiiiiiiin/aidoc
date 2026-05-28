import * as fs from "fs";
import * as path from "path";

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

async function clearTable(tableName: string) {
  const headers = {
    "apikey": supabaseAnonKey,
    "Authorization": `Bearer ${supabaseAnonKey}`,
    "Content-Type": "application/json",
  };

  try {
    console.log(`Clearing all records from table '${tableName}'...`);
    // PostgREST requires a filter for DELETE to prevent accidental complete wipes.
    // We use id=not.is.null to safely target all rows.
    const res = await fetch(`${supabaseUrl}/rest/v1/${tableName}?id=not.is.null`, {
      method: "DELETE",
      headers,
    });

    if (res.ok) {
      console.log(`Successfully cleared table '${tableName}' (Status: ${res.status}).`);
    } else {
      const text = await res.text();
      console.error(`Failed to clear table '${tableName}' (Status: ${res.status}): ${text}`);
    }
  } catch (err: any) {
    console.error(`Error clearing table '${tableName}':`, err.message);
  }
}

async function main() {
  await clearTable("docs");
  await clearTable("projects");
}

main();
