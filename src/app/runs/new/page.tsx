"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle, FileUp, PlayCircle, X } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import type { JudgeProfile, ScoringProfile } from "@/lib/schemas/judge";
import type { CaseValidationIssue } from "@/lib/schemas/case";

// ─── Types ────────────────────────────────────────────────────────────────────

type ValidationState = {
  ok: boolean;
  row_count: number;
  case_count: number;
  agent_ids: string[];
  headers: string[];
  issues: CaseValidationIssue[];
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function Label({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-xs font-semibold uppercase tracking-wide text-muted mb-1">
      {children}
    </label>
  );
}

function Select(props: React.SelectHTMLAttributes<HTMLSelectElement> & { children: React.ReactNode }) {
  return (
    <select
      {...props}
      className="w-full rounded border border-line bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/40 disabled:opacity-50"
    />
  );
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
      {message}
    </div>
  );
}

function Spinner() {
  return (
    <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
  );
}

const requiredColumns = ["test_id", "agent_id", "suite", "frequency", "severity", "question"];
const optionalColumns = ["category", "source_filter", "must_contain", "must_not_contain", "test_origin"];

// ─── Main page ────────────────────────────────────────────────────────────────

export default function NewRunPage() {
  const router = useRouter();

  const [judgeProfiles, setJudgeProfiles] = useState<JudgeProfile[]>([]);
  const [scoringProfiles, setScoringProfiles] = useState<ScoringProfile[]>([]);
  const [profilesLoading, setProfilesLoading] = useState(true);
  const [profilesError, setProfilesError] = useState<string | null>(null);

  const [selectedJudge, setSelectedJudge] = useState("");
  const [selectedScoring, setSelectedScoring] = useState("");

  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [validating, setValidating] = useState(false);
  const [validation, setValidation] = useState<ValidationState | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);

  // Load profiles on mount
  useEffect(() => {
    async function doLoad() {
      const [judgeRes, scoringRes] = await Promise.all([
        fetch("/api/judge/profiles"),
        fetch("/api/judge/scoring-profiles")
      ]);

      if (!judgeRes.ok || !scoringRes.ok) {
        setProfilesError("Could not load judge or scoring profiles.");
        setProfilesLoading(false);
        return;
      }

      const judgeData = (await judgeRes.json()) as { profiles: JudgeProfile[] };
      const scoringData = (await scoringRes.json()) as { profiles: ScoringProfile[] };

      setJudgeProfiles(judgeData.profiles);
      setScoringProfiles(scoringData.profiles);
      if (judgeData.profiles.length > 0) setSelectedJudge(judgeData.profiles[0].profile_id);
      if (scoringData.profiles.length > 0) setSelectedScoring(scoringData.profiles[0].profile_id);
      setProfilesLoading(false);
    }
    void doLoad();
  }, []);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setCsvFile(file);
    setValidation(null);
    setValidationError(null);
    setStartError(null);

    if (!file) return;

    setValidating(true);
    const body = new FormData();
    body.append("file", file);

    const res = await fetch("/api/runs/validate", { method: "POST", body });
    const data = (await res.json()) as ValidationState & { error?: string };

    if (!res.ok || data.error) {
      setValidationError(data.error ?? "Validation failed.");
      setValidating(false);
      return;
    }

    setValidation(data);
    setValidating(false);
  }

  async function handleStart(e: React.FormEvent) {
    e.preventDefault();
    if (!csvFile || !selectedJudge || !selectedScoring || !validation?.ok) return;

    setStarting(true);
    setStartError(null);

    const body = new FormData();
    body.append("file", csvFile);
    body.append("judge_profile_id", selectedJudge);
    body.append("scoring_profile_id", selectedScoring);

    const res = await fetch("/api/runs", { method: "POST", body });
    const data = (await res.json()) as { run_id?: string; error?: string; capture_warning?: string; ms_eval_warning?: string };

    if (!res.ok || !data.run_id) {
      setStartError(data.error ?? "Run creation failed.");
      setStarting(false);
      return;
    }

    router.push(`/runs/${data.run_id}`);
  }

  const canStart =
    !!csvFile &&
    !!selectedJudge &&
    !!selectedScoring &&
    validation?.ok === true &&
    !validating;

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <>
      <PageHeader
        eyebrow="Run creation"
        title="Upload CSV questions"
        description="Create an on-demand evaluation run. Upload a question CSV, choose your judge settings, and start both evaluation tracks."
        actions={
          <button
            type="submit"
            form="run-form"
            disabled={!canStart || starting}
            className="inline-flex h-10 items-center gap-2 rounded bg-brand px-4 text-sm font-semibold text-white hover:bg-brand/90 disabled:opacity-50"
          >
            {starting ? <Spinner /> : <PlayCircle aria-hidden className="h-4 w-4" />}
            {starting ? "Starting…" : "Start run"}
          </button>
        }
      />

      <form id="run-form" onSubmit={(e) => void handleStart(e)}>
        <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
          {/* Left: CSV upload */}
          <div className="flex flex-col gap-6">
            <section className="rounded border border-line bg-white p-5 shadow-soft">
              <div className="flex items-center gap-2 mb-4">
                <FileUp aria-hidden className="h-4 w-4 text-brand" />
                <h2 className="text-sm font-semibold">CSV file</h2>
              </div>

              <div>
                <Label>Select CSV file</Label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={(e) => void handleFileChange(e)}
                  className="block w-full text-sm text-muted file:mr-3 file:rounded file:border file:border-line file:bg-panel file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-foreground hover:file:bg-white"
                />
              </div>

              {validating && (
                <div className="mt-3 flex items-center gap-2 text-sm text-muted">
                  <Spinner />
                  Validating…
                </div>
              )}

              {validationError && (
                <div className="mt-3">
                  <ErrorBanner message={validationError} />
                </div>
              )}

              {validation && !validating && (
                <div className="mt-3">
                  {validation.ok ? (
                    <div className="flex items-start gap-3 rounded border border-green-200 bg-green-50 px-4 py-3">
                      <CheckCircle aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
                      <div className="text-sm text-green-700">
                        <p className="font-semibold">
                          {validation.case_count} valid case{validation.case_count !== 1 ? "s" : ""}
                        </p>
                        <p>
                          Agents:{" "}
                          {validation.agent_ids.length > 0
                            ? validation.agent_ids.join(", ")
                            : "none"}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded border border-red-200 bg-red-50 px-4 py-3">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertCircle aria-hidden className="h-4 w-4 shrink-0 text-red-600" />
                        <p className="text-sm font-semibold text-red-700">
                          {validation.issues.length} validation error{validation.issues.length !== 1 ? "s" : ""}
                        </p>
                      </div>
                      <ul className="space-y-1">
                        {validation.issues.slice(0, 10).map((issue, i) => (
                          <li key={i} className="text-xs text-red-600">
                            Row {issue.row}
                            {issue.field ? ` · ${issue.field}` : ""}: {issue.message}
                          </li>
                        ))}
                        {validation.issues.length > 10 && (
                          <li className="text-xs text-red-500">
                            … and {validation.issues.length - 10} more errors
                          </li>
                        )}
                      </ul>
                      {validation.case_count > 0 && (
                        <p className="mt-2 text-xs text-red-600">
                          {validation.case_count} rows parsed before first error.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {validation && (
                <button
                  type="button"
                  onClick={() => {
                    setCsvFile(null);
                    setValidation(null);
                    setValidationError(null);
                    setStartError(null);
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}
                  className="mt-2 flex items-center gap-1 text-xs text-muted hover:text-foreground"
                >
                  <X aria-hidden className="h-3 w-3" />
                  Clear
                </button>
              )}
            </section>

            {/* Judge & scoring selection */}
            <section className="rounded border border-line bg-white p-5 shadow-soft">
              <h2 className="mb-4 text-sm font-semibold">Judge settings</h2>

              {profilesError && <ErrorBanner message={profilesError} />}

              {profilesLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted">
                  <Spinner />
                  Loading profiles…
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  <div>
                    <Label>Judge profile</Label>
                    {judgeProfiles.length === 0 ? (
                      <p className="text-sm text-muted">No judge profiles configured.</p>
                    ) : (
                      <Select
                        value={selectedJudge}
                        onChange={(e) => setSelectedJudge(e.target.value)}
                      >
                        {judgeProfiles.map((p) => (
                          <option key={p.profile_id} value={p.profile_id}>
                            {p.profile_id} — {p.model} ({p.provider})
                          </option>
                        ))}
                      </Select>
                    )}
                  </div>
                  <div>
                    <Label>Scoring profile</Label>
                    {scoringProfiles.length === 0 ? (
                      <p className="text-sm text-muted">No scoring profiles configured.</p>
                    ) : (
                      <Select
                        value={selectedScoring}
                        onChange={(e) => setSelectedScoring(e.target.value)}
                      >
                        {scoringProfiles.map((p) => (
                          <option key={p.profile_id} value={p.profile_id}>
                            {p.profile_id} — relevancy ≥ {p.answer_relevancy_threshold}, grounding ≥{" "}
                            {p.grounding_threshold}
                          </option>
                        ))}
                      </Select>
                    )}
                  </div>
                </div>
              )}
            </section>

            {startError && <ErrorBanner message={startError} />}
          </div>

          {/* Right: CSV format reference */}
          <div className="flex flex-col gap-6">
            <section className="rounded border border-line bg-white p-5 shadow-soft">
              <h2 className="mb-4 text-sm font-semibold">Required columns</h2>
              <div className="flex flex-wrap gap-2 mb-4">
                {requiredColumns.map((col) => (
                  <span
                    key={col}
                    className="rounded border border-line bg-panel px-3 py-1.5 text-xs font-mono font-medium"
                  >
                    {col}
                  </span>
                ))}
              </div>
              <h2 className="mb-2 text-sm font-semibold">Optional columns</h2>
              <div className="flex flex-wrap gap-2 mb-4">
                {optionalColumns.map((col) => (
                  <span
                    key={col}
                    className="rounded border border-dashed border-line bg-white px-3 py-1.5 text-xs font-mono text-muted"
                  >
                    {col}
                  </span>
                ))}
              </div>
              <p className="text-xs leading-5 text-muted">
                Expected answers are not required — the judge LLM generates a reference answer from
                corpus context. Corpus must be uploaded for any agents referenced in the CSV.
              </p>
            </section>

            <section className="rounded border border-line bg-white p-5 shadow-soft">
              <h2 className="mb-2 text-sm font-semibold">About run timing</h2>
              <p className="text-xs leading-5 text-muted">
                Fabric notebooks may take <strong>5–10 minutes</strong> on a cold start. The run
                detail page polls every 5 seconds and will show the current job status. Track A
                (response capture + scoring) and Track B (Microsoft native eval) run in parallel
                when both are active.
              </p>
            </section>
          </div>
        </div>
      </form>
    </>
  );
}
