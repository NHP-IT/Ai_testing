"use client";

import { useState, useEffect } from "react";
import {
  Server,
  SlidersHorizontal,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Zap
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import type { JudgeProfile, ScoringProfile } from "@/lib/schemas/judge";

// ---------------------------------------------------------------------------
// Shared form pieces
// ---------------------------------------------------------------------------

function Field({
  label,
  children,
  className = ""
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="text-sm font-medium text-ink">{label}</span>
      {children}
    </label>
  );
}

function TextInput({
  value,
  onChange,
  placeholder = "",
  type = "text",
  readOnly = false
}: {
  value: string;
  onChange?: (v: string) => void;
  placeholder?: string;
  type?: string;
  readOnly?: boolean;
}) {
  return (
    <input
      type={type}
      value={value}
      readOnly={readOnly}
      onChange={(e) => onChange?.(e.target.value)}
      placeholder={placeholder}
      className={`mt-1.5 h-10 w-full rounded border border-line px-3 text-sm focus:border-brand focus:outline-none ${
        readOnly ? "bg-panel text-muted" : "bg-white"
      }`}
    />
  );
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-2 rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
      {message}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Judge profile form helpers
// ---------------------------------------------------------------------------

type JudgeFormState = {
  profile_id: string;
  provider: string;
  base_url: string;
  model: string;
  api_key_reference: string;
  temperature: string;
  timeout_ms: string;
  max_tokens: string;
  concurrency_limit: string;
  prompt_version: string;
};

const DEFAULT_JUDGE_FORM: JudgeFormState = {
  profile_id: "",
  provider: "ollama_openai_compatible",
  base_url: "",
  model: "",
  api_key_reference: "",
  temperature: "0",
  timeout_ms: "120000",
  max_tokens: "",
  concurrency_limit: "3",
  prompt_version: "v1"
};

function judgeToForm(p: JudgeProfile): JudgeFormState {
  return {
    profile_id: p.profile_id,
    provider: p.provider,
    base_url: p.base_url,
    model: p.model,
    api_key_reference: p.api_key_reference ?? "",
    temperature: String(p.temperature),
    timeout_ms: String(p.timeout_ms),
    max_tokens: p.max_tokens !== undefined ? String(p.max_tokens) : "",
    concurrency_limit: String(p.concurrency_limit),
    prompt_version: p.prompt_version
  };
}

function judgeFormToPayload(f: JudgeFormState): Record<string, unknown> {
  return {
    profile_id: f.profile_id,
    provider: f.provider,
    base_url: f.base_url,
    model: f.model,
    ...(f.api_key_reference ? { api_key_reference: f.api_key_reference } : {}),
    temperature: parseFloat(f.temperature) || 0,
    timeout_ms: parseInt(f.timeout_ms) || 120000,
    ...(f.max_tokens ? { max_tokens: parseInt(f.max_tokens) } : {}),
    concurrency_limit: parseInt(f.concurrency_limit) || 3,
    prompt_version: f.prompt_version || "v1"
  };
}

// ---------------------------------------------------------------------------
// Scoring profile form helpers
// ---------------------------------------------------------------------------

const DEFAULT_PROMPT_TEMPLATE = `You are an expert evaluator of AI agent responses.

Given:
- question: the user's question
- context: retrieved source-of-truth passages
- response: the agent's answer

Return a JSON object with:
- reference_answer: a model answer derived only from context
- answer_relevancy_score: 0.0-1.0, how well the response addresses the question
- grounding_score: 0.0-1.0, how well the response is supported by context
- passed: true if both scores are satisfactory
- reason: one-sentence explanation
- unsupported_claims: list of claims not supported by context`;

type ScoringFormState = {
  profile_id: string;
  answer_relevancy_threshold: string;
  grounding_threshold: string;
  prompt_template: string;
};

const DEFAULT_SCORING_FORM: ScoringFormState = {
  profile_id: "",
  answer_relevancy_threshold: "0.7",
  grounding_threshold: "0.7",
  prompt_template: DEFAULT_PROMPT_TEMPLATE
};

function scoringToForm(p: ScoringProfile): ScoringFormState {
  return {
    profile_id: p.profile_id,
    answer_relevancy_threshold: String(p.answer_relevancy_threshold),
    grounding_threshold: String(p.grounding_threshold),
    prompt_template: p.prompt_template
  };
}

function scoringFormToPayload(f: ScoringFormState): Record<string, unknown> {
  return {
    profile_id: f.profile_id,
    answer_relevancy_threshold: parseFloat(f.answer_relevancy_threshold) || 0.7,
    grounding_threshold: parseFloat(f.grounding_threshold) || 0.7,
    similarity_enabled: false,
    prompt_template: f.prompt_template
  };
}

// ---------------------------------------------------------------------------
// Shared section header
// ---------------------------------------------------------------------------

function SectionHeader({
  icon: Icon,
  title,
  count,
  onAdd,
  onReload
}: {
  icon: React.ElementType;
  title: string;
  count?: number;
  onAdd: () => void;
  onReload: () => void;
}) {
  return (
    <div className="flex items-center gap-2 border-b border-line px-5 py-4">
      <Icon aria-hidden className="h-5 w-5 text-brand" />
      <h3 className="text-base font-semibold">{title}</h3>
      {count !== undefined && (
        <span className="ml-1 text-sm text-muted">
          {count} profile{count !== 1 ? "s" : ""}
        </span>
      )}
      <div className="ml-auto flex items-center gap-2">
        <button type="button" onClick={onReload} className="text-muted hover:text-ink" aria-label="Reload">
          <RefreshCw className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={onAdd}
          className="inline-flex h-8 items-center gap-1.5 rounded border border-brand bg-brand px-3 text-xs font-semibold text-white hover:bg-teal-700"
        >
          <Plus className="h-3.5 w-3.5" />
          Add
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Modal shell
// ---------------------------------------------------------------------------

function Modal({
  title,
  onClose,
  onSave,
  saving,
  saveError,
  children
}: {
  title: string;
  onClose: () => void;
  onSave: () => void;
  saving: boolean;
  saveError: string | null;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 pt-16">
      <div className="w-full max-w-xl rounded-lg border border-line bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-line px-6 py-4">
          <h2 className="text-base font-semibold">{title}</h2>
          <button onClick={onClose} className="text-muted hover:text-ink" aria-label="Close">
            ✕
          </button>
        </div>
        <div className="space-y-4 px-6 py-5">
          {saveError && <ErrorBanner message={saveError} />}
          {children}
        </div>
        <div className="flex items-center justify-end gap-3 border-t border-line px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="h-9 rounded border border-line px-4 text-sm text-muted hover:text-ink"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={saving}
            className="inline-flex h-9 items-center gap-2 rounded bg-brand px-4 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-60"
          >
            {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function JudgePage() {
  // Judge profiles
  const [judgeFetchKey, setJudgeFetchKey] = useState(0);
  const [judgeProfiles, setJudgeProfiles] = useState<JudgeProfile[]>([]);
  const [judgeLoading, setJudgeLoading] = useState(true);
  const [judgeLoadError, setJudgeLoadError] = useState<string | null>(null);
  const [judgeModal, setJudgeModal] = useState<"add" | JudgeProfile | null>(null);
  const [judgeForm, setJudgeForm] = useState<JudgeFormState>(DEFAULT_JUDGE_FORM);
  const [judgeSaving, setJudgeSaving] = useState(false);
  const [judgeSaveError, setJudgeSaveError] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ profileId: string; ok: boolean; message: string } | null>(null);
  const [testing, setTesting] = useState<string | null>(null);

  // Scoring profiles
  const [scoringFetchKey, setScoringFetchKey] = useState(0);
  const [scoringProfiles, setScoringProfiles] = useState<ScoringProfile[]>([]);
  const [scoringLoading, setScoringLoading] = useState(true);
  const [scoringLoadError, setScoringLoadError] = useState<string | null>(null);
  const [scoringModal, setScoringModal] = useState<"add" | ScoringProfile | null>(null);
  const [scoringForm, setScoringForm] = useState<ScoringFormState>(DEFAULT_SCORING_FORM);
  const [scoringSaving, setScoringSaving] = useState(false);
  const [scoringSaveError, setScoringSaveError] = useState<string | null>(null);

  // Load effects — all setState calls happen inside async callbacks, never synchronously
  useEffect(() => {
    let cancelled = false;
    async function doLoad() {
      try {
        const r = await fetch("/api/judge/profiles");
        const body = (await r.json()) as { profiles?: JudgeProfile[]; error?: string };
        if (!r.ok) throw new Error(body.error ?? `HTTP ${r.status}`);
        if (!cancelled) { setJudgeProfiles(body.profiles ?? []); setJudgeLoadError(null); }
      } catch (err: unknown) {
        if (!cancelled) setJudgeLoadError(err instanceof Error ? err.message : String(err));
      } finally {
        if (!cancelled) setJudgeLoading(false);
      }
    }
    void doLoad();
    return () => { cancelled = true; };
  }, [judgeFetchKey]);

  useEffect(() => {
    let cancelled = false;
    async function doLoad() {
      try {
        const r = await fetch("/api/judge/scoring-profiles");
        const body = (await r.json()) as { profiles?: ScoringProfile[]; error?: string };
        if (!r.ok) throw new Error(body.error ?? `HTTP ${r.status}`);
        if (!cancelled) { setScoringProfiles(body.profiles ?? []); setScoringLoadError(null); }
      } catch (err: unknown) {
        if (!cancelled) setScoringLoadError(err instanceof Error ? err.message : String(err));
      } finally {
        if (!cancelled) setScoringLoading(false);
      }
    }
    void doLoad();
    return () => { cancelled = true; };
  }, [scoringFetchKey]);

  function reloadJudge() { setJudgeLoading(true); setJudgeLoadError(null); setJudgeFetchKey((n) => n + 1); }
  function reloadScoring() { setScoringLoading(true); setScoringLoadError(null); setScoringFetchKey((n) => n + 1); }

  // Judge CRUD
  function openAddJudge() { setJudgeForm(DEFAULT_JUDGE_FORM); setJudgeSaveError(null); setJudgeModal("add"); }
  function openEditJudge(p: JudgeProfile) { setJudgeForm(judgeToForm(p)); setJudgeSaveError(null); setJudgeModal(p); }
  function setJF<K extends keyof JudgeFormState>(key: K, value: JudgeFormState[K]) {
    setJudgeForm((prev) => ({ ...prev, [key]: value }));
  }

  async function saveJudge() {
    setJudgeSaving(true);
    setJudgeSaveError(null);
    const isAdd = judgeModal === "add";
    const pid = isAdd ? null : (judgeModal as JudgeProfile).profile_id;
    const url = isAdd ? "/api/judge/profiles" : `/api/judge/profiles/${pid}`;
    try {
      const res = await fetch(url, {
        method: isAdd ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(judgeFormToPayload(judgeForm))
      });
      const body = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(body.error ?? `HTTP ${res.status}`);
      setJudgeModal(null);
      reloadJudge();
    } catch (err) {
      setJudgeSaveError(err instanceof Error ? err.message : String(err));
    } finally {
      setJudgeSaving(false);
    }
  }

  async function deleteJudge(p: JudgeProfile) {
    if (!confirm(`Remove judge profile '${p.profile_id}'?`)) return;
    try {
      const res = await fetch(`/api/judge/profiles/${p.profile_id}`, { method: "DELETE" });
      if (!res.ok) { const b = (await res.json()) as { error?: string }; throw new Error(b.error ?? `HTTP ${res.status}`); }
      setJudgeProfiles((prev) => prev.filter((x) => x.profile_id !== p.profile_id));
    } catch (err) { alert(err instanceof Error ? err.message : String(err)); }
  }

  async function testJudge(p: JudgeProfile) {
    setTesting(p.profile_id);
    setTestResult(null);
    try {
      const res = await fetch("/api/judge/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ base_url: p.base_url, api_key: p.api_key_reference })
      });
      const body = (await res.json()) as { ok: boolean; message: string };
      setTestResult({ profileId: p.profile_id, ok: body.ok, message: body.message });
    } catch (err) {
      setTestResult({ profileId: p.profile_id, ok: false, message: err instanceof Error ? err.message : String(err) });
    } finally {
      setTesting(null);
    }
  }

  // Scoring CRUD
  function openAddScoring() { setScoringForm(DEFAULT_SCORING_FORM); setScoringSaveError(null); setScoringModal("add"); }
  function openEditScoring(p: ScoringProfile) { setScoringForm(scoringToForm(p)); setScoringSaveError(null); setScoringModal(p); }
  function setSF<K extends keyof ScoringFormState>(key: K, value: ScoringFormState[K]) {
    setScoringForm((prev) => ({ ...prev, [key]: value }));
  }

  async function saveScoring() {
    setScoringSaving(true);
    setScoringSaveError(null);
    const isAdd = scoringModal === "add";
    const pid = isAdd ? null : (scoringModal as ScoringProfile).profile_id;
    const url = isAdd ? "/api/judge/scoring-profiles" : `/api/judge/scoring-profiles/${pid}`;
    try {
      const res = await fetch(url, {
        method: isAdd ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(scoringFormToPayload(scoringForm))
      });
      const body = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(body.error ?? `HTTP ${res.status}`);
      setScoringModal(null);
      reloadScoring();
    } catch (err) {
      setScoringSaveError(err instanceof Error ? err.message : String(err));
    } finally {
      setScoringSaving(false);
    }
  }

  async function deleteScoring(p: ScoringProfile) {
    if (!confirm(`Remove scoring profile '${p.profile_id}'?`)) return;
    try {
      const res = await fetch(`/api/judge/scoring-profiles/${p.profile_id}`, { method: "DELETE" });
      if (!res.ok) { const b = (await res.json()) as { error?: string }; throw new Error(b.error ?? `HTTP ${res.status}`); }
      setScoringProfiles((prev) => prev.filter((x) => x.profile_id !== p.profile_id));
    } catch (err) { alert(err instanceof Error ? err.message : String(err)); }
  }

  return (
    <>
      <PageHeader
        eyebrow="Judge settings"
        title="LLM judge and scoring"
        description="Configure the judge LLM server and scoring thresholds. Profiles are persisted to OneLake."
      />

      {/* Judge profiles */}
      <section className="overflow-hidden rounded border border-line bg-white shadow-soft">
        <SectionHeader
          icon={Server}
          title="Judge profiles"
          count={judgeLoading ? undefined : judgeProfiles.length}
          onAdd={openAddJudge}
          onReload={reloadJudge}
        />
        {judgeLoadError && <div className="border-b border-line px-5 py-3"><ErrorBanner message={judgeLoadError} /></div>}
        {judgeLoading ? (
          <div className="flex items-center justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-muted" /></div>
        ) : judgeProfiles.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-muted">
            No judge profiles yet.{" "}
            <button onClick={openAddJudge} className="font-medium text-brand underline underline-offset-2">Add the first profile</button>
          </p>
        ) : (
          <div className="divide-y divide-line">
            {judgeProfiles.map((p) => (
              <div key={p.profile_id} className="px-5 py-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="font-medium">{p.profile_id}</p>
                    <p className="mt-0.5 text-sm text-muted">{p.provider} · {p.base_url} · {p.model}</p>
                    <p className="mt-0.5 text-xs text-muted">
                      temp {p.temperature} · timeout {p.timeout_ms / 1000}s · concurrency {p.concurrency_limit}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <button type="button" onClick={() => void testJudge(p)} disabled={testing === p.profile_id}
                      className="inline-flex h-7 items-center gap-1 rounded border border-line px-2 text-xs text-muted hover:border-brand hover:text-brand">
                      {testing === p.profile_id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Zap className="h-3 w-3" />}
                      Test
                    </button>
                    <button type="button" onClick={() => openEditJudge(p)}
                      className="inline-flex h-7 items-center gap-1 rounded border border-line px-2 text-xs text-muted hover:border-brand hover:text-brand">
                      <Pencil className="h-3 w-3" />Edit
                    </button>
                    <button type="button" onClick={() => void deleteJudge(p)} aria-label="Delete"
                      className="inline-flex h-7 w-7 items-center justify-center rounded border border-line text-muted hover:border-red-300 hover:text-red-500">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
                {testResult?.profileId === p.profile_id && (
                  <div className={`mt-3 flex items-center gap-2 rounded border px-3 py-2 text-sm ${testResult.ok ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-red-200 bg-red-50 text-red-700"}`}>
                    {testResult.ok ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <AlertCircle className="h-4 w-4 shrink-0" />}
                    {testResult.message}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Scoring profiles */}
      <section className="mt-4 overflow-hidden rounded border border-line bg-white shadow-soft">
        <SectionHeader
          icon={SlidersHorizontal}
          title="Scoring profiles"
          count={scoringLoading ? undefined : scoringProfiles.length}
          onAdd={openAddScoring}
          onReload={reloadScoring}
        />
        {scoringLoadError && <div className="border-b border-line px-5 py-3"><ErrorBanner message={scoringLoadError} /></div>}
        {scoringLoading ? (
          <div className="flex items-center justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-muted" /></div>
        ) : scoringProfiles.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-muted">
            No scoring profiles yet.{" "}
            <button onClick={openAddScoring} className="font-medium text-brand underline underline-offset-2">Add the first profile</button>
          </p>
        ) : (
          <div className="divide-y divide-line">
            {scoringProfiles.map((p) => (
              <div key={p.profile_id} className="flex items-start justify-between gap-4 px-5 py-4">
                <div>
                  <p className="font-medium">{p.profile_id}</p>
                  <p className="mt-0.5 text-sm text-muted">
                    Relevancy ≥ {p.answer_relevancy_threshold} · Grounding ≥ {p.grounding_threshold}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <button type="button" onClick={() => openEditScoring(p)}
                    className="inline-flex h-7 items-center gap-1 rounded border border-line px-2 text-xs text-muted hover:border-brand hover:text-brand">
                    <Pencil className="h-3 w-3" />Edit
                  </button>
                  <button type="button" onClick={() => void deleteScoring(p)} aria-label="Delete"
                    className="inline-flex h-7 w-7 items-center justify-center rounded border border-line text-muted hover:border-red-300 hover:text-red-500">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Judge profile modal */}
      {judgeModal !== null && (
        <Modal
          title={judgeModal === "add" ? "Add judge profile" : `Edit ${(judgeModal as JudgeProfile).profile_id}`}
          onClose={() => setJudgeModal(null)}
          onSave={() => void saveJudge()}
          saving={judgeSaving}
          saveError={judgeSaveError}
        >
          <div className="grid grid-cols-2 gap-4">
            <Field label="Profile ID">
              <TextInput value={judgeForm.profile_id} onChange={(v) => setJF("profile_id", v)} placeholder="e.g. default" readOnly={judgeModal !== "add"} />
            </Field>
            <Field label="Provider">
              <select value={judgeForm.provider} onChange={(e) => setJF("provider", e.target.value)}
                className="mt-1.5 h-10 w-full rounded border border-line bg-white px-3 text-sm focus:border-brand focus:outline-none">
                <option value="ollama_openai_compatible">Ollama (OpenAI-compatible)</option>
                <option value="custom_openai_compatible">Custom OpenAI-compatible</option>
                <option value="azure_openai">Azure OpenAI</option>
              </select>
            </Field>
            <Field label="Base URL" className="col-span-2">
              <TextInput value={judgeForm.base_url} onChange={(v) => setJF("base_url", v)} placeholder="http://127.0.0.1:11434/v1" />
            </Field>
            <Field label="Model">
              <TextInput value={judgeForm.model} onChange={(v) => setJF("model", v)} placeholder="e.g. llama3.2:3b" />
            </Field>
            <Field label="API key (testing phase)">
              <TextInput value={judgeForm.api_key_reference} onChange={(v) => setJF("api_key_reference", v)} placeholder="e.g. ollama" type="password" />
            </Field>
            <Field label="Temperature (0–2)">
              <TextInput value={judgeForm.temperature} onChange={(v) => setJF("temperature", v)} type="number" />
            </Field>
            <Field label="Timeout (ms)">
              <TextInput value={judgeForm.timeout_ms} onChange={(v) => setJF("timeout_ms", v)} type="number" />
            </Field>
            <Field label="Max tokens (optional)">
              <TextInput value={judgeForm.max_tokens} onChange={(v) => setJF("max_tokens", v)} placeholder="Leave blank for model default" type="number" />
            </Field>
            <Field label="Concurrency limit (1–10)">
              <TextInput value={judgeForm.concurrency_limit} onChange={(v) => setJF("concurrency_limit", v)} type="number" />
            </Field>
            <Field label="Prompt version" className="col-span-2">
              <TextInput value={judgeForm.prompt_version} onChange={(v) => setJF("prompt_version", v)} placeholder="v1" />
            </Field>
          </div>
        </Modal>
      )}

      {/* Scoring profile modal */}
      {scoringModal !== null && (
        <Modal
          title={scoringModal === "add" ? "Add scoring profile" : `Edit ${(scoringModal as ScoringProfile).profile_id}`}
          onClose={() => setScoringModal(null)}
          onSave={() => void saveScoring()}
          saving={scoringSaving}
          saveError={scoringSaveError}
        >
          <div className="grid grid-cols-2 gap-4">
            <Field label="Profile ID" className="col-span-2">
              <TextInput value={scoringForm.profile_id} onChange={(v) => setSF("profile_id", v)} placeholder="e.g. default" readOnly={scoringModal !== "add"} />
            </Field>
            <Field label="Answer relevancy threshold (0–1)">
              <TextInput value={scoringForm.answer_relevancy_threshold} onChange={(v) => setSF("answer_relevancy_threshold", v)} type="number" />
            </Field>
            <Field label="Grounding threshold (0–1)">
              <TextInput value={scoringForm.grounding_threshold} onChange={(v) => setSF("grounding_threshold", v)} type="number" />
            </Field>
            <Field label="Judge prompt template" className="col-span-2">
              <textarea value={scoringForm.prompt_template} onChange={(e) => setSF("prompt_template", e.target.value)}
                rows={8} className="mt-1.5 w-full rounded border border-line bg-white px-3 py-2 text-sm focus:border-brand focus:outline-none" />
            </Field>
          </div>
        </Modal>
      )}
    </>
  );
}
