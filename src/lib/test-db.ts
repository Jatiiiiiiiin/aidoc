import { createClient } from "@supabase/supabase-js";
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

console.log("Supabase URL:", supabaseUrl);
if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Credentials not found in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testConnection() {
  try {
    const { data: projects, error: projError } = await supabase
      .from("projects")
      .select("*")
      .limit(1);

    if (projError) {
      console.log("Error querying projects table:", projError.message);
    } else {
      console.log("Successfully connected! Projects table sample:", projects);
    }

    const { data: docs, error: docError } = await supabase
      .from("docs")
      .select("*")
      .limit(1);

    if (docError) {
      console.log("Error querying docs table:", docError.message);
    } else {
      console.log("Successfully connected! Docs table sample:", docs);
    }
  } catch (err: any) {
    console.error("Connection failed:", err.message);
  }
}

testConnection();
