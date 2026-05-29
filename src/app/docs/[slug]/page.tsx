import React from "react";
import { notFound } from "next/navigation";
import { mockDocsRegistry } from "../../../lib/mockDoc";
import { supabase } from "../../../lib/supabase";
import { DocSchema } from "../../../lib/schema";
import { DocViewerClient } from "../../../components/docs/DocViewerClient";

import { normalizeDoc } from "../../../lib/normalizer";

interface PageProps {
  params: Promise<{ slug: string }>;
}

function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\w\-]+/g, "")
    .replace(/\-\-+/g, "-")
    .replace(/^-+/, "")
    .replace(/-+$/, "");
}

async function getDocData(slug: string) {
  let docData = null;

  try {
    const { data, error } = await supabase
      .from("docs")
      .select("title, content, description")
      .eq("slug", slug)
      .single();

    if (!error && data) {
      docData = normalizeDoc(data);
    }
  } catch (err) {
    console.warn("Error fetching from Supabase, falling back to all docs scan:", err);
  }

  // Fallback to searching database by slugified title if direct slug match is not found
  if (!docData) {
    try {
      const { data: allDocs, error: allDocsError } = await supabase
        .from("docs")
        .select("title, content, description, slug");

      if (!allDocsError && allDocs) {
        const matchingDoc = allDocs.find(
          (d) => d.slug === slug || slugify(d.title) === slug
        );
        if (matchingDoc) {
          docData = normalizeDoc(matchingDoc);
        }
      }
    } catch (err) {
      console.warn("Error doing fallback scan of all docs:", err);
    }
  }

  // Fallback to local mock registry if database document isn't found
  if (!docData) {
    docData = mockDocsRegistry[slug] || null;
  }

  return docData;
}

export default async function Page({ params }: PageProps) {
  const resolvedParams = await params;
  const doc = await getDocData(resolvedParams.slug);

  if (!doc) {
    notFound();
  }

  return <DocViewerClient doc={doc} slug={resolvedParams.slug} />;
}
