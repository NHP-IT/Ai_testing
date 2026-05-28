import { Database, Upload } from "lucide-react";
import { EmptyPanel } from "@/components/empty-panel";
import { PageHeader } from "@/components/page-header";

export default function CorpusPage() {
  return (
    <>
      <PageHeader
        eyebrow="Source of truth"
        title="Corpus management"
        description="Manage the source material used to generate reference answers and grounding scores. Stage 5 will write per-agent chunks to OneLake."
        actions={
          <button
            type="button"
            disabled
            className="inline-flex h-10 items-center gap-2 rounded border border-line bg-panel px-4 text-sm font-semibold text-muted"
          >
            <Upload aria-hidden className="h-4 w-4" />
            Upload source
          </button>
        }
      />

      <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <EmptyPanel
          title="Supported V1 inputs"
          body="The planned V1 corpus accepts text, markdown, CSV, and pasted content. PDF ingestion is intentionally outside Stage 1."
        />
        <section className="rounded border border-line bg-white p-5 shadow-soft">
          <div className="flex items-center gap-2">
            <Database aria-hidden className="h-5 w-5 text-brand" />
            <h3 className="text-base font-semibold">Chunk preview</h3>
          </div>
          <p className="mt-2 text-sm leading-6 text-muted">
            Once corpus ingestion is wired, this area will show the top chunks
            used by `source_filter` and calibration mini-runs.
          </p>
        </section>
      </div>
    </>
  );
}
