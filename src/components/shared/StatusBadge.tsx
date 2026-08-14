import { STATUS_COLORS, STATUS_LABELS } from "@/lib/utils";
import { cn } from "@/lib/utils";

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide",
        STATUS_COLORS[status] ?? "bg-neutral-100 text-neutral-700 border-neutral-300",
        className
      )}
    >
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}
