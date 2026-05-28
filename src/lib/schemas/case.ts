import { z } from "zod";
import type { AgentConfig } from "@/lib/schemas/agent";
import {
  agentIdSchema,
  csvStringSchema,
  issueMessage,
  optionalStringSchema,
  sourceFilterSchema,
  testIdSchema
} from "@/lib/schemas/common";

export const requiredCaseColumns = [
  "test_id",
  "agent_id",
  "suite",
  "frequency",
  "severity",
  "question"
] as const;

export const optionalCaseColumns = [
  "category",
  "source_filter",
  "must_contain",
  "must_not_contain",
  "test_origin"
] as const;

export const severitySchema = z.enum([
  "critical",
  "major",
  "minor",
  "info"
]);

export const csvCaseInputSchema = z.object({
  test_id: testIdSchema,
  agent_id: agentIdSchema,
  suite: csvStringSchema.pipe(z.string().min(1, "suite is required")),
  frequency: csvStringSchema.pipe(
    z.string().min(1, "frequency is required")
  ),
  severity: csvStringSchema.pipe(severitySchema),
  question: csvStringSchema.pipe(z.string().min(1, "question is required")),
  category: optionalStringSchema,
  source_filter: optionalStringSchema.pipe(
    sourceFilterSchema.optional()
  ),
  must_contain: optionalStringSchema,
  must_not_contain: optionalStringSchema,
  test_origin: optionalStringSchema
});

export const normalizedCaseSchema = csvCaseInputSchema.extend({
  csv_case_index: z.number().int().min(0)
});

export type CsvCaseInput = z.input<typeof csvCaseInputSchema>;
export type NormalizedCase = z.infer<typeof normalizedCaseSchema>;

export type CaseValidationIssue = {
  row: number;
  field?: string;
  message: string;
};

export type CaseValidationResult = {
  cases: NormalizedCase[];
  issues: CaseValidationIssue[];
  ok: boolean;
};

export function validateCaseRows(
  rows: unknown[],
  agents: AgentConfig[]
): CaseValidationResult {
  const knownAgents = new Set(agents.map((agent) => agent.agent_id));
  const seen = new Map<string, number>();
  const cases: NormalizedCase[] = [];
  const issues: CaseValidationIssue[] = [];

  for (const [index, row] of rows.entries()) {
    const parsed = csvCaseInputSchema.safeParse(row);
    const rowNumber = index + 1;

    if (!parsed.success) {
      issues.push({
        row: rowNumber,
        message: issueMessage(parsed.error)
      });
      continue;
    }

    const normalized: NormalizedCase = {
      ...parsed.data,
      csv_case_index: index
    };

    if (!knownAgents.has(normalized.agent_id)) {
      issues.push({
        row: rowNumber,
        field: "agent_id",
        message: `Unknown agent_id: ${normalized.agent_id}`
      });
    }

    const caseKey = `${normalized.agent_id}:${normalized.test_id}`;
    const firstSeenRow = seen.get(caseKey);
    if (firstSeenRow !== undefined) {
      issues.push({
        row: rowNumber,
        field: "test_id",
        message: `Duplicate agent_id + test_id. First seen on row ${firstSeenRow}.`
      });
    } else {
      seen.set(caseKey, rowNumber);
    }

    cases.push(normalized);
  }

  return {
    cases,
    issues,
    ok: issues.length === 0
  };
}
