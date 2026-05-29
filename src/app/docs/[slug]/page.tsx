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

async function getDocVersions(slug: string) {
  let dbDocs: any[] = [];
  
  try {
    const { data, error } = await supabase
      .from("docs")
      .select("id, slug, title, content, description, repo, file_path, created_at")
      .order("created_at", { ascending: true });
      
    if (!error && data) {
      dbDocs = data;
    }
  } catch (err) {
    console.warn("Error fetching all docs for version check:", err);
  }

  // Group and find matching group for this slug
  const groups: { [key: string]: any[] } = {};
  dbDocs.forEach((doc) => {
    const groupKey = (doc.repo && doc.file_path) 
      ? `${doc.repo}/${doc.file_path}` 
      : (doc.slug && doc.slug.trim() !== "" ? doc.slug : slugify(doc.title));
      
    if (!groups[groupKey]) {
      groups[groupKey] = [];
    }
    groups[groupKey].push(doc);
  });

  // Find the group that contains a document with the matching slug (or slugified title)
  let matchedGroup: any[] | null = null;
  for (const groupKey in groups) {
    const items = groups[groupKey];
    if (items.some(item => item.slug === slug || slugify(item.title) === slug)) {
      matchedGroup = items;
      break;
    }
  }

  // Fallback to mock registry
  if (!matchedGroup) {
    const mockDoc = mockDocsRegistry[slug];
    if (mockDoc) {
      matchedGroup = [{
        id: slug,
        slug: slug,
        title: mockDoc.title,
        description: mockDoc.description,
        content: mockDoc,
        created_at: new Date(0).toISOString(),
        repo: null,
        file_path: null
      }];
    }
  }

  if (!matchedGroup || matchedGroup.length === 0) {
    return null;
  }

  // Sort matched group by created_at ascending
  matchedGroup.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

  // Normalize all documents in the matched group and assign version labels
  const versions = matchedGroup.map((doc, idx) => {
    const normalized = normalizeDoc(doc);
    
    // Determine version label
    let versionLabel = `v${idx + 1}`;
    const contentObj = typeof doc.content === "string" 
      ? JSON.parse(doc.content) 
      : doc.content;
    
    if (contentObj?.version) {
      versionLabel = contentObj.version;
    } else if (contentObj?.metadata?.version) {
      versionLabel = contentObj.metadata.version;
    }

    return {
      id: doc.id,
      slug: doc.slug || slugify(doc.title),
      title: normalized?.title || doc.title,
      description: normalized?.description || doc.description || "",
      created_at: doc.created_at,
      versionLabel,
      doc: normalized, // the normalized Doc object
    };
  });

  return versions;
}

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function Page({ params, searchParams }: PageProps) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  const selectedVersion = typeof resolvedSearchParams.v === "string" ? resolvedSearchParams.v : undefined;

  const versions = await getDocVersions(resolvedParams.slug);

  if (!versions || versions.length === 0) {
    notFound();
  }

  // Find active version
  const activeVersion = versions.find(v => v.versionLabel === selectedVersion) || versions[versions.length - 1];

  return (
    <DocViewerClient 
      versions={versions} 
      activeVersionLabel={activeVersion.versionLabel} 
      slug={resolvedParams.slug} 
    />
  );
}
