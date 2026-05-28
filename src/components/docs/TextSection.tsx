import React from "react";
import { TextContent } from "@/lib/schema";
import { parseMarkdownBlocks } from "@/lib/markdown";

interface TextSectionProps {
  title: string;
  content: TextContent;
}

export const TextSection: React.FC<TextSectionProps> = ({ title, content }) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between border-b border-border-subtle pb-2 mb-2">
        <h2 className="text-2xl font-bold tracking-tight text-foreground">
          {title}
        </h2>
      </div>
      <div className="space-y-3">
        {parseMarkdownBlocks(content)}
      </div>
    </div>
  );
};
