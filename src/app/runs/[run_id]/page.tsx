import { RefreshCw } from "lucide-react";
import { EmptyPanel } from "@/components/empty-panel";
import { PageHeader } from "@/components/page-header";

export default async function RunDetailPage({
  params
}: {
  params: Promise<{ run_id: string }>;
}) {
  const { run_id } = await params;

  return (
    <>
      <PageHeader
        eyebrow="Run detail"
        title={`Run ${run_id}`}
        description="This page is URL-addressable so a run can be refreshed, bookmarked, or shared. Stage 6 will reconstruct state from OneLake and Delta on load."
        actions={
          <button
            type="button"
            disabled
            className="inline-flex h-10 items-center gap-2 rounded border border-line bg-panel px-4 text-sm font-semibold text-muted"
          >
            <RefreshCw aria-hidden className="h-4 w-4" />
            Refresh
          </button>
        }
      />

      <div className="grid gap-4 xl:grid-cols-3">
        <EmptyPanel
          title="Capture status"
          body="Fabric response-capture job status will appear here after Stage 6 and Stage 7 are implemented."
        />
        <EmptyPanel
          title="Scoring status"
          body="Per-test-case judge scoring and recovery state will appear here after Stage 8 is implemented."
        />
        <EmptyPanel
          title="Delta merge"
          body="The lightweight merge notebook status will appear here after Stage 9 is implemented."
        />
      </div>

      <section className="mt-4 rounded border border-line bg-white p-5 shadow-soft">
        <h3 className="text-base font-semibold">Results</h3>
        <p className="mt-2 text-sm leading-6 text-muted">
          Final rows from `agent_eval_results` will be loaded through the
          read-only Lakehouse SQL analytics endpoint in a later stage.
        </p>
      </section>
    </>
  );
}
