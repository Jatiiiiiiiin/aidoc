import { redirect, notFound } from "next/navigation";
import { fetchAllDocs } from "@/lib/docsFetcher";
import { mockDocsRegistry } from "@/lib/mockDoc";

export default async function Home() {
  let targetSlug: string | null = null;
  try {
    const docs = await fetchAllDocs();
    if (docs && docs.length > 0 && docs[0].slug) {
      targetSlug = docs[0].slug;
    }
  } catch (e) {
    console.warn("Redirect home failed to fetch docs:", e);
  }

  if (targetSlug) {
    redirect(`/docs/${targetSlug}`);
  }

  const mockSlugs = Object.keys(mockDocsRegistry);
  if (mockSlugs.length > 0) {
    redirect(`/docs/${mockSlugs[0]}`);
  }

  notFound();
}

