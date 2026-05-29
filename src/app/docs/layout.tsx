"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Terminal, Cpu, Search, FileText, Compass, ChevronDown, Check, RefreshCw } from "lucide-react";
import { mockDocsRegistry } from "@/lib/mockDoc";
import { supabase } from "@/lib/supabase";
import { normalizeDoc } from "@/lib/normalizer";

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

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [dbDocs, setDbDocs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch docs list from Supabase, or fall back to mock registry
  useEffect(() => {
    async function fetchDocs() {
      try {
        const { data, error } = await supabase
          .from("docs")
          .select("id, slug, title, content, description")
          .order("created_at", { ascending: true });

        if (error) throw error;
        if (data && data.length > 0) {
          setDbDocs(data);
        }
      } catch (err) {
        console.warn("Supabase fetch failed, utilizing mock registry:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchDocs();
  }, []);

  // Merge database docs and mock registry (memoized to prevent infinite search state updates)
  const docsList = React.useMemo(() => {
    const list: any[] = [];

    dbDocs.forEach((doc) => {
      const normalized = normalizeDoc(doc);
      const docSlug = doc.slug && doc.slug.trim() !== "" ? doc.slug : slugify(doc.title);
      list.push({
        id: doc.id,
        slug: docSlug,
        title: normalized?.title || doc.title,
        sections: normalized?.sections || [],
      });
    });
    
    // Add mock docs that are not in database docs
    Object.entries(mockDocsRegistry).forEach(([slug, doc]) => {
      if (!list.some((d) => d.slug === slug)) {
        list.push({
          id: slug,
          slug,
          title: doc.title,
          sections: doc.sections || [],
        });
      }
    });

    return list;
  }, [dbDocs]);

  const [activeSectionId, setActiveSectionId] = useState<string>("");

  interface SearchResult {
    type: "doc" | "section";
    title: string;
    subtitle?: string;
    slug: string;
    sectionId?: string;
  }

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [showResults, setShowResults] = useState(false);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const query = searchQuery.toLowerCase();
    const results: SearchResult[] = [];

    docsList.forEach((doc) => {
      if (doc.title.toLowerCase().includes(query)) {
        results.push({
          type: "doc",
          title: doc.title,
          slug: doc.slug,
        });
      }

      const sections = doc.sections || [];
      sections.forEach((section: any) => {
        if (section.title.toLowerCase().includes(query)) {
          results.push({
            type: "section",
            title: section.title,
            subtitle: `In ${doc.title}`,
            slug: doc.slug,
            sectionId: section.id,
          });
        }
      });
    });

    setSearchResults(results.slice(0, 8));
  }, [searchQuery, docsList]);

  useEffect(() => {
    const handleSectionChange = (e: Event) => {
      setActiveSectionId((e as CustomEvent).detail);
    };
    window.addEventListener("active-section-change", handleSectionChange);
    return () => {
      window.removeEventListener("active-section-change", handleSectionChange);
    };
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-surface-0 text-foreground selection:bg-primary/20 selection:text-foreground">
      {/* Top Banner Navigation */}
      <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-border-subtle bg-surface-1/80 px-6 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <Link href="/docs/wearable-health-insights-pipeline" className="flex items-center gap-2">
            <div className="relative flex h-8 w-8 items-center justify-center rounded bg-gradient-to-br from-primary to-secondary text-white shadow-[0_0_10px_rgba(99,102,241,0.3)]">
              <Terminal className="h-4 w-4" />
            </div>
            <span className="bg-gradient-to-r from-white via-text-muted to-primary-light bg-clip-text text-md font-bold tracking-tight text-transparent">
              Cobebyte Sol. AI Docs
            </span>
          </Link>
          <span className="hidden rounded border border-border-subtle bg-surface-2 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-text-muted md:inline">
            v1.0.0
          </span>
        </div>

        {/* Global Action Header */}
        <div className="flex items-center gap-4">
          <div className="relative hidden w-64 md:block">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-text-muted">
              <Search className="h-4 w-4" />
            </span>
            <input
              type="text"
              placeholder="Search docs..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowResults(true);
              }}
              onFocus={() => setShowResults(true)}
              className="w-full rounded border border-border-subtle bg-surface-0 py-1.5 pl-9 pr-4 text-xs text-text-muted outline-none transition-all focus:border-primary/50 focus:text-foreground"
            />
            {showResults && searchQuery.trim() !== "" && (
              <>
                <div 
                  className="fixed inset-0 z-40 cursor-default" 
                  onClick={() => setShowResults(false)}
                />
                <div className="absolute right-0 top-full mt-2 w-80 z-50 rounded-lg border border-border-subtle bg-surface-1 p-2 shadow-2xl backdrop-blur-md max-h-96 overflow-y-auto">
                  {searchResults.length === 0 ? (
                    <div className="py-4 text-center text-xs text-text-muted font-mono">
                      No results found for "{searchQuery}"
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-text-muted">
                        Search Results
                      </div>
                      {searchResults.map((result, idx) => (
                        <Link
                          key={idx}
                          href={result.type === "doc" ? `/docs/${result.slug}` : `/docs/${result.slug}#${result.sectionId}`}
                          onClick={() => {
                            setSearchQuery("");
                            setShowResults(false);
                          }}
                          className="flex flex-col gap-0.5 rounded px-2.5 py-1.5 hover:bg-primary/10 transition-colors text-left"
                        >
                          <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                            {result.type === "doc" ? (
                              <FileText className="h-3.5 w-3.5 text-primary-light" />
                            ) : (
                              <Terminal className="h-3.5 w-3.5 text-secondary-light" />
                            )}
                            <span className="truncate">{result.title}</span>
                          </div>
                          {result.subtitle && (
                            <span className="text-[10px] text-text-muted font-sans pl-5">
                              {result.subtitle}
                            </span>
                          )}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
          <div className="flex items-center gap-2 rounded-full border border-border-subtle bg-surface-2 px-3 py-1 text-xs text-text-muted">
            <Cpu className="h-3.5 w-3.5 text-secondary animate-pulse" />
            <span className="font-mono text-[10px] uppercase">AI Layer: Active</span>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <div className="flex flex-1">
        {/* Left Sidebar Navigation */}
        <aside className="sticky top-14 hidden h-[calc(100vh-3.5rem)] w-64 shrink-0 border-r border-border-subtle bg-surface-1 p-4 md:block overflow-y-auto">
          <div className="space-y-6">
            <div>
              <h3 className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-wider text-text-muted">
                Core Guides
              </h3>
              <div className="space-y-1">
                {docsList.map((doc) => {
                  const isActive = pathname === `/docs/${doc.slug}`;
                  const sections = doc.sections || [];

                  return (
                    <div key={doc.slug} className="space-y-1">
                      <Link
                        href={`/docs/${doc.slug}`}
                        className={`flex items-center gap-2 rounded px-3 py-2 text-xs font-medium transition-colors ${
                          isActive
                            ? "bg-primary/10 text-primary-light font-semibold shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] border-l-2 border-primary"
                            : "text-text-muted hover:bg-surface-2 hover:text-foreground"
                        }`}
                      >
                        <FileText className="h-3.5 w-3.5" />
                        <span className="truncate">{doc.title}</span>
                      </Link>

                      {/* Render section sub-items for active doc */}
                      {isActive && sections.length > 0 && (
                        <div className="ml-6 space-y-1 border-l border-border-subtle pl-3 pt-1 pb-2">
                          {sections.map((section: any) => {
                            const isSubActive = activeSectionId === section.id;
                            return (
                              <a
                                key={section.id}
                                href={`#${section.id}`}
                                className={`block py-1 text-[11px] transition-colors truncate ${
                                  isSubActive
                                    ? "text-primary-light font-medium pl-1 border-l border-primary/60 -ml-[13px] pl-[12px]"
                                    : "text-text-muted hover:text-foreground"
                                }`}
                              >
                                {section.title}
                              </a>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div>
              <h3 className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-wider text-text-muted">
                System Status
              </h3>
              <div className="rounded border border-border-subtle bg-surface-2 p-3 text-xs space-y-2">
                <div className="flex items-center justify-between text-[10px] font-mono text-text-muted">
                  <span>DB Status</span>
                  <span className="text-secondary flex items-center gap-1 font-semibold">
                    <Check className="h-3 w-3" /> Connected
                  </span>
                </div>
                <div className="flex items-center justify-between text-[10px] font-mono text-text-muted">
                  <span>Cache Sync</span>
                  <span className="text-primary-light flex items-center gap-1">
                    <RefreshCw className="h-3 w-3 animate-spin" /> Synchronized
                  </span>
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* Page Content Panel */}
        <main className="flex-1 min-w-0 bg-surface-0 px-6 py-8 md:px-12 lg:px-16">
          <div className="mx-auto max-w-4xl">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
