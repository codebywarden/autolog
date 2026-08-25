export type ReminderLevel = "ok" | "warning" | "critical" | "unknown";

export interface ReminderStatus {
  level: ReminderLevel;
  message: string;
}

export const REMINDER_BADGE_CLASS: Record<ReminderLevel, string> = {
  critical: "bg-red-700 text-white",
  warning: "bg-amber-500 text-black",
  ok: "bg-green-700 text-white",
  unknown: "bg-neutral-200 text-neutral-600",
};

const DUE_SOON_DAYS = 30;
// No mileage-based projection for MVP — we only see mileage at the
// moment of a service or MOT, never a live odometer reading, so a
// mileage-based due date would be a guess dressed up as a fact. Months
// since the last known service is what we can actually stand behind.
const SERVICE_INTERVAL_MONTHS = 12;

function daysUntil(date: Date): number {
  return Math.ceil((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

export function computeMotStatus(
  latest: { result: "PASS" | "FAIL"; expiry_date: string | null } | null,
): ReminderStatus {
  if (!latest) {
    return { level: "unknown", message: "No MOT history" };
  }

  if (latest.result === "FAIL" || !latest.expiry_date) {
    return { level: "critical", message: "No valid MOT" };
  }

  const remaining = daysUntil(new Date(latest.expiry_date));

  if (remaining < 0) {
    return { level: "critical", message: `MOT expired ${latest.expiry_date}` };
  }
  if (remaining <= DUE_SOON_DAYS) {
    return { level: "warning", message: `MOT due ${latest.expiry_date}` };
  }
  return { level: "ok", message: `MOT valid until ${latest.expiry_date}` };
}

export function computeServiceStatus(
  latestEntryDate: string | null,
): ReminderStatus {
  if (!latestEntryDate) {
    return { level: "unknown", message: "No service history logged yet" };
  }

  const due = new Date(latestEntryDate);
  due.setMonth(due.getMonth() + SERVICE_INTERVAL_MONTHS);
  const dueDateStr = due.toISOString().slice(0, 10);
  const remaining = daysUntil(due);

  if (remaining < 0) {
    return {
      level: "critical",
      message: `Service overdue (was due ${dueDateStr})`,
    };
  }
  if (remaining <= DUE_SOON_DAYS) {
    return { level: "warning", message: `Service due ${dueDateStr}` };
  }
  return { level: "ok", message: `Next service due ${dueDateStr}` };
}
