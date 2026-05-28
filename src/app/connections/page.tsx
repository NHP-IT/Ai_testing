import { ConnectivityChecker } from "@/app/connections/connectivity-checker";
import { EmptyPanel } from "@/components/empty-panel";
import { PageHeader } from "@/components/page-header";
import { testingConnections } from "@/lib/testingConnections";

export default function ConnectionsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Stage 3"
        title="Testing connections"
        description="The web app now has server-side helpers for Fabric REST, OneLake DFS, notebook jobs, SQL reads, Direct Line, and the local Ollama judge. Live checks are run manually."
      />

      <div className="grid gap-4 xl:grid-cols-[0.85fr_1.15fr]">
        <section className="rounded border border-line bg-white p-5 shadow-soft">
          <h3 className="text-base font-semibold">Configured real values</h3>
          <dl className="mt-4 space-y-3 text-sm">
            <div>
              <dt className="font-medium text-slate-700">Workspace ID</dt>
              <dd className="mt-1 break-all text-muted">
                {testingConnections.fabric.workspaceId}
              </dd>
            </div>
            <div>
              <dt className="font-medium text-slate-700">Lakehouse ID</dt>
              <dd className="mt-1 break-all text-muted">
                {testingConnections.lakehouse.id}
              </dd>
            </div>
            <div>
              <dt className="font-medium text-slate-700">OneLake app root</dt>
              <dd className="mt-1 break-all text-muted">
                {testingConnections.oneLake.appRootUrl}
              </dd>
            </div>
            <div>
              <dt className="font-medium text-slate-700">Agent</dt>
              <dd className="mt-1 text-muted">
                {testingConnections.copilotAgents.sparky.displayName} (
                {testingConnections.copilotAgents.sparky.agentId})
              </dd>
            </div>
            <div>
              <dt className="font-medium text-slate-700">Judge</dt>
              <dd className="mt-1 text-muted">
                {testingConnections.judge.model} at{" "}
                {testingConnections.judge.localBaseUrl}
              </dd>
            </div>
          </dl>
        </section>

        <ConnectivityChecker />
      </div>

      <div className="mt-4">
        <EmptyPanel
          title="Known missing live values"
          body="The previous notebooks do not contain the final web-app service-principal client secret, the Lakehouse SQL analytics endpoint string, or the final response-capture and merge notebook IDs. Those checks report Not configured until real values are added."
        />
      </div>
    </>
  );
}
