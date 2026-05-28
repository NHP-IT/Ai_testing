import type { StageState } from "@/lib/stage-data";

const styles: Record<StageState, string> = {
  available: "border-emerald-200 bg-emerald-50 text-emerald-800",
  next: "border-amber-200 bg-amber-50 text-amber-800",
  planned: "border-slate-200 bg-slate-50 text-slate-700"
};

const labels: Record<StageState, string> = {
  available: "Ready",
  next: "Next",
  planned: "Planned"
};

export function StatusPill({ status }: { status: StageState }) {
  return (
    <span
      className={`inline-flex items-center rounded border px-2 py-1 text-xs font-medium ${styles[status]}`}
    >
      {labels[status]}
    </span>
  );
}
