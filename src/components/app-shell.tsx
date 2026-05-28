"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { appRoutes } from "@/lib/routes";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-white text-ink">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-line bg-panel lg:block">
        <div className="border-b border-line px-5 py-5">
          <p className="text-sm font-semibold text-brand">NHP AI Testing</p>
          <h1 className="mt-1 text-xl font-semibold">Agent Evaluation</h1>
        </div>
        <nav className="space-y-1 p-3" aria-label="Primary navigation">
          {appRoutes.map((route) => {
            const Icon = route.icon;
            const active =
              route.href === "/"
                ? pathname === route.href
                : pathname.startsWith(route.href.replace("/example", ""));

            return (
              <Link
                key={route.href}
                href={route.href}
                className={`flex h-10 items-center gap-3 rounded px-3 text-sm font-medium transition ${
                  active
                    ? "bg-white text-brand shadow-soft"
                    : "text-slate-700 hover:bg-white"
                }`}
              >
                <Icon aria-hidden className="h-4 w-4" />
                {route.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      <header className="sticky top-0 z-20 border-b border-line bg-white lg:hidden">
        <div className="px-4 py-4">
          <p className="text-sm font-semibold text-brand">NHP AI Testing</p>
          <h1 className="text-lg font-semibold">Agent Evaluation</h1>
        </div>
        <nav
          className="flex gap-2 overflow-x-auto border-t border-line px-4 py-2"
          aria-label="Mobile navigation"
        >
          {appRoutes.map((route) => {
            const Icon = route.icon;
            return (
              <Link
                key={route.href}
                href={route.href}
                className="flex h-9 shrink-0 items-center gap-2 rounded border border-line px-3 text-sm"
              >
                <Icon aria-hidden className="h-4 w-4" />
                {route.label}
              </Link>
            );
          })}
        </nav>
      </header>

      <main className="lg:pl-64">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          {children}
        </div>
      </main>
    </div>
  );
}
