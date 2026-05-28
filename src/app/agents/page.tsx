import { Bot, Plus } from "lucide-react";
import { EmptyPanel } from "@/components/empty-panel";
import { PageHeader } from "@/components/page-header";

const columns = [
  "Agent ID",
  "Display name",
  "Connection mode",
  "Business area",
  "Owner",
  "Status"
];

export default function AgentsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Agent registry"
        title="Copilot Studio agents"
        description="This route is the registry workspace for adding, editing, and validating Copilot Studio agents. Persistence lands in Stage 4 after the OneLake access layer is built."
        actions={
          <button
            type="button"
            disabled
            className="inline-flex h-10 items-center gap-2 rounded border border-line bg-panel px-4 text-sm font-semibold text-muted"
          >
            <Plus aria-hidden className="h-4 w-4" />
            Add agent
          </button>
        }
      />

      <section className="overflow-hidden rounded border border-line bg-white shadow-soft">
        <div className="border-b border-line px-5 py-4">
          <div className="flex items-center gap-2">
            <Bot aria-hidden className="h-5 w-5 text-brand" />
            <h3 className="text-base font-semibold">Registry table</h3>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-line text-sm">
            <thead className="bg-panel">
              <tr>
                {columns.map((column) => (
                  <th
                    key={column}
                    scope="col"
                    className="px-4 py-3 text-left font-semibold text-slate-700"
                  >
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan={columns.length} className="px-4 py-8">
                  <EmptyPanel
                    title="Registry storage not connected yet"
                    body="Stage 4 will back this table with OneLake config/agents.json and ETag-protected writes. Stage 1 keeps the table shape in place without inventing agent rows."
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
