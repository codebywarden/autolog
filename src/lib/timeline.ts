export interface ServiceEntry {
  id: string;
  entry_date: string;
  mileage: number | null;
  service_type: string;
  garage_name: string | null;
  notes: string | null;
  verified: boolean;
  resolved_mot_history_id?: string | null;
  resolved_defect_index?: number | null;
}

export interface MotDefect {
  text: string;
  type: "ADVISORY" | "MINOR" | "MAJOR" | "DANGEROUS" | string;
  dangerous: boolean;
}

export interface MotHistoryRow {
  id: string;
  test_date: string;
  completed_at: string;
  expiry_date: string | null;
  result: "PASS" | "FAIL";
  odometer_value: number | null;
  odometer_unit: string | null;
  raw_data: { defects?: MotDefect[] } | null;
}

export type TimelineItem =
  | { kind: "service"; date: string; entry: ServiceEntry }
  | { kind: "mot"; date: string; entry: MotHistoryRow };

/**
 * Merges service entries and MOT tests into one chronological timeline.
 * MOT entries sort on the full completed_at timestamp, not the
 * date-only test_date — otherwise two same-day tests (e.g. a morning
 * fail followed by an afternoon pass after a repair) have no defined
 * order.
 */
export function buildTimeline(
  serviceEntries: ServiceEntry[],
  motHistory: MotHistoryRow[],
): TimelineItem[] {
  return [
    ...serviceEntries.map((entry) => ({
      kind: "service" as const,
      date: entry.entry_date,
      entry,
    })),
    ...motHistory.map((entry) => ({
      kind: "mot" as const,
      date: entry.completed_at,
      entry,
    })),
  ].sort((a, b) => (a.date < b.date ? 1 : -1));
}

export interface ResolvableDefect {
  motHistoryId: string;
  defectIndex: number;
  label: string;
}

/**
 * Flattens every defect across a vehicle's MOT history into a pickable
 * list for the "this entry resolves..." selector, skipping any defect
 * a service entry already points at — a defect can only be resolved
 * once, so re-offering it would just invite duplicate links.
 */
export function buildResolvableDefects(
  motHistory: MotHistoryRow[],
  alreadyResolved: Set<string>,
): ResolvableDefect[] {
  const items: ResolvableDefect[] = [];
  for (const test of motHistory) {
    const defects = test.raw_data?.defects ?? [];
    defects.forEach((defect, index) => {
      const key = `${test.id}:${index}`;
      if (alreadyResolved.has(key)) return;
      items.push({
        motHistoryId: test.id,
        defectIndex: index,
        label: `${test.test_date} — ${defect.text}`,
      });
    });
  }
  return items;
}
