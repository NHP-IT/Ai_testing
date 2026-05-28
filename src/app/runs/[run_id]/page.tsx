"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import {
  AlertCircle,
  CheckCircle,
  Clock,
  Play,
  RefreshCw,
  XCircle
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import type { RunStatus } from "@/lib/schemas/run";

// ─── Types ────────────────────────────────────────────────────────────────────

type MsEvalAgentStatus = {
  test_sets_discovered?: number;
  test_sets_run?: number;
  total_cases?: number;
  completed_at?: string;
  error?: string | null;
};

type TrackAStatus = {
  active: true;
  job_location: string | null;
  job_status: string | null;
  raw_response_count: number | null;
  scored_count: number | null;
  failed_count: number | null;
};

type TrackBStatus =
  | { active: false }
  | {
      active: true;
      job_location: string | null;
      job_status: string | null;
      ms_eval_status: { status: string; agents: Record<string, MsEvalAgentStatus> } | null;
    };

type RunStatusResponse = {
  run_id: string;
  run_status: RunStatus;
  created_at: string;
  cases_count: number;
  agent_ids: string[];
  tracks: Record<string, { track_a: boolean; track_b: boolean }>;
  track_a: TrackAStatus;
  track_b: TrackBStatus;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const TERMINAL_STATUSES = new Set<RunStatus>(["COMPLETED", "FAILED", "NEEDS_REVIEW"]);
const POLL_INTERVAL_MS = 5000;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isTerminal(status: RunStatus) {
  return TERMINAL_STATUSES.has(status);
}

function Spinner() {
  return (
    <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
  );
}

function StatusBadge({ status }: { status: RunStatus }) {
  const variants: Record<string, string> = {
    CREATED: "bg-slate-100 text-slate-700",
    CAPTURE_RUNNING: "bg-blue-100 text-blue-700",
    RESPONSES_CAPTURED: "bg-cyan-100 text-cyan-700",
    SCORING_RUNNING: "bg-purple-100 text-purple-700",
    SCORES_READY: "bg-indigo-100 text-indigo-700",
    MERGE_RUNNING: "bg-amber-100 text-amber-700",
    COMPLETED: "bg-green-100 text-green-700",
    FAILED: "bg-red-100 text-red-700",
    NEEDS_REVIEW: "bg-orange-100 text-orange-700"
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${variants[status] ?? "bg-slate-100 text-slate-700"}`}
    >
      {status.replace(/_/g, " ")}
    </span>
  );
}

function JobStatusPill({ status }: { status: string | null }) {
  if (!status) return <span className="text-xs text-muted">—</span>;
  const lower = status.toLowerCase();
  if (lower === "succeeded" || lower === "completed") {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-green-600">
        <CheckCircle aria-hidden className="h-3 w-3" />
        {status}
      </span>
    );
  }
  if (lower === "failed" || lower === "cancelled") {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-red-600">
        <XCircle aria-hidden className="h-3 w-3" />
        {status}
      </span>
    );
  }
  if (lower === "running" || lower === "inprogress") {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-blue-600">
        <Spinner />
        {status}
      </span>
    );
  }
  return <span className="text-xs text-muted">{status}</span>;
}

function ProgressBar({ value, total, label }: { value: number; total: number; label: string }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs text-muted">
        <span>{label}</span>
        <span>
          {value}/{total} ({pct}%)
        </span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-line">
        <div
          className="h-1.5 rounded-full bg-brand transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function RunDetailPage() {
  const { run_id } = useParams<{ run_id: string }>();
  const [data, setData] = useState<RunStatusResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const initialized = useRef(false);

  const [scoring, setScoring] = useState(false);
  const [scoreError, setScoreError] = useState<string | null>(null);
  const [scoreResult, setScoreResult] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    if (!run_id) return;
    const res = await fetch(`/api/runs/${run_id}/status`);
    const json = (await res.json()) as RunStatusResponse & { error?: string };

    if (!res.ok) {
      setError(json.error ?? "Failed to load run status.");
      return;
    }

    setData(json);
    setError(null);
    setLastRefreshed(new Date());
  }, [run_id]);

  // Initial load
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    void fetchStatus();
  }, [fetchStatus]);

  // Polling while active
  useEffect(() => {
    if (!data) return;
    if (isTerminal(data.run_status)) return;

    const id = setInterval(() => {
      void fetchStatus();
    }, POLL_INTERVAL_MS);

    return () => clearInterval(id);
  }, [data, fetchStatus]);

  async function triggerScoring() {
    if (!run_id) return;
    setScoring(true);
    setScoreError(null);
    setScoreResult(null);

    const res = await fetch(`/api/runs/${run_id}/score`, { method: "POST" });
    const json = (await res.json()) as {
      scored?: number;
      failed?: number;
      skipped?: number;
      message?: string;
      error?: string;
    };

    if (!res.ok) {
      setScoreError(json.error ?? "Scoring failed.");
      setScoring(false);
      return;
    }

    setScoreResult(
      json.message ?? `Scored ${json.scored ?? 0} case(s), ${json.failed ?? 0} failed.`
    );
    setScoring(false);
    void fetchStatus();
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      <PageHeader
        eyebrow="Run detail"
        title={`Run ${run_id}`}
        description="State reconstructs from OneLake on load. Polls every 5 seconds while either track is active."
        actions={
          <button
            type="button"
            onClick={() => void fetchStatus()}
            className="inline-flex h-10 items-center gap-2 rounded border border-line bg-panel px-4 text-sm font-semibold text-foreground hover:bg-white"
          >
            <RefreshCw aria-hidden className="h-4 w-4" />
            Refresh
          </button>
        }
      />

      {error && (
        <div className="mb-4 flex items-center gap-2 rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle aria-hidden className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {!data && !error && (
        <div className="flex items-center gap-2 text-sm text-muted">
          <Spinner />
          Loading run status…
        </div>
      )}

      {data && (
        <>
          {/* Summary bar */}
          <div className="mb-6 flex flex-wrap items-center gap-4 rounded border border-line bg-white p-4 shadow-soft">
            <StatusBadge status={data.run_status} />
            <div className="flex items-center gap-1.5 text-xs text-muted">
              <Clock aria-hidden className="h-3 w-3" />
              Created {new Date(data.created_at).toLocaleString()}
            </div>
            <span className="text-xs text-muted">
              {data.cases_count} case{data.cases_count !== 1 ? "s" : ""}
            </span>
            {data.agent_ids.length > 0 && (
              <span className="text-xs text-muted">Agents: {data.agent_ids.join(", ")}</span>
            )}
            {lastRefreshed && (
              <span className="ml-auto text-xs text-muted">
                Refreshed {lastRefreshed.toLocaleTimeString()}
              </span>
            )}
          </div>

          {/* Track panels */}
          <div className="mb-6 grid gap-4 xl:grid-cols-2">
            {/* Track A */}
            <section className="rounded border border-line bg-white p-5 shadow-soft">
              <h2 className="mb-4 text-sm font-semibold">Track A — Response capture + scoring</h2>

              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted">Fabric capture job</span>
                  <JobStatusPill status={data.track_a.job_status} />
                </div>

                {data.track_a.raw_response_count !== null && (
                  <ProgressBar
                    value={data.track_a.raw_response_count}
                    total={data.cases_count}
                    label="Responses captured"
                  />
                )}

                {data.track_a.scored_count !== null && (
                  <ProgressBar
                    value={data.track_a.scored_count + (data.track_a.failed_count ?? 0)}
                    total={data.track_a.raw_response_count ?? data.cases_count}
                    label="Cases scored"
                  />
                )}

                {data.track_a.failed_count !== null && data.track_a.failed_count > 0 && (
                  <p className="text-xs text-red-600">
                    {data.track_a.failed_count} case{data.track_a.failed_count !== 1 ? "s" : ""} failed scoring
                  </p>
                )}
              </div>

              {/* Scoring trigger */}
              {data.track_a.raw_response_count !== null && (
                <div className="mt-4 border-t border-line pt-4">
                  {scoreError && (
                    <p className="mb-2 text-xs text-red-600">{scoreError}</p>
                  )}
                  {scoreResult && (
                    <p className="mb-2 text-xs text-green-600">{scoreResult}</p>
                  )}
                  <button
                    type="button"
                    disabled={scoring}
                    onClick={() => void triggerScoring()}
                    className="inline-flex h-8 items-center gap-2 rounded bg-brand px-3 text-xs font-semibold text-white hover:bg-brand/90 disabled:opacity-50"
                  >
                    {scoring ? <Spinner /> : <Play aria-hidden className="h-3 w-3" />}
                    {scoring ? "Scoring…" : "Score cases"}
                  </button>
                  <p className="mt-1 text-xs text-muted">
                    Already-scored cases are skipped automatically.
                  </p>
                </div>
              )}
            </section>

            {/* Track B */}
            {data.track_b.active ? (
              <section className="rounded border border-line bg-white p-5 shadow-soft">
                <h2 className="mb-4 text-sm font-semibold">Track B — Microsoft native evaluation</h2>

                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted">Fabric MS eval job</span>
                    <JobStatusPill status={(data.track_b as { job_status: string | null }).job_status} />
                  </div>

                  {(data.track_b as { ms_eval_status: { status: string; agents: Record<string, MsEvalAgentStatus> } | null }).ms_eval_status && (
                    <div className="space-y-2">
                      {Object.entries(
                        (data.track_b as { ms_eval_status: { status: string; agents: Record<string, MsEvalAgentStatus> } }).ms_eval_status.agents
                      ).map(([agentId, agentStatus]) => (
                        <div
                          key={agentId}
                          className="rounded border border-line bg-panel p-3 text-xs"
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-mono font-semibold">{agentId}</span>
                            {agentStatus.error ? (
                              <span className="text-red-600">Error</span>
                            ) : agentStatus.completed_at ? (
                              <span className="text-green-600">Completed</span>
                            ) : (
                              <span className="text-muted">In progress</span>
                            )}
                          </div>
                          {agentStatus.test_sets_run !== undefined && (
                            <p className="text-muted">
                              {agentStatus.test_sets_run}/{agentStatus.test_sets_discovered} test set
                              {agentStatus.test_sets_run !== 1 ? "s" : ""} run
                              {agentStatus.total_cases !== undefined
                                ? ` · ${agentStatus.total_cases} cases`
                                : ""}
                            </p>
                          )}
                          {agentStatus.error && (
                            <p className="mt-1 text-red-600">{agentStatus.error}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </section>
            ) : (
              <div className="rounded border border-dashed border-line bg-panel p-5 text-center">
                <p className="text-sm font-semibold text-muted">Track B not active</p>
                <p className="mt-1 text-xs text-muted">
                  Enable MS Eval on one or more agents to activate Track B.
                </p>
              </div>
            )}
          </div>

          {/* Cold-start notice */}
          {!isTerminal(data.run_status) && (
            <div className="mb-6 rounded border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-700">
              Fabric notebooks may take <strong>5–10 minutes</strong> on a cold start. This page
              polls every 5 seconds.
            </div>
          )}

          {/* Per-agent track breakdown */}
          {Object.keys(data.tracks).length > 0 && (
            <section className="rounded border border-line bg-white p-5 shadow-soft">
              <h2 className="mb-3 text-sm font-semibold">Track breakdown by agent</h2>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-line text-left text-xs font-semibold uppercase tracking-wide text-muted">
                    <th className="pb-2 pr-6">Agent</th>
                    <th className="pb-2 pr-6">Track A</th>
                    <th className="pb-2">Track B (MS Eval)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {Object.entries(data.tracks).map(([agentId, track]) => (
                    <tr key={agentId}>
                      <td className="py-2 pr-6 font-mono text-xs">{agentId}</td>
                      <td className="py-2 pr-6">
                        <span className={`text-xs ${track.track_a ? "text-green-600" : "text-muted"}`}>
                          {track.track_a ? "active" : "inactive"}
                        </span>
                      </td>
                      <td className="py-2">
                        <span className={`text-xs ${track.track_b ? "text-green-600" : "text-muted"}`}>
                          {track.track_b ? "active" : "inactive"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}
        </>
      )}
    </>
  );
}
