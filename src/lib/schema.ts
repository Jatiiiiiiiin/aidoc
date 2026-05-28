import { z } from "zod";

export const TextContentSchema = z.string();

export const CodeContentSchema = z.object({
  code: z.string(),
  language: z.string().default("typescript"),
  filename: z.string().optional(),
});

export const PipelineNodeSchema = z.object({
  id: z.string(),
  name: z.string(),
  status: z.enum(["idle", "running", "success", "error"]).default("idle"),
  description: z.string().optional(),
});

export const PipelineEdgeSchema = z.object({
  from: z.string(),
  to: z.string(),
});

export const PipelineContentSchema = z.object({
  nodes: z.array(PipelineNodeSchema),
  edges: z.array(PipelineEdgeSchema).optional(),
});

export const TableContentSchema = z.object({
  headers: z.array(z.string()),
  rows: z.array(z.array(z.any())),
});

export const BulletsContentSchema = z.array(z.string());

export const SectionSchema = z.object({
  id: z.string(),
  type: z.enum(["text", "code", "pipeline", "table", "bullets"]),
  title: z.string(),
  content: z.any(), // Will be parsed based on the type
  language: z.string().optional(),
  filename: z.string().optional(),
});

export const DocSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
  sections: z.array(SectionSchema),
});

export type TextContent = z.infer<typeof TextContentSchema>;
export type CodeContent = z.infer<typeof CodeContentSchema>;
export type PipelineContent = z.infer<typeof PipelineContentSchema>;
export type TableContent = z.infer<typeof TableContentSchema>;
export type BulletsContent = z.infer<typeof BulletsContentSchema>;
export type Section = z.infer<typeof SectionSchema>;
export type Doc = z.infer<typeof DocSchema>;
