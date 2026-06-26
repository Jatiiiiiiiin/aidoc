import { supabase } from "./supabase";
import fs from "fs";
import path from "path";

export async function fetchAllDocs() {
  // 1. Try to fetch from Supabase
  try {
    const { data, error } = await supabase
      .from("docs")
      .select("id, slug, title, content, description, repo, file_path, created_at")
      .order("created_at", { ascending: true });

    if (!error && data) {
      return data;
    }
    if (error) {
      console.warn("Supabase returned error in fetchAllDocs:", error.message);
    }
  } catch (err: any) {
    console.warn("Supabase fetch failed in fetchAllDocs:", err.message || err);
  }

  // 2. If Supabase fails or is empty, try to read from scratch/db-doc.json
  try {
    const filePath = path.join(process.cwd(), "scratch", "db-doc.json");
    if (fs.existsSync(filePath)) {
      const fileContent = fs.readFileSync(filePath, "utf-8");
      const localDocs = JSON.parse(fileContent);
      if (Array.isArray(localDocs)) {
        console.log(`Utilizing ${localDocs.length} cached docs from scratch/db-doc.json`);
        return localDocs;
      }
    }
  } catch (err: any) {
    console.warn("Failed to read cached docs from scratch/db-doc.json:", err.message || err);
  }

  return [];
}
// Trigger execution pipeline run
