"use client";

import React, { useState } from "react";
import { CodeContent } from "@/lib/schema";
import { Check, Copy, Terminal, Image as ImageIcon } from "lucide-react";
import { MermaidRenderer } from "./MermaidRenderer";

interface CodeSectionProps {
  title: string;
  content: CodeContent;
  language?: string;
  filename?: string;
}

export const CodeSection: React.FC<CodeSectionProps> = ({
  title,
  content,
  language,
  filename,
}) => {
  const [copied, setCopied] = useState(false);
  const codeText = typeof content === "string" ? content : (content?.code || "");
  const finalLanguage = language || (typeof content === "object" ? content?.language : "typescript") || "typescript";
  const finalFilename = filename || (typeof content === "object" ? content?.filename : undefined);

  const isMermaid = finalLanguage.toLowerCase() === "mermaid";
  const [activeTab, setActiveTab] = useState<"visual" | "code">(isMermaid ? "visual" : "code");

  const handleCopy = async () => {
    await navigator.clipboard.writeText(codeText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight text-foreground">
          {title}
        </h2>
      </div>
      <div className="overflow-hidden rounded-md border border-border-subtle bg-surface-1 font-mono text-sm glow-indigo">
        {/* Terminal Header */}
        <div className="flex items-center justify-between border-b border-border-subtle bg-surface-2 px-4 py-2 text-xs text-text-muted">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              {isMermaid && activeTab === "visual" ? (
                <ImageIcon className="h-4 w-4 text-secondary" />
              ) : (
                <Terminal className="h-4 w-4 text-primary" />
              )}
              <span>{finalFilename || `${finalLanguage} snippet`}</span>
            </div>

            {/* Interactive Tabs for Mermaid diagrams */}
            {isMermaid && (
              <div className="flex items-center gap-1 rounded bg-surface-0 p-0.5 border border-border-subtle">
                <button
                  onClick={() => setActiveTab("visual")}
                  className={`cursor-pointer rounded px-2.5 py-0.5 text-[10px] font-semibold transition-all ${
                    activeTab === "visual"
                      ? "bg-primary text-foreground shadow-sm"
                      : "text-text-muted hover:text-foreground"
                  }`}
                >
                  Visual Diagram
                </button>
                <button
                  onClick={() => setActiveTab("code")}
                  className={`cursor-pointer rounded px-2.5 py-0.5 text-[10px] font-semibold transition-all ${
                    activeTab === "code"
                      ? "bg-primary text-foreground shadow-sm"
                      : "text-text-muted hover:text-foreground"
                  }`}
                >
                  Raw Code
                </button>
              </div>
            )}
          </div>
          
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 rounded px-2 py-1 transition-colors hover:bg-border-subtle hover:text-foreground cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="h-3 w-3 text-secondary" />
                <span>Copied</span>
              </>
            ) : (
              <>
                <Copy className="h-3 w-3" />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>

        {/* Content Display */}
        {isMermaid && activeTab === "visual" ? (
          <div className="p-1">
            <MermaidRenderer chart={codeText} />
          </div>
        ) : (
          <div className="overflow-x-auto p-4 max-h-[500px]">
            <pre className="text-left leading-relaxed text-text-muted selection:bg-primary/20">
              <code>{codeText}</code>
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};
