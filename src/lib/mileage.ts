export interface MileageReading {
  date: string;
  mileage: number;
}

export interface MileageStats {
  avgPerYear: number;
  estimatedYtd: number;
  projectedAtNextMot: number | null;
}

const MS_PER_YEAR = 1000 * 60 * 60 * 24 * 365.25;

/**
 * Estimates from the spread between the earliest and latest known
 * mileage readings — not a fitted trend line. Deliberately simple: with
 * only a handful of readings a year, a more sophisticated model would
 * be false precision, not a better answer.
 */
export function computeMileageStats(
  readings: MileageReading[],
  nextMotDueDate: string | null,
): MileageStats | null {
  const sorted = readings
    .filter((r) => r.mileage != null)
    .sort((a, b) => (a.date < b.date ? -1 : 1));

  if (sorted.length < 2) return null;

  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  const yearsSpan =
    (new Date(last.date).getTime() - new Date(first.date).getTime()) / MS_PER_YEAR;

  // Two readings a few weeks apart would extrapolate to a wild annual
  // figure — require a reasonable span before estimating anything.
  if (yearsSpan < 0.25 || last.mileage <= first.mileage) return null;

  const avgPerYear = (last.mileage - first.mileage) / yearsSpan;

  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const yearFractionElapsed =
    (now.getTime() - startOfYear.getTime()) / MS_PER_YEAR;
  const estimatedYtd = Math.round(avgPerYear * yearFractionElapsed);

  let projectedAtNextMot: number | null = null;
  if (nextMotDueDate) {
    const yearsUntilDue =
      (new Date(nextMotDueDate).getTime() - now.getTime()) / MS_PER_YEAR;
    if (yearsUntilDue > 0) {
      projectedAtNextMot = Math.round(last.mileage + avgPerYear * yearsUntilDue);
    }
  }

  return {
    avgPerYear: Math.round(avgPerYear),
    estimatedYtd,
    projectedAtNextMot,
  };
}
