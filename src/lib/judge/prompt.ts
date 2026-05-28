import type { Chunk } from "@/lib/schemas/corpus";

const SYSTEM_PROMPT = `You are an impartial evaluation judge for an AI assistant.

Your task:
1. Generate a **reference answer** using ONLY the provided source context.
2. Score the **agent response** against the question and reference context.
3. Return ONLY a valid JSON object — no prose before or after it.

Scoring definitions:
- answer_relevancy_score (0.0–1.0): Does the agent response address the question?
- grounding_score (0.0–1.0): Is the agent response supported by the source context?
- passed: true if both scores meet the configured thresholds.
- unsupported_claims: List verbatim claims in the agent response not found in the source context.

Output format:
{
  "reference_answer": "answer generated solely from source context",
  "answer_relevancy_score": 0.0,
  "grounding_score": 0.0,
  "passed": false,
  "reason": "brief explanation",
  "unsupported_claims": []
}`;

export function buildUserMessage(opts: {
  question: string;
  agentResponse: string;
  chunks: Chunk[];
  relevancyThreshold: number;
  groundingThreshold: number;
  promptTemplate: string;
}): string {
  const { question, agentResponse, chunks, relevancyThreshold, groundingThreshold, promptTemplate } = opts;

  const contextBlock =
    chunks.length > 0
      ? chunks
          .map((c, i) => `[Source ${i + 1}] ${c.title ? `(${c.title}) ` : ""}${c.text}`)
          .join("\n\n")
      : "(No source context available — score grounding as 0.0)";

  // Replace template placeholders
  return promptTemplate
    .replace("{{question}}", question)
    .replace("{{agent_response}}", agentResponse)
    .replace("{{reference_context}}", contextBlock)
    .replace("{{relevancy_threshold}}", String(relevancyThreshold))
    .replace("{{grounding_threshold}}", String(groundingThreshold));
}

export { SYSTEM_PROMPT };

export const DEFAULT_PROMPT_TEMPLATE = `Question: {{question}}

Source context:
{{reference_context}}

Agent response to evaluate:
{{agent_response}}

Thresholds: answer_relevancy ≥ {{relevancy_threshold}}, grounding ≥ {{grounding_threshold}}

Evaluate the agent response and return the JSON object as instructed.`;
