"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { CheckCircle, Clock, RefreshCw, XCircle } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import type { RunStatus } from "@/lib/schemas/run";

// ─── Types ────────────────────────────────────────────────────────────────────

type TrackStatus = {
  active: boolean;
  job_location: string | null;
  job_status: string | null;
};

type RunStatusResponse = {
  run_id: string;
  run_status: RunStatus;
  created_at: string;
  cases_count: number;
  agent_ids: string[];
  tracks: Record<string, { track_a: boolean; track_b: boolean }>;
  track_a: TrackStatus;
  track_b: { active: boolean } | TrackStatus;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const TERMINAL_STATUSES = new Set<RunStatus>([
  "COMPLETED",
  "FAILED",
  "NEEDS_REVIEW"
]);

function isTerminal(status: RunStatus) {
  return TERMINAL_STATUSES.has(status);
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
  if (!status) return <span className="text-xs text-muted">not started</span>;
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
        <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
        {status}
      </span>
    );
  }
  return <span className="text-xs text-muted">{status}</span>;
}

function TrackCard({
  label,
  track
}: {
  label: string;
  track: TrackStatus | { active: boolean };
}) {
  if (!track.active) {
    return (
      <div className="rounded border border-dashed border-line bg-panel p-5 text-center">
        <p className="text-sm font-semibold text-muted">{label}</p>
        <p className="mt-1 text-xs text-muted">Not active for this run</p>
      </div>
    );
  }

  const t = track as TrackStatus;
  return (
    <div className="rounded border border-line bg-white p-5 shadow-soft">
      <p className="mb-3 text-sm font-semibold">{label}</p>
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted">Fabric job status</span>
        <JobStatusPill status={t.job_status} />
      </div>
      {t.job_location && (
        <p className="mt-2 break-all text-xs text-muted" title={t.job_location}>
          {t.job_location.length > 80 ? `${t.job_location.slice(0, 80)}…` : t.job_location}
        </p>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function RunDetailPage() {
  const { run_id } = useParams<{ run_id: string }>();
  const [data, setData] = useState<RunStatusResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const polling = useRef(false);

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

  // Initial load + polling
  useEffect(() => {
    if (polling.current) return;
    polling.current = true;

    async function doLoad() {
      await fetchStatus();
    }

    void doLoad();
  }, [fetchStatus]);

  useEffect(() => {
    if (!data) return;
    if (isTerminal(data.run_status)) return;

    const id = setInterval(() => {
      void fetchStatus().then(() => {
        if (data && isTerminal(data.run_status)) clearInterval(id);
      });
    }, 5000);

    return () => clearInterval(id);
  }, [data, fetchStatus]);

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      <PageHeader
        eyebrow="Run detail"
        title={`Run ${run_id}`}
        description="Status reconstructs from OneLake on load. The page polls every 5 seconds until the run reaches a terminal state."
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
        <div className="mb-4 rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {!data && !error && (
        <div className="flex items-center gap-2 text-sm text-muted">
          <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          Loading run status…
        </div>
      )}

      {data && (
        <>
          {/* Summary row */}
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

          {/* Track cards */}
          <div className="mb-6 grid gap-4 xl:grid-cols-2">
            <TrackCard label="Track A — Response capture + scoring" track={data.track_a} />
            <TrackCard label="Track B — Microsoft native evaluation" track={data.track_b} />
          </div>

          {/* Cold-start note */}
          {!isTerminal(data.run_status) && (
            <div className="rounded border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-700">
              Fabric notebooks may take <strong>5–10 minutes</strong> on a cold start. This page
              polls every 5 seconds and will update automatically.
            </div>
          )}

          {/* Agent track breakdown */}
          {Object.keys(data.tracks).length > 0 && (
            <section className="mt-6 rounded border border-line bg-white p-5 shadow-soft">
              <h2 className="mb-3 text-sm font-semibold">Track breakdown by agent</h2>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-line text-left text-xs font-semibold uppercase tracking-wide text-muted">
                    <th className="pb-2 pr-4">Agent</th>
                    <th className="pb-2 pr-4">Track A</th>
                    <th className="pb-2">Track B (MS Eval)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {Object.entries(data.tracks).map(([agentId, track]) => (
                    <tr key={agentId}>
                      <td className="py-2 pr-4 font-mono text-xs">{agentId}</td>
                      <td className="py-2 pr-4">
                        <span
                          className={`text-xs ${track.track_a ? "text-green-600" : "text-muted"}`}
                        >
                          {track.track_a ? "active" : "inactive"}
                        </span>
                      </td>
                      <td className="py-2">
                        <span
                          className={`text-xs ${track.track_b ? "text-green-600" : "text-muted"}`}
                        >
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
