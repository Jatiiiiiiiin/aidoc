"use client";

import React, { useEffect, useState } from "react";

interface MermaidRendererProps {
  chart: string;
}

export const MermaidRenderer: React.FC<MermaidRendererProps> = ({ chart }) => {
  const [svg, setSvg] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    setSvg("");
    setError(null);

    // Render helper function using global window.mermaid object
    const renderChart = async (mermaid: any) => {
      try {
        mermaid.initialize({
          startOnLoad: false,
          theme: "dark",
          securityLevel: "loose",
          themeVariables: {
            background: "#131315",
            primaryColor: "#6366f1",
            primaryTextColor: "#e5e1e4",
            lineColor: "#27272a",
            textColor: "#e5e1e4",
            nodeBorder: "#27272a",
            mainBkg: "#18181b",
          }
        });

        // Clean up common LLM syntax errors in Mermaid charts (e.g. -->|label|> B)
        const sanitizeMermaidChart = (rawChart: string): string => {
          if (!rawChart) return "";
          return rawChart
            .split("\n")
            .map((line) => {
              // Replace arrow with trailing arrowhead after label: -->|label|> with -->|label|
              return line.replace(/(\-{2,}>?)\s*\|([^|]+)\|\s*>/g, "$1|$2|");
            })
            .join("\n");
        };

        // Ensure chart is trimmed and sanitized
        const sanitizedChart = sanitizeMermaidChart(chart.trim());
        const id = `mermaid-render-${Math.floor(Math.random() * 1000000)}`;
        
        // Render using mermaid
        const result = await mermaid.render(id, sanitizedChart);
        
        if (isMounted) {
          // In Mermaid v10, result is an object containing { svg, bindFunctions }
          const svgContent = typeof result === "object" ? result.svg : result;
          setSvg(svgContent);
        }
      } catch (err: any) {
        console.error("Mermaid parsing error:", err);
        if (isMounted) {
          setError(err.message || "Failed to parse Mermaid diagram schema");
        }
      }
    };

    // If mermaid is already loaded globally, render immediately
    if ((window as any).mermaid) {
      renderChart((window as any).mermaid);
      return;
    }

    // Otherwise, create script tag
    let script = document.getElementById("mermaid-script") as HTMLScriptElement;
    let created = false;

    if (!script) {
      script = document.createElement("script");
      script.id = "mermaid-script";
      script.src = "https://cdn.jsdelivr.net/npm/mermaid@10.9.1/dist/mermaid.min.js";
      script.async = true;
      created = true;
      document.body.appendChild(script);
    }

    const handleLoad = () => {
      if ((window as any).mermaid) {
        renderChart((window as any).mermaid);
      }
    };

    script.addEventListener("load", handleLoad);

    // If the script was already present and loaded but handleLoad didn't fire in time
    if (!created && (window as any).mermaid) {
      renderChart((window as any).mermaid);
    }

    return () => {
      isMounted = false;
      if (script) {
        script.removeEventListener("load", handleLoad);
      }
    };
  }, [chart]);

  if (error) {
    return (
      <div className="rounded border border-red-500/20 bg-red-500/5 p-4 text-xs font-mono text-red-400">
        <p className="font-semibold mb-2">Mermaid Render Error:</p>
        <pre className="overflow-x-auto whitespace-pre-wrap">{error}</pre>
      </div>
    );
  }

  if (!svg) {
    return (
      <div className="flex items-center justify-center p-12 bg-surface-1 rounded-md border border-border-subtle">
        <div className="flex items-center gap-2 text-xs font-mono text-text-muted">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <span>Generating system architecture flow...</span>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="flex justify-center p-6 bg-surface-1 rounded-md border border-border-subtle overflow-x-auto max-w-full [&>svg]:max-w-full [&>svg]:h-auto [&_rect]:rx-[4px] [&_rect]:ry-[4px] [&_span.nodeLabel]:text-foreground [&_span.nodeLabel]:font-sans [&_span.nodeLabel]:text-xs"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
};
