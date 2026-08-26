import type { ReminderLevel } from "@/lib/reminders";

const LEVEL_FILL: Record<ReminderLevel, string> = {
  critical: "bg-critical",
  warning: "bg-warning",
  ok: "bg-success",
  unknown: "bg-neutral-badge",
};

export function ProgressBar({
  percent,
  level,
  label,
}: {
  percent: number;
  level: ReminderLevel;
  label: string;
}) {
  return (
    <div>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{label}</span>
        <span>{Math.round(percent)}%</span>
      </div>
      <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-border">
        <div
          className={`h-full rounded-full ${LEVEL_FILL[level]}`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
