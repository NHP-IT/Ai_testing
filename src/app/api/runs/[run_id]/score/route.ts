import { NextResponse } from "next/server";
import { tryReadManifest, writeManifest } from "@/lib/config/runs";
import { readChunks } from "@/lib/config/corpus";
import { readJson, writeJson, createDirectory } from "@/lib/fabric/onelake";
import { FabricRequestError } from "@/lib/fabric/errors";
import { rawResponsesSchema, judgeScoresSchema, missingScoreTestIds } from "@/lib/schemas/run";
import type { JudgeScoreRecord, JudgeScores } from "@/lib/schemas/run";
import { bm25Search } from "@/lib/retrieval/bm25";
import { buildUserMessage } from "@/lib/judge/prompt";
import { callJudge, JudgeCallError } from "@/lib/judge/client";
import { runDeterministicChecks } from "@/lib/judge/deterministic";
import { Semaphore } from "@/lib/judge/semaphore";

// Allow up to 5 minutes for the scoring run
export const maxDuration = 300;

type Params = { params: Promise<{ run_id: string }> };

export async function POST(_request: Request, { params }: Params) {
  const { run_id } = await params;

  try {
    const manifest = await tryReadManifest(run_id);
    if (!manifest) {
      return NextResponse.json({ error: `Run '${run_id}' not found.` }, { status: 404 });
    }

    // Load raw responses
    let rawResponses: Awaited<ReturnType<typeof rawResponsesSchema.parse>>;
    try {
      const result = await readJson(manifest.raw_responses_path, rawResponsesSchema);
      rawResponses = result.value;
    } catch (err) {
      if (err instanceof FabricRequestError && err.status === 404) {
        return NextResponse.json(
          { error: "raw_responses.json not found. Wait for the capture notebook to complete." },
          { status: 409 }
        );
      }
      throw err;
    }

    // Load existing scores for resume
    let existingScores: JudgeScores = {};
    try {
      const result = await readJson(manifest.judge_scores_path, judgeScoresSchema);
      existingScores = result.value;
    } catch (err) {
      if (!(err instanceof FabricRequestError && err.status === 404)) throw err;
    }

    const toScore = missingScoreTestIds(rawResponses, existingScores);

    if (toScore.length === 0) {
      return NextResponse.json({ scored: 0, skipped: Object.keys(existingScores).length, message: "All cases already scored." });
    }

    // Load corpus chunks per agent (cache by agent_id)
    const agentChunks = new Map<string, Awaited<ReturnType<typeof readChunks>>>();
    for (const agentId of new Set(manifest.cases.map((c) => c.agent_id))) {
      agentChunks.set(agentId, await readChunks(agentId));
    }

    const caseMap = new Map(manifest.cases.map((c) => [c.test_id, c]));
    const { judge_snapshot: judge, scoring_snapshot: scoring } = manifest;

    const semaphore = new Semaphore(judge.concurrency_limit);
    const newScores: JudgeScores = { ...existingScores };
    let successCount = 0;
    let errorCount = 0;

    await Promise.all(
      toScore.map(async (testId) => {
        await semaphore.acquire();
        try {
          const caseItem = caseMap.get(testId);
          const rawResponse = rawResponses[testId];

          if (!caseItem || !rawResponse || rawResponse.status !== "SUCCESS") {
            semaphore.release();
            return;
          }

          const agentResponse = rawResponse.agent_response ?? "";
          const chunks = agentChunks.get(caseItem.agent_id) ?? [];
          const topChunks = bm25Search(caseItem.question, chunks, {
            topN: 5,
            sourceFilter: caseItem.source_filter
          }).map((r) => r.chunk);

          const deterministic = runDeterministicChecks(
            agentResponse,
            caseItem.must_contain,
            caseItem.must_not_contain
          );

          const userMessage = buildUserMessage({
            question: caseItem.question,
            agentResponse,
            chunks: topChunks,
            relevancyThreshold: scoring.answer_relevancy_threshold,
            groundingThreshold: scoring.grounding_threshold,
            promptTemplate: scoring.prompt_template
          });

          const judgeResult = await callJudge(judge, userMessage, testId);

          const record: JudgeScoreRecord = {
            agent_id: caseItem.agent_id,
            status: "scored",
            judge_scored_at: new Date().toISOString(),
            reference_answer: judgeResult.reference_answer,
            reference_context: topChunks.map((c) => c.text).join("\n\n"),
            reference_sources: topChunks.map((c) => c.chunk_id),
            answer_relevancy_score: judgeResult.answer_relevancy_score,
            grounding_score: judgeResult.grounding_score,
            must_contain_passed: deterministic.must_contain_passed,
            must_not_contain_passed: deterministic.must_not_contain_passed,
            deterministic_passed: deterministic.deterministic_passed,
            judge_passed: judgeResult.passed,
            judge_reason: judgeResult.reason
          };

          newScores[testId] = record;
          successCount++;
        } catch (err) {
          const message =
            err instanceof JudgeCallError
              ? err.message
              : err instanceof Error
                ? err.message
                : String(err);

          newScores[testId] = {
            agent_id: caseMap.get(testId)?.agent_id ?? "unknown",
            status: "failed",
            reference_sources: [],
            error_message: message
          };
          errorCount++;
        } finally {
          semaphore.release();
        }
      })
    );

    // Write scores and update manifest status
    await createDirectory(`runs/${run_id}`);
    await writeJson(manifest.judge_scores_path, newScores);

    const allScored = Object.keys(rawResponses).length === Object.keys(newScores).length;
    const newStatus = allScored && errorCount === 0 ? "SCORES_READY" : manifest.run_status;

    if (newStatus !== manifest.run_status) {
      await writeManifest(run_id, { ...manifest, run_status: newStatus });
    }

    return NextResponse.json({
      scored: successCount,
      failed: errorCount,
      skipped: Object.keys(existingScores).length,
      total: Object.keys(rawResponses).length,
      run_status: newStatus
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
