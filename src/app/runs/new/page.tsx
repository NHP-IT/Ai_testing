import { FileUp, PlayCircle } from "lucide-react";
import { EmptyPanel } from "@/components/empty-panel";
import { PageHeader } from "@/components/page-header";

const requiredColumns = [
  "test_id",
  "agent_id",
  "suite",
  "frequency",
  "severity",
  "question"
];

export default function NewRunPage() {
  return (
    <>
      <PageHeader
        eyebrow="Run creation"
        title="Upload CSV questions"
        description="Create an on-demand evaluation run from question-only CSV files. Stage 6 will add parsing, validation, OneLake staging, and Fabric notebook triggering."
        actions={
          <button
            type="button"
            disabled
            className="inline-flex h-10 items-center gap-2 rounded bg-slate-300 px-4 text-sm font-semibold text-white"
          >
            <PlayCircle aria-hidden className="h-4 w-4" />
            Start run
          </button>
        }
      />

      <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <section className="rounded border border-line bg-white p-5 shadow-soft">
          <div className="flex items-center gap-2">
            <FileUp aria-hidden className="h-5 w-5 text-brand" />
            <h3 className="text-base font-semibold">CSV upload</h3>
          </div>
          <div className="mt-5 rounded border border-dashed border-line bg-panel p-6 text-center">
            <p className="text-sm font-medium">Upload is enabled in Stage 6</p>
            <p className="mt-2 text-sm leading-6 text-muted">
              The route is in place now so the workflow can be wired without
              changing navigation.
            </p>
          </div>
        </section>

        <section className="rounded border border-line bg-white p-5 shadow-soft">
          <h3 className="text-base font-semibold">Required columns</h3>
          <div className="mt-4 flex flex-wrap gap-2">
            {requiredColumns.map((column) => (
              <span
                key={column}
                className="rounded border border-line bg-panel px-3 py-2 text-sm font-medium"
              >
                {column}
              </span>
            ))}
          </div>
          <p className="mt-4 text-sm leading-6 text-muted">
            Expected answers are not required. The judge LLM will generate a
            reference answer from source-of-truth context during scoring.
          </p>
        </section>
      </div>

      <div className="mt-4">
        <EmptyPanel
          title="Validation preview"
          body="Stage 6 will show row-level validation errors for missing fields, duplicate keys, unknown agents, missing corpus, and invalid source filters."
        />
      </div>
    </>
  );
}
