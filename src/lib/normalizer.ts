import { DocSchema, Doc } from "./schema";

export function normalizeDoc(dbDoc: any): Doc | null {
  if (!dbDoc) return null;

  try {
    let parsedContent = typeof dbDoc.content === "string"
      ? JSON.parse(dbDoc.content)
      : dbDoc.content;

    if (!parsedContent) {
      parsedContent = {};
    }

    // 1. If sections are nested under metadata.sections, copy them over
    if ((!parsedContent.sections || parsedContent.sections.length === 0) && parsedContent.metadata?.sections) {
      parsedContent.sections = parsedContent.metadata.sections;
    }

    // 2. Otherwise run auto-normalizer if sections is empty or undefined, but metadata/architecture are present
    if ((!parsedContent.sections || parsedContent.sections.length === 0) && (parsedContent.metadata || parsedContent.architecture)) {
      const sections: any[] = [];

      // A. System Overview
      const overviewText = parsedContent.metadata?.architecture?.overview || dbDoc.description || parsedContent.description || "";
      const systemType = parsedContent.architecture?.systemType || parsedContent.metadata?.architecture?.systemType || "";
      const scalability = parsedContent.metadata?.architecture?.scalability || "";

      if (overviewText || systemType) {
        sections.push({
          id: "system-overview",
          type: "text",
          title: "System Architecture Overview",
          content: `**System Type**: ${systemType || "AI Platform"}\n\n${overviewText}${scalability ? `\n\n**Scalability**: ${scalability}` : ""}`
        });
      }

      // B. Patterns
      const patterns = parsedContent.metadata?.architecture?.patterns;
      if (patterns && Array.isArray(patterns) && patterns.length > 0) {
        sections.push({
          id: "architecture-patterns",
          type: "bullets",
          title: "Architecture Design Patterns",
          content: patterns
        });
      }

      // C. Diagram
      const diagram = parsedContent.architecture?.mermaidDiagram || parsedContent.metadata?.architecture?.mermaidDiagram;
      if (diagram) {
        sections.push({
          id: "system-flow",
          type: "code",
          title: "System Flow Diagram",
          content: {
            code: diagram.trim(),
            language: "mermaid",
            filename: "flow_diagram.mermaid"
          }
        });
      }

      // D. Investor Highlights
      const highlights = parsedContent.metadata?.investorHighlights;
      if (highlights && Array.isArray(highlights) && highlights.length > 0) {
        sections.push({
          id: "investor-highlights",
          type: "table",
          title: "Investor & Business Highlights",
          content: {
            headers: ["Highlight", "Value Proposition"],
            rows: highlights.map((h: any) => [h.title, h.content])
          }
        });
      }

      // E. Technical Advantages
      const advantages = parsedContent.metadata?.technicalAdvantages;
      if (advantages && Array.isArray(advantages) && advantages.length > 0) {
        sections.push({
          id: "technical-advantages",
          type: "bullets",
          title: "Technical Advantages",
          content: advantages
        });
      }

      // F. Future Scope
      const futureScope = parsedContent.metadata?.futureScope;
      if (futureScope && Array.isArray(futureScope) && futureScope.length > 0) {
        sections.push({
          id: "future-scope",
          type: "bullets",
          title: "Future Scope & Roadmap",
          content: futureScope
        });
      }

      parsedContent.sections = sections;
    }

    // 3. Sanitize section types to match allowed Zod schema options
    if (parsedContent.sections && Array.isArray(parsedContent.sections)) {
      const allowedTypes = ["text", "code", "pipeline", "table", "bullets"];
      parsedContent.sections = parsedContent.sections.map((sec: any, index: number) => {
        if (!sec || typeof sec !== "object") return sec;
        
        let type = sec.type;
        let content = sec.content;
        const title = sec.title || "Section";
        
        let id = sec.id;
        if (!id) {
          const baseId = title
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/(^-|-$)/g, "");
          id = baseId ? `${baseId}-${index}` : `section-${index}`;
        }
        
        if (!allowedTypes.includes(type)) {
          if (typeof content === "string") {
            type = "text";
          } else if (Array.isArray(content)) {
            type = "bullets";
          } else if (content && typeof content === "object") {
            if (content.code) {
              type = "code";
            } else if (content.nodes) {
              type = "pipeline";
            } else if (content.headers && content.rows) {
              type = "table";
            } else {
              type = "text";
              content = JSON.stringify(content, null, 2);
            }
          } else {
            type = "text";
            content = String(content || "");
          }
        }
        
        return {
          ...sec,
          id,
          title,
          type,
          content
        };
      });
    }

    const validation = DocSchema.safeParse({
      title: dbDoc.title,
      description: dbDoc.description || parsedContent.description || "",
      ...parsedContent,
    });

    if (validation.success) {
      return validation.data;
    } else {
      console.error("Zod Schema Validation Failed for normalizer:", validation.error);
      return null;
    }
  } catch (err: any) {
    console.error("Error in normalizer:", err.message);
    return null;
  }
}
