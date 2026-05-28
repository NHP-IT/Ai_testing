import { z } from "zod";
import {
  agentIdSchema,
  isoDateTimeSchema,
  nonEmptyStringSchema,
  runIdSchema,
  scoreSchema,
  testIdSchema
} from "@/lib/schemas/common";

export const agentCallStatusSchema = z.enum(["PENDING", "SUCCESS", "FAILED"]);
export const retrievalStatusSchema = z.enum([
  "NOT_STARTED",
  "SUCCESS",
  "WEAK_CONTEXT",
  "FAILED"
]);
export const verdictSchema = z.enum(["PASS", "FAIL", "WARN", "NEEDS_REVIEW"]);

export const deterministicResultSchema = z.object({
  must_contain: z.string().optional(),
  must_not_contain: z.string().optional(),
  must_contain_passed: z.boolean(),
  must_not_contain_passed: z.boolean(),
  deterministic_passed: z.boolean(),
  deterministic_reason: z.string()
});

export const resultRowSchema = z.object({
  run_id: runIdSchema,
  agent_id: agentIdSchema,
  test_id: testIdSchema,
  csv_case_index: z.number().int().min(0),
  suite: nonEmptyStringSchema,
  frequency: nonEmptyStringSchema,
  severity: nonEmptyStringSchema,
  category: z.string().optional(),
  question: nonEmptyStringSchema,
  source_filter: z.string().optional(),
  test_origin: z.string().optional(),
  agent_display_name: nonEmptyStringSchema,
  connection_mode: z.literal("direct_line_secret"),
  business_area: nonEmptyStringSchema,
  owner: nonEmptyStringSchema,
  schema_name: nonEmptyStringSchema,
  run_status: nonEmptyStringSchema,
  fabric_capture_job_id: z.string().optional(),
  fabric_merge_job_id: z.string().optional(),
  created_at: isoDateTimeSchema,
  started_at: isoDateTimeSchema.optional(),
  completed_at: isoDateTimeSchema.optional(),
  error_message: z.string().optional(),
  agent_response: z.string().optional(),
  conversation_id: z.string().optional(),
  latency_ms: z.number().int().min(0).optional(),
  agent_call_status: agentCallStatusSchema,
  agent_error_type: z.string().optional(),
  reference_answer: z.string().optional(),
  reference_context: z.string().optional(),
  reference_sources: z.array(z.string()).default([]),
  reference_context_hash: z.string().optional(),
  retrieval_status: retrievalStatusSchema.default("NOT_STARTED"),
  judge_provider: z.string().optional(),
  judge_model: z.string().optional(),
  judge_base_url: z.string().optional(),
  judge_temperature: z.number().optional(),
  judge_prompt_version: z.string().optional(),
  answer_relevancy_score: scoreSchema.optional(),
  grounding_score: scoreSchema.optional(),
  similarity_score: scoreSchema.nullable().optional(),
  judge_passed: z.boolean().optional(),
  judge_reason: z.string().optional(),
  judge_scored_at: isoDateTimeSchema.optional(),
  must_contain: z.string().optional(),
  must_not_contain: z.string().optional(),
  must_contain_passed: z.boolean().optional(),
  must_not_contain_passed: z.boolean().optional(),
  deterministic_passed: z.boolean().optional(),
  deterministic_reason: z.string().optional(),
  verdict: verdictSchema,
  verdict_reason: nonEmptyStringSchema,
  needs_review: z.boolean()
});

export type AgentCallStatus = z.infer<typeof agentCallStatusSchema>;
export type RetrievalStatus = z.infer<typeof retrievalStatusSchema>;
export type Verdict = z.infer<typeof verdictSchema>;
export type DeterministicResult = z.infer<typeof deterministicResultSchema>;
export type ResultRow = z.infer<typeof resultRowSchema>;

function splitRules(value?: string): string[] {
  return (value ?? "")
    .split("|")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function evaluateDeterministicChecks(input: {
  response?: string;
  must_contain?: string;
  must_not_contain?: string;
}): DeterministicResult {
  const response = (input.response ?? "").toLowerCase();
  const requiredAlternatives = splitRules(input.must_contain);
  const forbiddenTerms = splitRules(input.must_not_contain);

  const foundRequired = requiredAlternatives.filter((term) =>
    response.includes(term.toLowerCase())
  );
  const foundForbidden = forbiddenTerms.filter((term) =>
    response.includes(term.toLowerCase())
  );

  const mustContainPassed =
    requiredAlternatives.length === 0 || foundRequired.length > 0;
  const mustNotContainPassed = foundForbidden.length === 0;
  const deterministicPassed = mustContainPassed && mustNotContainPassed;

  const reasons = [
    requiredAlternatives.length
      ? `must_contain found=${foundRequired.join(", ") || "none"}`
      : "must_contain not configured",
    forbiddenTerms.length
      ? `must_not_contain found=${foundForbidden.join(", ") || "none"}`
      : "must_not_contain not configured"
  ];

  return {
    must_contain: input.must_contain,
    must_not_contain: input.must_not_contain,
    must_contain_passed: mustContainPassed,
    must_not_contain_passed: mustNotContainPassed,
    deterministic_passed: deterministicPassed,
    deterministic_reason: reasons.join("; ")
  };
}

export function calculateVerdict(input: {
  agent_call_status: AgentCallStatus;
  deterministic_passed?: boolean;
  retrieval_status?: RetrievalStatus;
  judge_passed?: boolean;
  scoring_exhausted?: boolean;
}): { verdict: Verdict; verdict_reason: string; needs_review: boolean } {
  if (input.agent_call_status === "FAILED") {
    return {
      verdict: "FAIL",
      verdict_reason: "Agent call failed",
      needs_review: false
    };
  }

  if (input.deterministic_passed === false) {
    return {
      verdict: "FAIL",
      verdict_reason: "Deterministic check failed",
      needs_review: false
    };
  }

  if (input.scoring_exhausted) {
    return {
      verdict: "NEEDS_REVIEW",
      verdict_reason: "Scoring could not complete after retry",
      needs_review: true
    };
  }

  if (
    input.retrieval_status === "FAILED" ||
    input.retrieval_status === "WEAK_CONTEXT"
  ) {
    return {
      verdict: "WARN",
      verdict_reason: "Retrieved context is weak or unavailable",
      needs_review: true
    };
  }

  if (input.judge_passed === false) {
    return {
      verdict: "FAIL",
      verdict_reason: "Judge score failed required thresholds",
      needs_review: false
    };
  }

  if (input.judge_passed === true) {
    return {
      verdict: "PASS",
      verdict_reason: "Deterministic and judge checks passed",
      needs_review: false
    };
  }

  return {
    verdict: "WARN",
    verdict_reason: "Judge score is not available yet",
    needs_review: true
  };
}
