import { describe, expect, it } from "vitest";
import {
  agentSchema,
  agentRegistrySchema,
  calculateVerdict,
  evaluateDeterministicChecks,
  judgeProfileSchema,
  missingScoreTestIds,
  parseJudgeResponse,
  scoringProfileSchema,
  validateCaseRows
} from "../index";

const sparkyAgent = agentSchema.parse({
  agent_id: "sparky",
  display_name: "Sparky",
  enabled: true,
  platform: "copilot_studio",
  connection_mode: "direct_line_secret",
  business_area: "Technical Support",
  owner: "BI & AI Team",
  schema_name: "cr578_Productsagent",
  environment_id: "605e3ed6-b18f-ece1-ad54-4f71a003a6cb",
  bot_id: "90834477-dcd9-4c4c-a025-dd256379a63a",
  direct_line_secret_key: "sparky-direct-line-secret",
  deterministic_rules: [
    "no_internal_pricing_terms",
    "must_not_make_guaranteed_claims"
  ],
  ragas_thresholds: {
    answer_relevancy: 0.7,
    grounding: 0.7
  }
});

describe("agent registry schema", () => {
  it("accepts the Sparky registry shape from the reference architecture", () => {
    const parsed = agentRegistrySchema.parse({ agents: [sparkyAgent] });

    expect(parsed.agents[0].agent_id).toBe("sparky");
  });

  it("rejects duplicate agent IDs", () => {
    const result = agentRegistrySchema.safeParse({
      agents: [sparkyAgent, sparkyAgent]
    });

    expect(result.success).toBe(false);
  });
});

describe("case row validation", () => {
  it("normalizes question-only CSV rows and preserves source_filter", () => {
    const result = validateCaseRows(
      [
        {
          test_id: "SPARKY_001",
          agent_id: "sparky",
          suite: "smoke",
          frequency: "daily",
          severity: "critical",
          question: "What can Sparky help with in this evaluation POC?",
          source_filter: "products"
        }
      ],
      [sparkyAgent]
    );

    expect(result.ok).toBe(true);
    expect(result.cases[0]).toMatchObject({
      test_id: "SPARKY_001",
      csv_case_index: 0,
      source_filter: "products"
    });
  });

  it("reports missing required fields, unknown agents, and duplicate keys", () => {
    const result = validateCaseRows(
      [
        {
          test_id: "SPARKY_001",
          agent_id: "sparky",
          suite: "smoke",
          frequency: "daily",
          severity: "critical",
          question: "First question"
        },
        {
          test_id: "SPARKY_001",
          agent_id: "sparky",
          suite: "smoke",
          frequency: "daily",
          severity: "critical",
          question: "Duplicate question"
        },
        {
          test_id: "OTHER_001",
          agent_id: "unknown_agent",
          suite: "smoke",
          frequency: "daily",
          severity: "major",
          question: "Unknown agent question"
        },
        {
          test_id: "SPARKY_002",
          agent_id: "sparky",
          suite: "",
          frequency: "daily",
          severity: "major",
          question: "Missing suite"
        }
      ],
      [sparkyAgent]
    );

    expect(result.ok).toBe(false);
    expect(result.issues.map((issue) => issue.message)).toEqual(
      expect.arrayContaining([
        "Duplicate agent_id + test_id. First seen on row 1.",
        "Unknown agent_id: unknown_agent"
      ])
    );
    expect(result.issues.some((issue) => issue.message.includes("suite"))).toBe(
      true
    );
  });
});

describe("judge and scoring schemas", () => {
  it("accepts the local Ollama judge profile used by the POC", () => {
    const profile = judgeProfileSchema.parse({
      profile_id: "local_ollama",
      provider: "ollama_openai_compatible",
      base_url: "http://127.0.0.1:11434/v1",
      model: "llama3.2:3b",
      temperature: 0,
      timeout_ms: 120000,
      concurrency_limit: 3,
      prompt_version: "poc-v1"
    });

    expect(profile.concurrency_limit).toBe(3);
  });

  it("parses strict judge JSON", () => {
    const response = parseJudgeResponse({
      reference_answer: "Sparky validates the evaluation pipeline.",
      answer_relevancy_score: 0.91,
      grounding_score: 0.88,
      passed: true,
      reason: "Answer is supported by the retrieved context.",
      unsupported_claims: []
    });

    expect(response.passed).toBe(true);
  });

  it("keeps similarity disabled unless embeddings are configured", () => {
    const scoring = scoringProfileSchema.parse({
      profile_id: "ragas_poc",
      answer_relevancy_threshold: 0.7,
      grounding_threshold: 0.7,
      similarity_enabled: false,
      prompt_template: "Return strict JSON."
    });

    expect(scoring.similarity_enabled).toBe(false);
    expect(scoring.similarity_threshold).toBeUndefined();
  });
});

describe("deterministic and verdict helpers", () => {
  it("passes must_contain alternatives and blocks forbidden terms", () => {
    const passed = evaluateDeterministicChecks({
      response: "Sparky validates the evaluation pipeline.",
      must_contain: "validates the evaluation pipeline|other text",
      must_not_contain: "discount tier|guaranteed"
    });

    expect(passed.deterministic_passed).toBe(true);

    const failed = evaluateDeterministicChecks({
      response: "This includes a guaranteed discount tier.",
      must_contain: "discount",
      must_not_contain: "discount tier|guaranteed"
    });

    expect(failed.must_not_contain_passed).toBe(false);
    expect(failed.deterministic_passed).toBe(false);
  });

  it("calculates final verdicts", () => {
    expect(
      calculateVerdict({
        agent_call_status: "SUCCESS",
        deterministic_passed: true,
        retrieval_status: "SUCCESS",
        judge_passed: true
      }).verdict
    ).toBe("PASS");

    expect(
      calculateVerdict({
        agent_call_status: "SUCCESS",
        deterministic_passed: false,
        retrieval_status: "SUCCESS",
        judge_passed: true
      }).verdict
    ).toBe("FAIL");

    expect(
      calculateVerdict({
        agent_call_status: "SUCCESS",
        deterministic_passed: true,
        retrieval_status: "SUCCESS",
        scoring_exhausted: true
      }).verdict
    ).toBe("NEEDS_REVIEW");
  });
});

describe("per-test-case recovery", () => {
  it("returns only successful raw responses missing scored judge records", () => {
    const missing = missingScoreTestIds(
      {
        SPARKY_001: {
          agent_id: "sparky",
          status: "SUCCESS",
          agent_response: "Response one"
        },
        SPARKY_002: {
          agent_id: "sparky",
          status: "SUCCESS",
          agent_response: "Response two"
        },
        SPARKY_003: {
          agent_id: "sparky",
          status: "FAILED",
          error_type: "DIRECT_LINE_ERROR"
        }
      },
      {
        SPARKY_001: {
          agent_id: "sparky",
          status: "scored",
          judge_scored_at: "2026-05-28T00:00:00.000Z",
          reference_sources: []
        }
      }
    );

    expect(missing).toEqual(["SPARKY_002"]);
  });
});
