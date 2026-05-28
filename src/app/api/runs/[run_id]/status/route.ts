import { NextResponse } from "next/server";
import { tryReadManifest } from "@/lib/config/runs";
import { getNotebookJobStatus } from "@/lib/fabric/jobs";

type Params = { params: Promise<{ run_id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { run_id } = await params;

  try {
    const manifest = await tryReadManifest(run_id);

    if (!manifest) {
      return NextResponse.json({ error: `Run '${run_id}' not found.` }, { status: 404 });
    }

    let captureJobStatus: string | undefined;
    let msEvalJobStatus: string | undefined;

    if (manifest.capture_job_location) {
      try {
        const result = await getNotebookJobStatus(manifest.capture_job_location);
        captureJobStatus = result.status;
      } catch {
        captureJobStatus = "unknown";
      }
    }

    if (manifest.ms_eval_job_location) {
      try {
        const result = await getNotebookJobStatus(manifest.ms_eval_job_location);
        msEvalJobStatus = result.status;
      } catch {
        msEvalJobStatus = "unknown";
      }
    }

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
        job_status: captureJobStatus ?? null
      },
      track_b: anyTrackB
        ? {
            active: true,
            job_location: manifest.ms_eval_job_location ?? null,
            job_status: msEvalJobStatus ?? null
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
