import { NextResponse } from "next/server";
import { z } from "zod";
import { tryReadManifest } from "@/lib/config/runs";
import { getNotebookJobStatus } from "@/lib/fabric/jobs";
import { readJson } from "@/lib/fabric/onelake";
import { FabricRequestError } from "@/lib/fabric/errors";
import { judgeScoresSchema } from "@/lib/schemas/run";

type Params = { params: Promise<{ run_id: string }> };

const msEvalStatusSchema = z.object({
  status: z.string(),
  agents: z.record(
    z.string(),
    z.object({
      test_sets_discovered: z.number().int().optional(),
      test_sets_run: z.number().int().optional(),
      total_cases: z.number().int().optional(),
      completed_at: z.string().optional(),
      error: z.string().nullable().optional()
    })
  )
});

async function tryCountJsonRecord(path: string): Promise<number | null> {
  try {
    const result = await readJson(path);
    const obj = result.value as Record<string, unknown>;
    return typeof obj === "object" && obj !== null ? Object.keys(obj).length : null;
  } catch (err) {
    if (err instanceof FabricRequestError && err.status === 404) return null;
    return null;
  }
}

async function tryReadMsEvalStatus(runId: string) {
  try {
    const result = await readJson(
      `runs/${runId}/ms_eval_status.json`,
      msEvalStatusSchema
    );
    return result.value;
  } catch {
    return null;
  }
}

async function countJudgeScores(path: string): Promise<{ scored: number; failed: number } | null> {
  try {
    const result = await readJson(path, judgeScoresSchema);
    const entries = Object.values(result.value);
    return {
      scored: entries.filter((e) => e.status === "scored").length,
      failed: entries.filter((e) => e.status === "failed").length
    };
  } catch {
    return null;
  }
}

export async function GET(_request: Request, { params }: Params) {
  const { run_id } = await params;

  try {
    const manifest = await tryReadManifest(run_id);

    if (!manifest) {
      return NextResponse.json({ error: `Run '${run_id}' not found.` }, { status: 404 });
    }

    // Fetch all dynamic data in parallel
    const [captureJobResult, msEvalJobResult, rawResponseCount, judgeScoreCounts, msEvalStatus] =
      await Promise.allSettled([
        manifest.capture_job_location
          ? getNotebookJobStatus(manifest.capture_job_location)
          : Promise.resolve(null),
        manifest.ms_eval_job_location
          ? getNotebookJobStatus(manifest.ms_eval_job_location)
          : Promise.resolve(null),
        tryCountJsonRecord(manifest.raw_responses_path),
        countJudgeScores(manifest.judge_scores_path),
        tryReadMsEvalStatus(run_id)
      ]);

    const captureJobStatus =
      captureJobResult.status === "fulfilled"
        ? captureJobResult.value?.status ?? null
        : "unknown";
    const msEvalJobStatus =
      msEvalJobResult.status === "fulfilled"
        ? msEvalJobResult.value?.status ?? null
        : "unknown";

    const rawCount =
      rawResponseCount.status === "fulfilled" ? rawResponseCount.value : null;
    const scores =
      judgeScoreCounts.status === "fulfilled" ? judgeScoreCounts.value : null;
    const msStatus =
      msEvalStatus.status === "fulfilled" ? msEvalStatus.value : null;

    const anyTrackB = Object.values(manifest.tracks).some((t) => t.track_b);

    return NextResponse.json({
      run_id: manifest.run_id,
      run_status: manifest.run_status,
      created_at: manifest.created_at,
      cases_count: manifest.cases.length,
      agent_ids: [...new Set(manifest.cases.map((c) => c.agent_id))],
      tracks: manifest.tracks,
      track_a: {
        active: true,
        job_location: manifest.capture_job_location ?? null,
        job_status: captureJobStatus,
        raw_response_count: rawCount,
        scored_count: scores?.scored ?? null,
        failed_count: scores?.failed ?? null
      },
      track_b: anyTrackB
        ? {
            active: true,
            job_location: manifest.ms_eval_job_location ?? null,
            job_status: msEvalJobStatus,
            ms_eval_status: msStatus
          }
        : { active: false }
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
