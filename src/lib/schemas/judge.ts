import { z } from "zod";
import {
  nonEmptyStringSchema,
  scoreSchema,
  thresholdSchema
} from "@/lib/schemas/common";

export const judgeProviderSchema = z.enum([
  "ollama_openai_compatible",
  "custom_openai_compatible",
  "azure_openai"
]);

export const judgeProfileSchema = z.object({
  profile_id: nonEmptyStringSchema,
  provider: judgeProviderSchema,
  base_url: z.string().url(),
  model: nonEmptyStringSchema,
  api_key_reference: nonEmptyStringSchema.optional(),
  temperature: z.number().min(0).max(2).default(0),
  timeout_ms: z.number().int().positive().default(120000),
  max_tokens: z.number().int().positive().optional(),
  concurrency_limit: z.number().int().min(1).max(10).default(3),
  prompt_version: nonEmptyStringSchema
});

export const scoringProfileSchema = z.object({
  profile_id: nonEmptyStringSchema,
  answer_relevancy_threshold: thresholdSchema.default(0.7),
  grounding_threshold: thresholdSchema.default(0.7),
  similarity_threshold: thresholdSchema.optional(),
  similarity_enabled: z.boolean().default(false),
  prompt_template: nonEmptyStringSchema
});

export const judgeResponseSchema = z.object({
  reference_answer: nonEmptyStringSchema,
  answer_relevancy_score: scoreSchema,
  grounding_score: scoreSchema,
  passed: z.boolean(),
  reason: nonEmptyStringSchema,
  unsupported_claims: z.array(z.string()).default([])
});

export type JudgeProfile = z.infer<typeof judgeProfileSchema>;
export type ScoringProfile = z.infer<typeof scoringProfileSchema>;
export type JudgeResponse = z.infer<typeof judgeResponseSchema>;

export function parseJudgeResponse(input: unknown): JudgeResponse {
  return judgeResponseSchema.parse(input);
}
