"use client";

import { useState } from "react";
import { PlugZap, RefreshCw } from "lucide-react";
import type { ConnectivityCheck } from "@/lib/fabric/connectivity";

type ConnectivityResponse = {
  checked_at: string;
  checks: ConnectivityCheck[];
};

const stateStyles: Record<ConnectivityCheck["state"], string> = {
  pass: "border-emerald-200 bg-emerald-50 text-emerald-800",
  fail: "border-red-200 bg-red-50 text-red-800",
  not_configured: "border-amber-200 bg-amber-50 text-amber-800"
};

const stateLabels: Record<ConnectivityCheck["state"], string> = {
  pass: "Pass",
  fail: "Fail",
  not_configured: "Not configured"
};

export function ConnectivityChecker() {
  const [result, setResult] = useState<ConnectivityResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function runChecks() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/connectivity", {
        method: "POST"
      });

      if (!response.ok) {
        throw new Error(`Connectivity check failed with ${response.status}`);
      }

      setResult((await response.json()) as ConnectivityResponse);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rounded border border-line bg-white p-5 shadow-soft">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <PlugZap aria-hidden className="h-5 w-5 text-brand" />
          <h3 className="text-base font-semibold">Connectivity checks</h3>
        </div>
        <button
          type="button"
          onClick={runChecks}
          disabled={loading}
          className="inline-flex h-10 items-center justify-center gap-2 rounded bg-brand px-4 text-sm font-semibold text-white disabled:bg-slate-300"
        >
          <RefreshCw
            aria-hidden
            className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
          />
          {loading ? "Checking" : "Run checks"}
        </button>
      </div>

      {error ? (
        <div className="mt-4 rounded border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {error}
        </div>
      ) : null}

      {result ? (
        <div className="mt-5">
          <p className="text-sm text-muted">Checked at {result.checked_at}</p>
          <div className="mt-4 divide-y divide-line overflow-hidden rounded border border-line">
            {result.checks.map((check) => (
              <div
                key={check.id}
                className="grid gap-3 bg-white p-4 sm:grid-cols-[220px_160px_1fr] sm:items-start"
              >
                <p className="text-sm font-semibold">{check.label}</p>
                <span
                  className={`inline-flex w-fit rounded border px-2 py-1 text-xs font-medium ${stateStyles[check.state]}`}
                >
                  {stateLabels[check.state]}
                </span>
                <p className="text-sm leading-6 text-muted">{check.message}</p>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <p className="mt-4 text-sm leading-6 text-muted">
          Checks are manual so Direct Line token generation, local Ollama access,
          and Fabric auth calls only happen when requested.
        </p>
      )}
    </section>
  );
}
