import React from "react";
import { BulletsContent } from "@/lib/schema";
import { ChevronRight } from "lucide-react";
import { renderFormattedText } from "@/lib/markdown";

interface BulletsSectionProps {
  title: string;
  content: BulletsContent;
}

export const BulletsSection: React.FC<BulletsSectionProps> = ({
  title,
  content,
}) => {
  const items = Array.isArray(content) ? content : [];

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold tracking-tight text-foreground border-b border-border-subtle pb-2">
        {title}
      </h2>
      <ul className="space-y-3 font-sans text-md text-text-muted leading-relaxed">
        {items.map((item, idx) => (
          <li key={idx} className="flex items-start gap-3">
            <span className="mt-1 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <ChevronRight className="h-3 w-3" />
            </span>
            <span className="flex-1">{renderFormattedText(item)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};
