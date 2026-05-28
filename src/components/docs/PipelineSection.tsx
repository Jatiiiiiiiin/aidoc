import React from "react";
import { PipelineContent } from "@/lib/schema";
import { Play, CheckCircle2, XCircle, AlertCircle, ArrowRight } from "lucide-react";
import { renderFormattedText } from "@/lib/markdown";

interface PipelineSectionProps {
  title: string;
  content: PipelineContent;
}

export const PipelineSection: React.FC<PipelineSectionProps> = ({
  title,
  content,
}) => {
  const nodes = content.nodes || [];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "success":
        return <CheckCircle2 className="h-5 w-5 text-secondary animate-pulse" />;
      case "error":
        return <XCircle className="h-5 w-5 text-red-500" />;
      case "running":
        return (
          <div className="relative flex h-5 w-5 items-center justify-center">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/40 opacity-75"></span>
            <Play className="relative h-4 w-4 text-primary fill-primary" />
          </div>
        );
      default:
        return <AlertCircle className="h-5 w-5 text-text-muted" />;
    }
  };

  const getStatusClass = (status: string) => {
    switch (status) {
      case "success":
        return "border-secondary/40 bg-secondary/5 text-foreground shadow-[0_0_15px_rgba(6,182,212,0.05)]";
      case "error":
        return "border-red-500/40 bg-red-500/5 text-foreground";
      case "running":
        return "border-primary bg-primary/5 text-foreground shadow-[0_0_15px_rgba(99,102,241,0.1)]";
      default:
        return "border-border-subtle bg-surface-1 text-text-muted";
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold tracking-tight text-foreground">
        {title}
      </h2>
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:flex-wrap">
        {nodes.map((node, index) => (
          <React.Fragment key={node.id}>
            <div
              className={`flex flex-1 min-w-[200px] flex-col gap-2 rounded-md border p-4 transition-all duration-300 ${getStatusClass(
                node.status
              )}`}
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold text-sm tracking-tight">
                  {node.name}
                </span>
                {getStatusIcon(node.status)}
              </div>
              {node.description && (
                <p className="text-xs text-text-muted leading-relaxed">
                  {renderFormattedText(node.description)}
                </p>
              )}
              <div className="mt-1 flex items-center justify-between">
                <span className="text-[10px] uppercase tracking-wider text-text-muted font-mono">
                  {node.status}
                </span>
                <span className="text-[10px] uppercase tracking-wider text-text-muted font-mono">
                  Step 0{index + 1}
                </span>
              </div>
            </div>
            {index < nodes.length - 1 && (
              <div className="hidden md:flex items-center justify-center text-text-muted">
                <ArrowRight className="h-6 w-6 text-border-subtle" />
              </div>
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};
