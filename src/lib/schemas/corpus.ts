import { z } from "zod";
import { agentIdSchema } from "@/lib/schemas/common";

export const chunkSchema = z.object({
  chunk_id: z.string().min(1),
  agent_id: agentIdSchema,
  document_id: z.string().min(1),
  title: z.string().default(""),
  tags: z.array(z.string()).default([]),
  text: z.string().min(1),
  source_uri: z.string().optional(),
  updated_at: z.string()
});

export type Chunk = z.infer<typeof chunkSchema>;

export const documentSummarySchema = z.object({
  document_id: z.string(),
  title: z.string(),
  tags: z.array(z.string()),
  chunk_count: z.number().int(),
  updated_at: z.string()
});

export type DocumentSummary = z.infer<typeof documentSummarySchema>;
