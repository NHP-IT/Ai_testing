import "server-only";
import { parseJudgeResponse, type JudgeResponse } from "@/lib/schemas/judge";
import type { JudgeProfile } from "@/lib/schemas/judge";
import { SYSTEM_PROMPT } from "@/lib/judge/prompt";

type OpenAIChatMessage = { role: "system" | "user" | "assistant"; content: string };

type OpenAIChatResponse = {
  choices: Array<{ message: { content: string } }>;
};

export class JudgeCallError extends Error {
  constructor(
    message: string,
    readonly testId: string
  ) {
    super(message);
    this.name = "JudgeCallError";
  }
}

export async function callJudge(
  profile: JudgeProfile,
  userMessage: string,
  testId: string
): Promise<JudgeResponse> {
  const messages: OpenAIChatMessage[] = [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: userMessage }
  ];

  const url = `${profile.base_url.replace(/\/+$/, "")}/chat/completions`;

  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(profile.api_key_reference
          ? { Authorization: `Bearer ${profile.api_key_reference}` }
          : {})
      },
      body: JSON.stringify({
        model: profile.model,
        temperature: profile.temperature,
        ...(profile.max_tokens ? { max_tokens: profile.max_tokens } : {}),
        messages
      }),
      signal: AbortSignal.timeout(profile.timeout_ms)
    });
  } catch (err) {
    const isTimeout = err instanceof Error && err.name === "TimeoutError";
    throw new JudgeCallError(
      isTimeout ? `Judge timed out after ${profile.timeout_ms}ms` : String(err),
      testId
    );
  }

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new JudgeCallError(
      `Judge server returned ${response.status}: ${body.slice(0, 200)}`,
      testId
    );
  }

  const data = (await response.json()) as OpenAIChatResponse;
  const raw = data.choices?.[0]?.message?.content;

  if (!raw) {
    throw new JudgeCallError("Judge returned empty content", testId);
  }

  // Extract JSON from the response (handles markdown code fences)
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new JudgeCallError(`Judge response contained no JSON object: ${raw.slice(0, 200)}`, testId);
  }

  try {
    return parseJudgeResponse(JSON.parse(jsonMatch[0]));
  } catch {
    throw new JudgeCallError(
      `Judge returned invalid JSON structure: ${jsonMatch[0].slice(0, 200)}`,
      testId
    );
  }
}
