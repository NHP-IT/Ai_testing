import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight, FileText } from "lucide-react";
import { EmptyPanel } from "@/components/empty-panel";
import { PageHeader } from "@/components/page-header";
import { StatusPill } from "@/components/status-pill";
import { implementationStages, stageOneRoutes } from "@/lib/stage-data";

export default function DashboardPage() {
  return (
    <>
      <PageHeader
        eyebrow="Stage 1"
        title="Evaluation workspace"
        description="The app shell is ready for the Copilot Studio evaluation workflow. Fabric, OneLake, Direct Line, and judge integrations are intentionally gated to later stages."
        actions={
          <Link
            href="/runs/new"
            className="inline-flex h-10 items-center gap-2 rounded bg-brand px-4 text-sm font-semibold text-white"
          >
            New run
            <ArrowRight aria-hidden className="h-4 w-4" />
          </Link>
        }
      />

      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded border border-line bg-white p-5 shadow-soft">
          <div className="flex items-center gap-2">
            <FileText aria-hidden className="h-5 w-5 text-brand" />
            <h3 className="text-base font-semibold">Implementation stages</h3>
          </div>
          <div className="mt-4 divide-y divide-line">
            {implementationStages.map((item) => (
              <div
                key={item.stage}
                className="grid gap-3 py-4 sm:grid-cols-[110px_1fr_auto] sm:items-start"
              >
                <p className="text-sm font-semibold text-slate-800">
                  {item.stage}
                </p>
                <div>
                  <p className="text-sm font-semibold">{item.name}</p>
                  <p className="mt-1 text-sm leading-6 text-muted">
                    {item.summary}
                  </p>
                </div>
                <StatusPill status={item.status} />
              </div>
            ))}
          </div>
        </section>

        <section className="rounded border border-line bg-white p-5 shadow-soft">
          <h3 className="text-base font-semibold">Route coverage</h3>
          <div className="mt-4 space-y-3">
            {stageOneRoutes.map((route) => {
              const content: ReactNode = (
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold">{route.name}</p>
                    <p className="mt-1 text-sm leading-6 text-muted">
                      {route.summary}
                    </p>
                  </div>
                  <StatusPill status={route.status} />
                </div>
              );

              return route.href.includes("[") ? (
                <div
                  key={route.href}
                  className="block rounded border border-line bg-panel p-4"
                >
                  {content}
                </div>
              ) : (
                <Link
                  key={route.href}
                  href={route.href}
                  className="block rounded border border-line bg-panel p-4 hover:bg-white"
                >
                  {content}
                </Link>
              );
            })}
          </div>
        </section>
      </div>

      <div className="mt-4">
        <EmptyPanel
          title="Current data state"
          body="No Fabric data is loaded in Stage 1. The app renders independently so later stages can add server-side integrations without changing the route structure."
        />
      </div>
    </>
  );
}
