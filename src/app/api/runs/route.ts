import { NextResponse } from "next/server";
import { parseCsv } from "@/lib/csv";
import { validateCaseRows } from "@/lib/schemas/case";
import { readAgentRegistry } from "@/lib/config/agentRegistry";
import { readJudgeProfiles, readScoringProfiles } from "@/lib/config/judgeConfig";
import { createRunId, writeManifest, casesPath } from "@/lib/config/runs";
import { writeJson } from "@/lib/fabric/onelake";
import { runNotebook, getConfiguredNotebook } from "@/lib/fabric/jobs";
import { MissingConnectionValueError } from "@/lib/fabric/errors";
import type { RunManifest } from "@/lib/schemas/run";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const judgeProfileId = formData.get("judge_profile_id");
    const scoringProfileId = formData.get("scoring_profile_id");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "file is required." }, { status: 400 });
    }
    if (!judgeProfileId) {
      return NextResponse.json({ error: "judge_profile_id is required." }, { status: 400 });
    }
    if (!scoringProfileId) {
      return NextResponse.json({ error: "scoring_profile_id is required." }, { status: 400 });
    }

    const content = await file.text();
    const { rows } = parseCsv(content);

    if (rows.length === 0) {
      return NextResponse.json({ error: "CSV is empty." }, { status: 422 });
    }

    // Load agents, judge profiles, scoring profiles in parallel
    const [agentReg, judgeReg, scoringReg] = await Promise.all([
      readAgentRegistry(),
      readJudgeProfiles(),
      readScoringProfiles()
    ]);

    const validation = validateCaseRows(rows, agentReg.data.agents);
    if (!validation.ok) {
      return NextResponse.json(
        { error: "CSV has validation errors.", issues: validation.issues },
        { status: 422 }
      );
    }

    const judgeProfile = judgeReg.data.profiles.find(
      (p) => p.profile_id === String(judgeProfileId)
    );
    const scoringProfile = scoringReg.data.profiles.find(
      (p) => p.profile_id === String(scoringProfileId)
    );

    if (!judgeProfile) {
      return NextResponse.json(
        { error: `Judge profile '${judgeProfileId}' not found.` },
        { status: 404 }
      );
    }
    if (!scoringProfile) {
      return NextResponse.json(
        { error: `Scoring profile '${scoringProfileId}' not found.` },
        { status: 404 }
      );
    }

    const agentMap = new Map(agentReg.data.agents.map((a) => [a.agent_id, a]));
    const uniqueAgentIds = [...new Set(validation.cases.map((c) => c.agent_id))];

    const tracks: RunManifest["tracks"] = {};
    let anyTrackB = false;
    for (const agentId of uniqueAgentIds) {
      const agent = agentMap.get(agentId);
      const trackB = agent?.ms_eval_enabled === true;
      tracks[agentId] = { track_a: true, track_b: trackB };
      if (trackB) anyTrackB = true;
    }

    const runId = createRunId();

    // Trigger notebooks — errors here are captured per-track, not fatal to run creation
    let captureJobLocation: string | undefined;
    let msEvalJobLocation: string | undefined;
    let captureError: string | undefined;
    let msEvalError: string | undefined;

    try {
      const captureNotebook = getConfiguredNotebook("responseCapture");
      const captureJob = await runNotebook(captureNotebook, [
        { name: "run_id", value: runId }
      ]);
      captureJobLocation = captureJob.location;
    } catch (err) {
      captureError =
        err instanceof MissingConnectionValueError
          ? err.message
          : `Capture notebook trigger failed: ${err instanceof Error ? err.message : String(err)}`;
    }

    if (anyTrackB) {
      try {
        const msEvalNotebook = getConfiguredNotebook("scoreMerge"); // placeholder until ms_eval notebook item ID is configured
        const msEvalJob = await runNotebook(msEvalNotebook, [
          { name: "run_id", value: runId }
        ]);
        msEvalJobLocation = msEvalJob.location;
      } catch (err) {
        msEvalError =
          err instanceof MissingConnectionValueError
            ? err.message
            : `MS eval notebook trigger failed: ${err instanceof Error ? err.message : String(err)}`;
      }
    }

    const manifest: RunManifest = {
      run_id: runId,
      run_status: captureJobLocation ? "CAPTURE_RUNNING" : "CREATED",
      created_at: new Date().toISOString(),
      cases_path: casesPath(runId),
      raw_responses_path: `runs/${runId}/raw_responses.json`,
      judge_scores_path: `runs/${runId}/judge_scores.json`,
      agent_snapshot: agentReg.data.agents.filter((a) =>
        uniqueAgentIds.includes(a.agent_id)
      ),
      judge_snapshot: judgeProfile,
      scoring_snapshot: scoringProfile,
      cases: validation.cases,
      tracks,
      capture_job_location: captureJobLocation,
      ms_eval_job_location: msEvalJobLocation
    };

    await Promise.all([
      writeManifest(runId, manifest),
      writeJson(casesPath(runId), validation.cases)
    ]);

    return NextResponse.json({
      run_id: runId,
      capture_warning: captureError,
      ms_eval_warning: msEvalError
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
