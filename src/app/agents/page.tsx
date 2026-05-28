"use client";

import { useState, useEffect } from "react";
import {
  Bot,
  Plus,
  Pencil,
  Loader2,
  AlertCircle,
  RefreshCw,
  Trash2,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import type { AgentConfig } from "@/lib/schemas/agent";

// ---------------------------------------------------------------------------
// Form helpers
// ---------------------------------------------------------------------------

type FormState = {
  agent_id: string;
  display_name: string;
  enabled: boolean;
  business_area: string;
  owner: string;
  schema_name: string;
  environment_id: string;
  bot_id: string;
  direct_line_secret: string;
  answer_relevancy: string;
  grounding: string;
  ms_eval_enabled: boolean;
  ms_eval_test_set_ids: string;
  ms_eval_api_version: string;
  ms_eval_mcs_connection_id: string;
};

const DEFAULT_FORM: FormState = {
  agent_id: "",
  display_name: "",
  enabled: true,
  business_area: "",
  owner: "",
  schema_name: "",
  environment_id: "",
  bot_id: "",
  direct_line_secret: "",
  answer_relevancy: "0.7",
  grounding: "0.7",
  ms_eval_enabled: false,
  ms_eval_test_set_ids: "",
  ms_eval_api_version: "2024-10-01",
  ms_eval_mcs_connection_id: ""
};

function agentToForm(a: AgentConfig): FormState {
  return {
    agent_id: a.agent_id,
    display_name: a.display_name,
    enabled: a.enabled,
    business_area: a.business_area,
    owner: a.owner,
    schema_name: a.schema_name,
    environment_id: a.environment_id,
    bot_id: a.bot_id,
    direct_line_secret: a.direct_line_secret ?? "",
    answer_relevancy: String(a.ragas_thresholds.answer_relevancy),
    grounding: String(a.ragas_thresholds.grounding),
    ms_eval_enabled: a.ms_eval_enabled,
    ms_eval_test_set_ids: (a.ms_eval_test_set_ids ?? []).join(", "),
    ms_eval_api_version: a.ms_eval_api_version ?? "2024-10-01",
    ms_eval_mcs_connection_id: a.ms_eval_mcs_connection_id ?? ""
  };
}

function formToPayload(f: FormState): Record<string, unknown> {
  return {
    agent_id: f.agent_id,
    display_name: f.display_name,
    enabled: f.enabled,
    platform: "copilot_studio",
    connection_mode: "direct_line_secret",
    business_area: f.business_area,
    owner: f.owner,
    schema_name: f.schema_name,
    environment_id: f.environment_id,
    bot_id: f.bot_id,
    ...(f.direct_line_secret ? { direct_line_secret: f.direct_line_secret } : {}),
    deterministic_rules: [],
    ragas_thresholds: {
      answer_relevancy: parseFloat(f.answer_relevancy) || 0.7,
      grounding: parseFloat(f.grounding) || 0.7
    },
    ms_eval_enabled: f.ms_eval_enabled,
    ms_eval_test_set_ids: f.ms_eval_test_set_ids
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
    ms_eval_api_version: f.ms_eval_api_version || "2024-10-01",
    ...(f.ms_eval_mcs_connection_id
      ? { ms_eval_mcs_connection_id: f.ms_eval_mcs_connection_id }
      : {})
  };
}

// ---------------------------------------------------------------------------
// Small reusable pieces
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

function Input({
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

function Toggle({
  checked,
  onChange,
  label
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-3">
      <div
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative h-5 w-9 rounded-full transition-colors ${
          checked ? "bg-brand" : "bg-slate-300"
        }`}
      >
        <span
          className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${
            checked ? "translate-x-4" : "translate-x-0.5"
          }`}
        />
      </div>
      <span className="text-sm">{label}</span>
    </label>
  );
}

function EnabledBadge({ enabled }: { enabled: boolean }) {
  return (
    <span
      className={`inline-flex items-center rounded border px-2 py-0.5 text-xs font-medium ${
        enabled
          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
          : "border-slate-200 bg-slate-50 text-slate-500"
      }`}
    >
      {enabled ? "Enabled" : "Disabled"}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

type ModalMode = "add" | AgentConfig;

export default function AgentsPage() {
  const [fetchKey, setFetchKey] = useState(0);
  const [agents, setAgents] = useState<AgentConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [modal, setModal] = useState<ModalMode | null>(null);
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [showMsEval, setShowMsEval] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [toggling, setToggling] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function doLoad() {
      try {
        const r = await fetch("/api/agents");
        const body = (await r.json()) as { agents?: AgentConfig[]; error?: string };
        if (!r.ok) throw new Error(body.error ?? `HTTP ${r.status}`);
        if (!cancelled) {
          setAgents(body.agents ?? []);
          setLoadError(null);
        }
      } catch (err: unknown) {
        if (!cancelled)
          setLoadError(err instanceof Error ? err.message : String(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void doLoad();
    return () => { cancelled = true; };
  }, [fetchKey]);

  function triggerReload() {
    setLoading(true);
    setLoadError(null);
    setFetchKey((n) => n + 1);
  }

  function openAdd() {
    setForm(DEFAULT_FORM);
    setShowMsEval(false);
    setSaveError(null);
    setModal("add");
  }

  function openEdit(agent: AgentConfig) {
    setForm(agentToForm(agent));
    setShowMsEval(agent.ms_eval_enabled);
    setSaveError(null);
    setModal(agent);
  }

  function closeModal() {
    setModal(null);
    setSaveError(null);
  }

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function save() {
    setSaving(true);
    setSaveError(null);
    const isAdd = modal === "add";
    const agentId = isAdd ? null : (modal as AgentConfig).agent_id;
    const url = isAdd ? "/api/agents" : `/api/agents/${agentId}`;
    try {
      const res = await fetch(url, {
        method: isAdd ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formToPayload(form))
      });
      const body = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(body.error ?? `HTTP ${res.status}`);
      closeModal();
      triggerReload();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  async function toggleEnabled(agent: AgentConfig) {
    setToggling(agent.agent_id);
    try {
      const res = await fetch(`/api/agents/${agent.agent_id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !agent.enabled })
      });
      const body = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(body.error ?? `HTTP ${res.status}`);
      setAgents((prev) =>
        prev.map((a) => (a.agent_id === agent.agent_id ? { ...a, enabled: !a.enabled } : a))
      );
    } catch (err) {
      alert(err instanceof Error ? err.message : String(err));
    } finally {
      setToggling(null);
    }
  }

  async function deleteAgent(agent: AgentConfig) {
    if (!confirm(`Remove agent '${agent.display_name}'? This cannot be undone.`)) return;
    setDeleting(agent.agent_id);
    try {
      const res = await fetch(`/api/agents/${agent.agent_id}`, { method: "DELETE" });
      if (!res.ok) {
        const body = (await res.json()) as { error?: string };
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      setAgents((prev) => prev.filter((a) => a.agent_id !== agent.agent_id));
    } catch (err) {
      alert(err instanceof Error ? err.message : String(err));
    } finally {
      setDeleting(null);
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Agent registry"
        title="Copilot Studio agents"
        description="Add and manage agents. Configuration is persisted to OneLake — the connectivity checker shows whether OneLake is reachable."
        actions={
          <button
            type="button"
            onClick={openAdd}
            className="inline-flex h-10 items-center gap-2 rounded border border-brand bg-brand px-4 text-sm font-semibold text-white hover:bg-teal-700"
          >
            <Plus aria-hidden className="h-4 w-4" />
            Add agent
          </button>
        }
      />

      {/* Table */}
      <section className="overflow-hidden rounded border border-line bg-white shadow-soft">
        <div className="flex items-center gap-2 border-b border-line px-5 py-4">
          <Bot aria-hidden className="h-5 w-5 text-brand" />
          <h3 className="text-base font-semibold">Registry</h3>
          {!loading && (
            <span className="ml-1 text-sm text-muted">
              {agents.length} agent{agents.length !== 1 ? "s" : ""}
            </span>
          )}
          <button
            type="button"
            onClick={triggerReload}
            className="ml-auto text-muted hover:text-ink"
            aria-label="Reload"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>

        {loadError && (
          <div className="flex items-start gap-3 border-b border-line bg-red-50 px-5 py-4 text-sm text-red-700">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              Could not load agents: <span className="font-medium">{loadError}</span>
            </span>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-line text-sm">
            <thead className="bg-panel">
              <tr>
                {["Agent ID", "Display name", "Business area", "Owner", "Track B", "Status", ""].map(
                  (col) => (
                    <th
                      key={col}
                      scope="col"
                      className="px-4 py-3 text-left font-semibold text-slate-700"
                    >
                      {col}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-muted">
                    <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                  </td>
                </tr>
              ) : agents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-sm text-muted">
                    No agents yet.{" "}
                    <button
                      onClick={openAdd}
                      className="font-medium text-brand underline underline-offset-2"
                    >
                      Add the first agent
                    </button>
                  </td>
                </tr>
              ) : (
                agents.map((agent) => (
                  <tr key={agent.agent_id} className="hover:bg-panel/60">
                    <td className="px-4 py-3 font-mono text-xs">{agent.agent_id}</td>
                    <td className="px-4 py-3 font-medium">{agent.display_name}</td>
                    <td className="px-4 py-3 text-muted">{agent.business_area}</td>
                    <td className="px-4 py-3 text-muted">{agent.owner}</td>
                    <td className="px-4 py-3">
                      {agent.ms_eval_enabled ? (
                        <span className="inline-flex items-center rounded border border-blue-200 bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                          On
                        </span>
                      ) : (
                        <span className="text-xs text-muted">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => void toggleEnabled(agent)}
                        disabled={toggling === agent.agent_id}
                        className="flex items-center gap-1.5"
                      >
                        {toggling === agent.agent_id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin text-muted" />
                        ) : (
                          <EnabledBadge enabled={agent.enabled} />
                        )}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => openEdit(agent)}
                          className="inline-flex h-7 items-center gap-1 rounded border border-line px-2 text-xs text-muted hover:border-brand hover:text-brand"
                        >
                          <Pencil className="h-3 w-3" />
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => void deleteAgent(agent)}
                          disabled={deleting === agent.agent_id}
                          className="inline-flex h-7 w-7 items-center justify-center rounded border border-line text-muted hover:border-red-300 hover:text-red-500"
                          aria-label="Delete"
                        >
                          {deleting === agent.agent_id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Modal */}
      {modal !== null && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 pt-16">
          <div className="w-full max-w-2xl rounded-lg border border-line bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-line px-6 py-4">
              <h2 className="text-base font-semibold">
                {modal === "add" ? "Add agent" : `Edit ${(modal as AgentConfig).display_name}`}
              </h2>
              <button onClick={closeModal} className="text-muted hover:text-ink" aria-label="Close">
                ✕
              </button>
            </div>

            <div className="space-y-6 px-6 py-5">
              {saveError && (
                <div className="flex items-start gap-2 rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  {saveError}
                </div>
              )}

              <fieldset>
                <legend className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">
                  Basic
                </legend>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Agent ID">
                    <Input
                      value={form.agent_id}
                      onChange={(v) => setField("agent_id", v)}
                      placeholder="e.g. sparky"
                      readOnly={modal !== "add"}
                    />
                  </Field>
                  <Field label="Display name">
                    <Input
                      value={form.display_name}
                      onChange={(v) => setField("display_name", v)}
                      placeholder="e.g. Sparky"
                    />
                  </Field>
                  <Field label="Business area">
                    <Input
                      value={form.business_area}
                      onChange={(v) => setField("business_area", v)}
                      placeholder="e.g. Technical Support"
                    />
                  </Field>
                  <Field label="Owner">
                    <Input
                      value={form.owner}
                      onChange={(v) => setField("owner", v)}
                      placeholder="e.g. BI & AI Team"
                    />
                  </Field>
                  <Field label="" className="col-span-2 pt-1">
                    <Toggle
                      checked={form.enabled}
                      onChange={(v) => setField("enabled", v)}
                      label="Enabled"
                    />
                  </Field>
                </div>
              </fieldset>

              <fieldset>
                <legend className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">
                  Copilot Studio connection
                </legend>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Schema name">
                    <Input
                      value={form.schema_name}
                      onChange={(v) => setField("schema_name", v)}
                      placeholder="e.g. cr578_Productsagent"
                    />
                  </Field>
                  <Field label="Environment ID (GUID)">
                    <Input
                      value={form.environment_id}
                      onChange={(v) => setField("environment_id", v)}
                      placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                    />
                  </Field>
                  <Field label="Bot ID (GUID)">
                    <Input
                      value={form.bot_id}
                      onChange={(v) => setField("bot_id", v)}
                      placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                    />
                  </Field>
                  <Field label="Direct Line secret">
                    <Input
                      value={form.direct_line_secret}
                      onChange={(v) => setField("direct_line_secret", v)}
                      placeholder="Testing-phase secret"
                      type="password"
                    />
                  </Field>
                </div>
              </fieldset>

              <fieldset>
                <legend className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">
                  Track A scoring thresholds
                </legend>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Answer relevancy (0–1)">
                    <Input
                      value={form.answer_relevancy}
                      onChange={(v) => setField("answer_relevancy", v)}
                      type="number"
                    />
                  </Field>
                  <Field label="Grounding (0–1)">
                    <Input
                      value={form.grounding}
                      onChange={(v) => setField("grounding", v)}
                      type="number"
                    />
                  </Field>
                </div>
              </fieldset>

              <fieldset>
                <button
                  type="button"
                  onClick={() => setShowMsEval((v) => !v)}
                  className="flex w-full items-center justify-between text-xs font-semibold uppercase tracking-wide text-muted"
                >
                  <span>Track B — Microsoft native evaluation</span>
                  {showMsEval ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </button>
                {showMsEval ? (
                  <div className="mt-3 grid grid-cols-2 gap-4">
                    <Field label="" className="col-span-2 pt-1">
                      <Toggle
                        checked={form.ms_eval_enabled}
                        onChange={(v) => setField("ms_eval_enabled", v)}
                        label="Enable Microsoft native evaluation (Track B)"
                      />
                    </Field>
                    <Field label="Test set IDs (comma-separated)" className="col-span-2">
                      <Input
                        value={form.ms_eval_test_set_ids}
                        onChange={(v) => setField("ms_eval_test_set_ids", v)}
                        placeholder="Leave blank to run all active test sets"
                      />
                    </Field>
                    <Field label="API version">
                      <Input
                        value={form.ms_eval_api_version}
                        onChange={(v) => setField("ms_eval_api_version", v)}
                      />
                    </Field>
                    <Field label="MCS connection ID (optional)">
                      <Input
                        value={form.ms_eval_mcs_connection_id}
                        onChange={(v) => setField("ms_eval_mcs_connection_id", v)}
                        placeholder="Optional Direct Line channel override"
                      />
                    </Field>
                  </div>
                ) : (
                  <p className="mt-1 text-xs text-muted">
                    Expand to configure Microsoft Copilot Studio native evaluation.
                  </p>
                )}
              </fieldset>
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-line px-6 py-4">
              <button
                type="button"
                onClick={closeModal}
                className="h-9 rounded border border-line px-4 text-sm text-muted hover:text-ink"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void save()}
                disabled={saving}
                className="inline-flex h-9 items-center gap-2 rounded bg-brand px-4 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-60"
              >
                {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {modal === "add" ? "Add agent" : "Save changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
