import { z } from "zod";
import { agentSchema } from "@/lib/schemas/agent";
import { normalizedCaseSchema } from "@/lib/schemas/case";
import { judgeProfileSchema, scoringProfileSchema } from "@/lib/schemas/judge";
import {
  agentIdSchema,
  isoDateTimeSchema,
  nonEmptyStringSchema,
  runIdSchema,
  testIdSchema
} from "@/lib/schemas/common";

export const runStatusSchema = z.enum([
  "CREATED",
  "CAPTURE_RUNNING",
  "RESPONSES_CAPTURED",
  "SCORING_RUNNING",
  "SCORES_READY",
  "MERGE_RUNNING",
  "COMPLETED",
  "FAILED",
  "NEEDS_REVIEW"
]);

export const runTrackSchema = z.object({
  track_a: z.boolean(),
  track_b: z.boolean()
});

export const runManifestSchema = z.object({
  run_id: runIdSchema,
  run_status: runStatusSchema,
  created_at: isoDateTimeSchema,
  cases_path: nonEmptyStringSchema,
  raw_responses_path: nonEmptyStringSchema,
  judge_scores_path: nonEmptyStringSchema,
  agent_snapshot: z.array(agentSchema),
  judge_snapshot: judgeProfileSchema,
  scoring_snapshot: scoringProfileSchema,
  cases: z.array(normalizedCaseSchema),
  tracks: z.record(agentIdSchema, runTrackSchema).default({}),
  capture_job_location: z.string().optional(),
  ms_eval_job_location: z.string().optional()
});

export const rawResponseSchema = z.object({
  agent_id: agentIdSchema,
  status: z.enum(["SUCCESS", "FAILED"]),
  agent_response: z.string().optional(),
  conversation_id: z.string().optional(),
  latency_ms: z.number().int().min(0).optional(),
  error_type: z.string().optional()
});

export const rawResponsesSchema = z.record(testIdSchema, rawResponseSchema);

export const judgeScoreRecordSchema = z.object({
  agent_id: agentIdSchema,
  status: z.enum(["scored", "failed"]),
  judge_scored_at: isoDateTimeSchema.optional(),
  reference_answer: z.string().optional(),
  reference_context: z.string().optional(),
  reference_sources: z.array(z.string()).default([]),
  reference_context_hash: z.string().optional(),
  answer_relevancy_score: z.number().min(0).max(1).optional(),
  grounding_score: z.number().min(0).max(1).optional(),
  similarity_score: z.number().min(0).max(1).nullable().optional(),
  must_contain_passed: z.boolean().optional(),
  must_not_contain_passed: z.boolean().optional(),
  deterministic_passed: z.boolean().optional(),
  judge_passed: z.boolean().optional(),
  judge_reason: z.string().optional(),
  error_message: z.string().optional()
});

export const judgeScoresSchema = z.record(
  testIdSchema,
  judgeScoreRecordSchema
);

export type RunStatus = z.infer<typeof runStatusSchema>;
export type RunTrack = z.infer<typeof runTrackSchema>;
export type RunManifest = z.infer<typeof runManifestSchema>;
export type RawResponse = z.infer<typeof rawResponseSchema>;
export type RawResponses = z.infer<typeof rawResponsesSchema>;
export type JudgeScoreRecord = z.infer<typeof judgeScoreRecordSchema>;
export type JudgeScores = z.infer<typeof judgeScoresSchema>;

export function missingScoreTestIds(
  rawResponses: RawResponses,
  judgeScores: JudgeScores
): string[] {
  return Object.entries(rawResponses)
    .filter(([, response]) => response.status === "SUCCESS")
    .filter(([testId]) => judgeScores[testId]?.status !== "scored")
    .map(([testId]) => testId);
}
