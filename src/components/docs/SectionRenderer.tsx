import React from "react";
import { Section } from "@/lib/schema";
import { TextSection } from "./TextSection";
import { CodeSection } from "./CodeSection";
import { PipelineSection } from "./PipelineSection";
import { TableSection } from "./TableSection";
import { BulletsSection } from "./BulletsSection";

interface SectionRendererProps {
  section: Section;
}

export const SectionRenderer: React.FC<SectionRendererProps> = ({ section }) => {
  switch (section.type) {
    case "text":
      return <TextSection title={section.title} content={section.content} />;
    case "code":
      return (
        <CodeSection
          title={section.title}
          content={section.content}
          language={section.language}
          filename={section.filename}
        />
      );
    case "pipeline":
      return <PipelineSection title={section.title} content={section.content} />;
    case "table":
      return <TableSection title={section.title} content={section.content} />;
    case "bullets":
      return <BulletsSection title={section.title} content={section.content} />;
    default:
      return (
        <div className="rounded-md border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-400">
          Unknown section type: {(section as any).type}
        </div>
      );
  }
};
