"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Doc, Section } from "@/lib/schema";
import { SectionRenderer } from "./SectionRenderer";
import { Cpu, RefreshCw, Layers, Clock, Sparkles, ChevronDown } from "lucide-react";

interface DocVersionInfo {
  id: string;
  slug: string;
  title: string;
  description?: string;
  created_at: string;
  versionLabel: string;
  doc: Doc | null;
}

interface DocViewerClientProps {
  doc?: Doc; // fallback/deprecated
  slug: string;
  versions?: DocVersionInfo[];
  activeVersionLabel?: string;
}

export const DocViewerClient: React.FC<DocViewerClientProps> = ({ 
  doc, 
  slug, 
  versions, 
  activeVersionLabel 
}) => {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);

  // Find active version
  const activeVersion = React.useMemo(() => {
    if (!versions || versions.length === 0) return null;
    return versions.find(v => v.versionLabel === activeVersionLabel) || versions[versions.length - 1];
  }, [versions, activeVersionLabel]);

  // Set the current document data based on the selected version
  const initialDoc = activeVersion?.doc || doc;
  const [activeDoc, setActiveDoc] = useState<Doc | null>(initialDoc || null);
  const [regeneratingSectionId, setRegeneratingSectionId] = useState<string | null>(null);
  const [activeSectionId, setActiveSectionId] = useState<string>("");

  useEffect(() => {
    if (activeVersion && activeVersion.doc) {
      setActiveDoc(activeVersion.doc);
    } else if (doc) {
      setActiveDoc(doc);
    }
  }, [activeVersion, doc]);

  // Dispatch details when version or active doc changes
  useEffect(() => {
    if (activeDoc) {
      window.dispatchEvent(
        new CustomEvent("active-doc-version-change", {
          detail: {
            versionLabel: activeVersion?.versionLabel || "v1",
            sections: activeDoc.sections,
          },
        })
      );
    }
  }, [activeDoc, activeVersion]);

  // Scroll listener for scroll-spy highlighting
  useEffect(() => {
    const handleScroll = () => {
      let currentSectionId = "";
      
      // 1. Check if we've scrolled to the bottom of the window
      const isAtBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 15;
      if (isAtBottom && activeDoc && activeDoc.sections.length > 0) {
        currentSectionId = activeDoc.sections[activeDoc.sections.length - 1].id;
      } else if (activeDoc) {
        // 2. Otherwise find the section currently crossing the threshold (y = 180px) in the viewport
        for (const section of activeDoc.sections) {
          const el = document.getElementById(section.id);
          if (el) {
            const rect = el.getBoundingClientRect();
            if (rect.top <= 180 && rect.bottom > 180) {
              currentSectionId = section.id;
              break;
            }
          }
        }
      }

      if (currentSectionId && currentSectionId !== activeSectionId) {
        setActiveSectionId(currentSectionId);
      }
    };

    window.addEventListener("scroll", handleScroll);
    // Trigger initially
    handleScroll();

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, [activeDoc?.sections, activeSectionId]);

  // Dispatch section changes to notify the main layout navigation
  useEffect(() => {
    if (activeSectionId) {
      window.dispatchEvent(
        new CustomEvent("active-section-change", { detail: activeSectionId })
      );
    }
  }, [activeSectionId]);

  // Simulate Phase 12 - Section Regeneration
  const handleRegenerateSection = (sectionId: string) => {
    setRegeneratingSectionId(sectionId);
    
    // Simulate API roundtrip for section updates
    setTimeout(() => {
      setActiveDoc((prevDoc) => {
        if (!prevDoc) return null;
        const updatedSections = prevDoc.sections.map((sec) => {
          if (sec.id === sectionId) {
            // Modify content based on section type to show it regenerated
            let newContent = sec.content;
            if (sec.type === "text") {
              newContent = sec.content + "\n\n*(Regenerated with Cobebyte Sol. AI Docs - 100% up-to-date)*";
            } else if (sec.type === "pipeline") {
              // Update pipeline statuses to all green/success
              newContent = {
                ...sec.content,
                nodes: sec.content.nodes.map((node: any) => ({ ...node, status: "success" })),
              };
            } else if (sec.type === "bullets") {
              newContent = [...sec.content, "Continuous documentation audit pipeline completed."];
            }

            return {
              ...sec,
              content: newContent,
            };
          }
          return sec;
        });

        return {
          ...prevDoc,
          sections: updatedSections,
        };
      });
      setRegeneratingSectionId(null);
    }, 2000);
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "May 2026";
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime()) || date.getTime() === 0) return "May 2026";
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "May 2026";
    }
  };

  if (!activeDoc) {
    return (
      <div className="flex h-64 items-center justify-center">
        <RefreshCw className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex gap-8 items-start">
      {/* Main Documentation Area */}
      <div className="flex-1 space-y-12">
        {/* Doc Header */}
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2 text-xs font-mono text-primary-light">
              <Layers className="h-3.5 w-3.5" />
              <span>Workspace / {slug}</span>
            </div>
            
            {/* Version horizontal toggle */}
            {versions && versions.length > 1 && (
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono text-text-muted uppercase tracking-wider">Version:</span>
                <div className="flex items-center gap-1 bg-surface-2 border border-border-subtle p-0.5 rounded-full shadow-[inset_0_1px_2px_rgba(0,0,0,0.15)]">
                  {versions.map((v) => {
                    const isSelected = v.versionLabel === activeVersion?.versionLabel;
                    const isLatest = v.versionLabel === versions[versions.length - 1].versionLabel;
                    return (
                      <button
                        key={v.id}
                        onClick={() => {
                          router.push(`/docs/${slug}?v=${v.versionLabel}`);
                        }}
                        className={`px-3 py-1 text-[11px] font-mono rounded-full cursor-pointer transition-all flex items-center gap-1.5 ${
                          isSelected
                            ? "bg-primary text-foreground font-semibold shadow-md shadow-black/20"
                            : "text-text-muted hover:text-foreground hover:bg-surface-1/50"
                        }`}
                      >
                        <span>{v.versionLabel}</span>
                        {isLatest && (
                          <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? "bg-white" : "bg-secondary-light animate-pulse"}`} />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
          
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
            {activeDoc.title}
          </h1>
          {activeDoc.description && (
            <p className="text-lg text-text-muted leading-relaxed font-sans max-w-3xl">
              {activeDoc.description}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-4 border-y border-border-subtle py-3 text-xs text-text-muted">
            <span className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-secondary" /> Created {formatDate(activeVersion?.created_at || (doc as any)?.created_at)}
            </span>
            <span className="rounded-full bg-secondary/10 px-2.5 py-0.5 text-[10px] font-semibold text-secondary-light uppercase">
              Schema Validated
            </span>
          </div>
        </div>

        {/* Sections Listing */}
        <div className="space-y-12">
          {activeDoc.sections.map((section, index) => {
            const isTextType = section.type === "text" || section.type === "bullets";
            
            return (
              <div
                key={section.id}
                id={section.id}
                className={`relative transition-all duration-300 ${
                  isTextType
                    ? "border-transparent bg-transparent p-0"
                    : `rounded-lg border p-6 ${
                        activeSectionId === section.id
                          ? "border-primary/40 bg-surface-1 shadow-[0_0_20px_rgba(99,102,241,0.03)]"
                          : "border-border-subtle bg-surface-1/50 hover:border-primary/20"
                      }`
                }`}
              >
                {/* Section Header Controls */}
                <div className={`absolute z-10 flex gap-2 ${isTextType ? "right-0 top-1" : "right-4 top-4"}`}>
                  <button
                    onClick={() => handleRegenerateSection(section.id)}
                    disabled={regeneratingSectionId !== null}
                    className="flex items-center gap-1.5 rounded-full border border-border-subtle bg-surface-2 px-3 py-1 text-[10px] font-mono uppercase tracking-wider text-text-muted hover:text-foreground transition-all hover:bg-primary/10 hover:border-primary/30 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <RefreshCw
                      className={`h-3 w-3 ${
                        regeneratingSectionId === section.id ? "animate-spin text-primary" : ""
                      }`}
                    />
                    <span>
                      {regeneratingSectionId === section.id ? "Syncing..." : "Regen"}
                    </span>
                  </button>
                </div>

                {/* Loader overlay for section regeneration */}
                {regeneratingSectionId === section.id && (
                  <div className={`absolute inset-0 z-20 flex items-center justify-center ${isTextType ? "bg-surface-0/80" : "rounded-lg bg-surface-0/60"} backdrop-blur-sm`}>
                    <div className="flex flex-col items-center gap-3">
                      <div className="relative flex h-10 w-10 items-center justify-center">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-secondary/40 opacity-75"></span>
                        <Cpu className="relative h-6 w-6 text-secondary animate-pulse" />
                      </div>
                      <span className="text-xs font-mono text-secondary-light">
                        AI agent validation schema checking...
                      </span>
                    </div>
                  </div>
                )}

                {/* Component Section */}
                <SectionRenderer section={section} />
              </div>
            );
          })}
        </div>
      </div>

      {/* Right Sidebar Table of Contents */}
      <aside className="sticky top-20 hidden w-48 shrink-0 lg:block">
        <h4 className="mb-4 text-xs font-semibold uppercase tracking-wider text-foreground">
          On this page
        </h4>
        <nav className="space-y-3 font-sans text-xs">
          {activeDoc.sections.map((section) => {
            const isLinkActive = activeSectionId === section.id;
            return (
              <a
                key={section.id}
                href={`#${section.id}`}
                className={`block transition-colors ${
                  isLinkActive
                    ? "text-primary-light font-semibold border-l-2 border-primary pl-2"
                    : "text-text-muted hover:text-foreground pl-2"
                }`}
              >
                {section.title}
              </a>
            );
          })}
        </nav>
        <div className="mt-8 rounded-lg border border-border-subtle bg-surface-1 p-4 glow-indigo">
          <div className="flex items-center gap-1.5 text-xs font-bold text-foreground mb-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <span>AI Actions</span>
          </div>
          <p className="text-[11px] text-text-muted leading-normal mb-3">
            Regenerate individual sections above to update the document context without full page re-runs.
          </p>
        </div>
      </aside>
    </div>
  );
};

