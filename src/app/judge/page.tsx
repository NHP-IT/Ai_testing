import { Gauge, Server, SlidersHorizontal } from "lucide-react";
import { EmptyPanel } from "@/components/empty-panel";
import { PageHeader } from "@/components/page-header";

export default function JudgePage() {
  return (
    <>
      <PageHeader
        eyebrow="Judge settings"
        title="LLM and RAGAS scoring"
        description="Configure the proof-of-concept Ollama judge and scoring thresholds here. Stage 1 renders the workspace; Stage 4 wires persisted profiles and connection testing."
      />

      <div className="grid gap-4 xl:grid-cols-2">
        <section className="rounded border border-line bg-white p-5 shadow-soft">
          <div className="flex items-center gap-2">
            <Server aria-hidden className="h-5 w-5 text-brand" />
            <h3 className="text-base font-semibold">Judge server</h3>
          </div>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-sm font-medium">Provider</span>
              <select
                disabled
                className="mt-2 h-10 w-full rounded border border-line bg-panel px-3 text-sm text-muted"
              >
                <option>Not connected</option>
              </select>
            </label>
            <label className="block">
              <span className="text-sm font-medium">Model</span>
              <input
                disabled
                className="mt-2 h-10 w-full rounded border border-line bg-panel px-3 text-sm"
              />
            </label>
            <label className="block sm:col-span-2">
              <span className="text-sm font-medium">Base URL</span>
              <input
                disabled
                className="mt-2 h-10 w-full rounded border border-line bg-panel px-3 text-sm"
              />
            </label>
          </div>
        </section>

        <section className="rounded border border-line bg-white p-5 shadow-soft">
          <div className="flex items-center gap-2">
            <SlidersHorizontal aria-hidden className="h-5 w-5 text-brand" />
            <h3 className="text-base font-semibold">Scoring controls</h3>
          </div>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-sm font-medium">Relevancy threshold</span>
              <input
                disabled
                type="number"
                className="mt-2 h-10 w-full rounded border border-line bg-panel px-3 text-sm"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium">Grounding threshold</span>
              <input
                disabled
                type="number"
                className="mt-2 h-10 w-full rounded border border-line bg-panel px-3 text-sm"
              />
            </label>
          </div>
        </section>
      </div>

      <div className="mt-4">
        <EmptyPanel
          title="Calibration mini-run"
          body="The calibration panel will use the same retrieval path as production scoring. It is intentionally gated until corpus retrieval and judge connection testing are implemented."
        >
          <div className="inline-flex items-center gap-2 rounded border border-line bg-white px-3 py-2 text-sm text-muted">
            <Gauge aria-hidden className="h-4 w-4" />
            Awaiting Stage 4 and Stage 5 integrations
          </div>
        </EmptyPanel>
      </div>
    </>
  );
}
