import { computeMotStatus } from "./reminders";
import { computeMileageStats, type MileageReading } from "./mileage";
import type { ServiceEntry, MotHistoryRow } from "./timeline";

export interface FactsheetSummary {
  currentMileage: number | null;
  avgMileagePerYear: number | null;
  motStatusMessage: string;
  ownedSinceYears: number | null;
  outstandingAdvisories: string[];
}

/**
 * Shared between the owner's own PDF export and the public/handover
 * factsheet — both documents show the same summary panel, only the
 * cost figures on individual line items differ between them.
 */
export function buildFactsheetSummary(
  serviceEntries: ServiceEntry[],
  motHistory: MotHistoryRow[],
  ownerSince: string | null,
): FactsheetSummary {
  const latestMot = motHistory[0] ?? null;
  const motStatus = computeMotStatus(latestMot);

  const readings: MileageReading[] = [
    ...motHistory
      .filter((row) => row.odometer_value != null)
      .map((row) => ({ date: row.completed_at, mileage: row.odometer_value! })),
    ...serviceEntries
      .filter((row) => row.mileage != null)
      .map((row) => ({ date: row.entry_date, mileage: row.mileage! })),
  ];
  const latestReading = [...readings].sort((a, b) =>
    a.date < b.date ? 1 : -1,
  )[0];
  const mileageStats = computeMileageStats(readings, latestMot?.expiry_date ?? null);

  // Same "resolved by a later service entry" logic as the vehicle page
  // and insights dashboard — only the latest MOT's defects count as
  // currently outstanding.
  const resolvedKeys = new Set(
    serviceEntries
      .filter((entry) => entry.resolved_mot_history_id != null)
      .map((entry) => `${entry.resolved_mot_history_id}:${entry.resolved_defect_index}`),
  );

  const outstandingAdvisories: string[] = [];
  if (latestMot) {
    (latestMot.raw_data?.defects ?? []).forEach((defect, index) => {
      const key = `${latestMot.id}:${index}`;
      if (!resolvedKeys.has(key)) outstandingAdvisories.push(defect.text);
    });
  }

  const ownedSinceYears = ownerSince
    ? (Date.now() - new Date(ownerSince).getTime()) / (1000 * 60 * 60 * 24 * 365.25)
    : null;

  return {
    currentMileage: latestReading?.mileage ?? null,
    avgMileagePerYear: mileageStats?.avgPerYear ?? null,
    motStatusMessage: motStatus.message,
    ownedSinceYears,
    outstandingAdvisories,
  };
}
