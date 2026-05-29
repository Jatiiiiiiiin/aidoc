"use client";

import React, { useState } from "react";
import {
  ChevronRight,
  Info,
  Lightbulb,
  AlertTriangle,
  AlertOctagon,
  HelpCircle,
  Sparkles,
  Zap,
  Flame,
  Bug,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check
} from "lucide-react";

const CopyButton: React.FC<{ text: string }> = ({ text }) => {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error("Failed to copy text: ", e);
    }
  };

  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-1 rounded px-2 py-1 transition-colors hover:bg-border-subtle hover:text-foreground cursor-pointer text-text-muted text-[11px]"
    >
      {copied ? (
        <>
          <Check className="h-3.5 w-3.5 text-secondary" />
          <span>Copied</span>
        </>
      ) : (
        <>
          <Copy className="h-3.5 w-3.5" />
          <span>Copy</span>
        </>
      )}
    </button>
  );
};

/**
 * Tokenizes and renders inline markdown formatting:
 * - Bold (**text**)
 * - Italic (*text* or _text_)
 * - Inline code (`code`)
 * - Links ([label](url))
 */
export function renderFormattedText(text: string): React.ReactNode[] {
  if (!text) return [];

  type Token =
    | { type: "text"; text: string }
    | { type: "bold"; text: string }
    | { type: "italic"; text: string }
    | { type: "code"; text: string }
    | { type: "link"; text: string; url: string };

  let tokens: Token[] = [{ type: "text", text }];

  // 1. Process inline code: `code`
  tokens = tokens.flatMap((token): Token[] => {
    if (token.type !== "text") return [token];
    const parts = token.text.split(/(`[^`\n]+`)/g);
    return parts.map((part): Token => {
      if (part.startsWith("`") && part.endsWith("`")) {
        return { type: "code", text: part.slice(1, -1) };
      }
      return { type: "text", text: part };
    });
  });

  // 2. Process bold: **bold**
  tokens = tokens.flatMap((token): Token[] => {
    if (token.type !== "text") return [token];
    const parts = token.text.split(/(\*\*[^*\n]+\*\*)/g);
    return parts.map((part): Token => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return { type: "bold", text: part.slice(2, -2) };
      }
      return { type: "text", text: part };
    });
  });

  // 3. Process italic: *italic*
  tokens = tokens.flatMap((token): Token[] => {
    if (token.type !== "text") return [token];
    const parts = token.text.split(/(\*[^*\n]+\*)/g);
    return parts.map((part): Token => {
      if (part.startsWith("*") && part.endsWith("*")) {
        return { type: "italic", text: part.slice(1, -1) };
      }
      return { type: "text", text: part };
    });
  });

  // 4. Process links: [label](url)
  tokens = tokens.flatMap((token): Token[] => {
    if (token.type !== "text") return [token];
    const parts = token.text.split(/(\[[^\]\n]+\]\([^)\n]+\))/g);
    return parts.map((part): Token => {
      const match = part.match(/^\[([^\]\n]+)\]\(([^)\n]+)\)$/);
      if (match) {
        return { type: "link", text: match[1], url: match[2] };
      }
      return { type: "text", text: part };
    });
  });

  return tokens.map((token, idx) => {
    switch (token.type) {
      case "code":
        return (
          <code
            key={idx}
            className="font-mono bg-surface-2 border border-border-subtle text-primary-light px-1.5 py-0.5 rounded text-[13px] font-medium select-all hover:bg-surface-2/80 transition-colors duration-200"
          >
            {token.text}
          </code>
        );
      case "bold":
        return (
          <strong key={idx} className="text-foreground font-semibold">
            {token.text}
          </strong>
        );
      case "italic":
        return (
          <span key={idx} className="italic text-foreground/90">
            {token.text}
          </span>
        );
      case "link": {
        const isExternal = token.url.startsWith("http://") || token.url.startsWith("https://");
        return (
          <a
            key={idx}
            href={token.url}
            target={isExternal ? "_blank" : undefined}
            rel={isExternal ? "noopener noreferrer" : undefined}
            className="text-primary hover:text-primary-light underline underline-offset-4 decoration-primary/30 hover:decoration-primary-light transition-all duration-200 font-medium inline-flex items-center gap-0.5"
          >
            {token.text}
          </a>
        );
      }
      default:
        return <span key={idx}>{token.text}</span>;
    }
  });
}

/**
 * Parses markdown text block-by-block and renders appropriate React components.
 * Supports: subheadings, lists, blockquotes, horizontal rules, paragraphs, and callouts.
 */
export function parseMarkdownBlocks(content: string): React.ReactNode[] {
  if (!content) return [];

  const lines = content.split("\n");
  const blocks: React.ReactNode[] = [];

  let currentListItems: string[] = [];
  let isCurrentListOrdered = false;
  let currentBlockquoteLines: string[] = [];
  let currentParagraphLines: string[] = [];
  let currentHeadingLevel = 0; // Tracks nesting: 0=top, 2=##, 3=###, 4=####
  let isInCodeBlock = false;
  let codeBlockLines: string[] = [];
  let codeBlockLanguage = "typescript";

  const getIndentClass = () => {
    if (currentHeadingLevel === 2) return "ml-4";
    if (currentHeadingLevel === 3) return "ml-8";
    if (currentHeadingLevel >= 4) return "ml-12";
    return "";
  };

  const flushList = (key: string) => {
    if (currentListItems.length === 0) return null;
    const items = [...currentListItems];
    const isOrdered = isCurrentListOrdered;
    currentListItems = [];
    const indentClass = getIndentClass();

    if (isOrdered) {
      return (
        <ol key={key} className={`space-y-2.5 mt-1.5 mb-3 pl-5 font-sans text-md text-text-muted leading-relaxed list-decimal ${indentClass}`}>
          {items.map((item, idx) => (
            <li key={idx} className="pl-1">
              <span className="text-text-muted">{renderFormattedText(item)}</span>
            </li>
          ))}
        </ol>
      );
    } else {
      return (
        <ul key={key} className={`space-y-2.5 mt-1.5 mb-3 pl-1 font-sans text-md text-text-muted leading-relaxed ${indentClass}`}>
          {items.map((item, idx) => (
            <li key={idx} className="flex items-start gap-2.5">
              <span className="mt-1 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <ChevronRight className="h-3 w-3" />
              </span>
              <span className="flex-1">{renderFormattedText(item)}</span>
            </li>
          ))}
        </ul>
      );
    }
  };

  const flushBlockquote = (key: string) => {
    if (currentBlockquoteLines.length === 0) return null;
    const blockquoteLines = [...currentBlockquoteLines];
    currentBlockquoteLines = [];
    const indentClass = getIndentClass();

    const fullText = blockquoteLines.join("\n").trim();
    let calloutType = "QUOTE";
    let cleanText = fullText;

    // Support Obsidian callouts: > [!NOTE] text or > [!NOTE]\n> text
    const calloutMatch = fullText.match(/^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION|INFO|SUCCESS|ERROR|FAQ|HELP|IDEA|ZAP|SPARK|ATTENTION|FLAME|BUG|DANGER)\](.*)$/i);
    
    if (calloutMatch) {
      calloutType = calloutMatch[1].toUpperCase();
      cleanText = calloutMatch[2].trim();
    }

    let calloutClasses = "border-l-4 p-4 rounded-r-md my-4 font-sans text-sm ";
    let icon = <Info className="h-4 w-4 shrink-0" />;
    let titleText = "Note";

    switch (calloutType) {
      case "NOTE":
      case "INFO":
      case "FAQ":
      case "HELP":
        calloutClasses += "border-primary bg-primary/5 text-primary-light";
        icon = <Info className="h-4 w-4 shrink-0 text-primary-light" />;
        titleText = calloutType;
        break;
      case "TIP":
      case "SUCCESS":
      case "IDEA":
      case "ZAP":
      case "SPARK":
        calloutClasses += "border-secondary bg-secondary/5 text-secondary-light";
        icon = <Lightbulb className="h-4 w-4 shrink-0 text-secondary-light" />;
        titleText = calloutType;
        break;
      case "WARNING":
      case "IMPORTANT":
      case "ATTENTION":
      case "FLAME":
        calloutClasses += "border-amber-500 bg-amber-500/5 text-amber-300";
        icon = <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400" />;
        titleText = calloutType;
        break;
      case "CAUTION":
      case "ERROR":
      case "BUG":
      case "DANGER":
        calloutClasses += "border-red-500 bg-red-500/5 text-red-300";
        icon = <AlertOctagon className="h-4 w-4 shrink-0 text-red-400" />;
        titleText = calloutType;
        break;
      default:
        calloutClasses += "border-border-subtle bg-surface-1/50 text-text-muted italic";
        icon = <Info className="h-4 w-4 shrink-0 text-text-muted" />;
        titleText = "Quote";
        break;
    }

    return (
      <div key={key} className={`${calloutClasses} ${indentClass}`}>
        <div className="flex items-center gap-2 font-semibold uppercase tracking-wider text-[11px] mb-1.5 text-foreground/95 select-none">
          {icon}
          <span>{titleText}</span>
        </div>
        <div className="leading-relaxed whitespace-pre-line text-text-muted">
          {renderFormattedText(cleanText)}
        </div>
      </div>
    );
  };

  const flushParagraph = (key: string) => {
    if (currentParagraphLines.length === 0) return null;
    const text = currentParagraphLines.join(" ").trim();
    currentParagraphLines = [];
    if (!text) return null;
    const indentClass = getIndentClass();

    return (
      <p key={key} className={`leading-relaxed font-sans text-md text-text-muted mt-1.5 mb-3 ${indentClass}`}>
        {renderFormattedText(text)}
      </p>
    );
  };

  const flushAll = (key: string) => {
    const list = flushList(`${key}-list`);
    const quote = flushBlockquote(`${key}-quote`);
    const para = flushParagraph(`${key}-para`);
    return [list, quote, para].filter(Boolean);
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // 0. Fenced Code Block Handler
    if (trimmed.startsWith("```")) {
      if (isInCodeBlock) {
        const codeText = codeBlockLines.join("\n");
        const lang = codeBlockLanguage;
        const indentClass = getIndentClass();
        
        blocks.push(
          <div key={`fenced-code-${i}`} className={`my-4 overflow-hidden rounded-md border border-border-subtle bg-surface-1 font-mono text-sm glow-indigo ${indentClass}`}>
            <div className="flex items-center justify-between border-b border-border-subtle bg-surface-2 px-4 py-2 text-xs text-text-muted">
              <span>{lang || "code"}</span>
              <CopyButton text={codeText} />
            </div>
            <div className="overflow-x-auto p-4 max-h-[400px]">
              <pre className="text-left leading-relaxed text-text-muted selection:bg-primary/20">
                <code>{codeText}</code>
              </pre>
            </div>
          </div>
        );
        
        codeBlockLines = [];
        isInCodeBlock = false;
      } else {
        blocks.push(...flushAll(`line-${i}`));
        isInCodeBlock = true;
        codeBlockLanguage = trimmed.slice(3).trim() || "typescript";
        codeBlockLines = [];
      }
      continue;
    }

    if (isInCodeBlock) {
      codeBlockLines.push(line);
      continue;
    }

    // 1. Horizontal rule
    if (trimmed === "---") {
      blocks.push(...flushAll(`line-${i}`));
      blocks.push(<hr key={`hr-${i}`} className="border-t border-border-subtle my-6" />);
      continue;
    }

    // 2. Subheadings (##, ###, ####)
    if (trimmed.startsWith("## ")) {
      blocks.push(...flushAll(`line-${i}`));
      currentHeadingLevel = 2;
      blocks.push(
        <h2 key={`h2-${i}`} className="text-lg font-bold text-foreground tracking-tight pt-4 pb-1 border-b border-border-subtle mb-1.5">
          {renderFormattedText(trimmed.slice(3))}
        </h2>
      );
      continue;
    }
    if (trimmed.startsWith("### ")) {
      blocks.push(...flushAll(`line-${i}`));
      currentHeadingLevel = 3;
      blocks.push(
        <h3 key={`h3-${i}`} className="text-base font-bold text-foreground tracking-tight pt-3 pb-0.5 mb-1 ml-4">
          {renderFormattedText(trimmed.slice(4))}
        </h3>
      );
      continue;
    }
    if (trimmed.startsWith("#### ")) {
      blocks.push(...flushAll(`line-${i}`));
      currentHeadingLevel = 4;
      blocks.push(
        <h4 key={`h4-${i}`} className="text-sm font-semibold text-foreground tracking-tight pt-2.5 pb-0.5 mb-0.5 ml-8">
          {renderFormattedText(trimmed.slice(5))}
        </h4>
      );
      continue;
    }

    // 3. Blockquotes / Callouts (starts with >)
    if (trimmed.startsWith(">")) {
      // Flush lists and paragraphs first
      const otherBlocks = [flushList(`line-${i}-list`), flushParagraph(`line-${i}-para`)].filter(Boolean);
      blocks.push(...(otherBlocks as React.ReactNode[]));

      const contentAfterChevron = line.replace(/^\s*>\s?/, "");
      currentBlockquoteLines.push(contentAfterChevron);
      continue;
    }

    // 4. Bullet lists (starts with - or *)
    const bulletMatch = line.match(/^\s*[-*]\s+(.*)$/);
    if (bulletMatch) {
      // Flush blockquotes and paragraphs first
      const otherBlocks = [flushBlockquote(`line-${i}-quote`), flushParagraph(`line-${i}-para`)].filter(Boolean);
      blocks.push(...(otherBlocks as React.ReactNode[]));

      currentListItems.push(bulletMatch[1]);
      isCurrentListOrdered = false;
      continue;
    }

    // 5. Numbered lists (starts with \d+\. )
    const numberedMatch = line.match(/^\s*\d+\.\s+(.*)$/);
    if (numberedMatch) {
      // Flush blockquotes and paragraphs first
      const otherBlocks = [flushBlockquote(`line-${i}-quote`), flushParagraph(`line-${i}-para`)].filter(Boolean);
      blocks.push(...(otherBlocks as React.ReactNode[]));

      currentListItems.push(numberedMatch[1]);
      isCurrentListOrdered = true;
      continue;
    }

    // 6. Blank lines
    if (trimmed === "") {
      blocks.push(...flushAll(`line-${i}`));
      continue;
    }

    // 7. Regular paragraph lines
    // If we have an active list or blockquote, flush them first
    if (currentListItems.length > 0) {
      blocks.push(flushList(`line-${i}-list`) as React.ReactNode);
    }
    if (currentBlockquoteLines.length > 0) {
      blocks.push(flushBlockquote(`line-${i}-quote`) as React.ReactNode);
    }

    currentParagraphLines.push(line);
  }

  // Flush remaining elements
  if (isInCodeBlock) {
    const codeText = codeBlockLines.join("\n");
    const lang = codeBlockLanguage;
    const indentClass = getIndentClass();
    blocks.push(
      <div key="fenced-code-final" className={`my-4 overflow-hidden rounded-md border border-border-subtle bg-surface-1 font-mono text-sm glow-indigo ${indentClass}`}>
        <div className="flex items-center justify-between border-b border-border-subtle bg-surface-2 px-4 py-2 text-xs text-text-muted">
          <span>{lang || "code"}</span>
          <CopyButton text={codeText} />
        </div>
        <div className="overflow-x-auto p-4 max-h-[400px]">
          <pre className="text-left leading-relaxed text-text-muted selection:bg-primary/20">
            <code>{codeText}</code>
          </pre>
        </div>
      </div>
    );
  } else {
    blocks.push(...flushAll("final"));
  }

  return blocks.filter(Boolean);
}
