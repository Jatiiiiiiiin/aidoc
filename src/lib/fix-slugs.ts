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

function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^\w\-]+/g, "")
    .replace(/\-\-+/g, "-")
    .replace(/^-+/, "")
    .replace(/-+$/, "");
}

async function fixSlugs() {
  const headers = {
    "apikey": supabaseAnonKey,
    "Authorization": `Bearer ${supabaseAnonKey}`,
    "Content-Type": "application/json",
    "Prefer": "return=representation"
  };

  try {
    console.log("Fetching all documents to inspect slugs...");
    const res = await fetch(`${supabaseUrl}/rest/v1/docs?select=*`, { headers });
    if (!res.ok) {
      throw new Error(`Failed to fetch documents: ${res.statusText}`);
    }

    const docs = await res.json();
    console.log(`Found ${docs.length} document(s).`);

    for (const doc of docs) {
      if (!doc.slug || doc.slug.trim() === "") {
        const newSlug = slugify(doc.title);
        console.log(`Updating document ID ${doc.id}: "${doc.title}" -> setting slug to "${newSlug}"`);
        
        const updateRes = await fetch(`${supabaseUrl}/rest/v1/docs?id=eq.${doc.id}`, {
          method: "PATCH",
          headers,
          body: JSON.stringify({ slug: newSlug })
        });

        if (updateRes.ok) {
          console.log(`Successfully updated slug for "${doc.title}" to "${newSlug}".`);
        } else {
          const errText = await updateRes.text();
          console.error(`Failed to update doc ${doc.id}:`, errText);
        }
      } else {
        console.log(`Document ID ${doc.id} already has a valid slug: "${doc.slug}"`);
      }
    }
  } catch (err: any) {
    console.error("Error fixing slugs:", err.message);
  }
}

fixSlugs();
