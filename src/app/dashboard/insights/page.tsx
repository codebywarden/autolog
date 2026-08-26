import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  computeMotStatus,
  computeServiceStatus,
  computeMotProgress,
  computeServiceProgress,
  REMINDER_BADGE_CLASS,
} from "@/lib/reminders";
import { computeMileageStats, type MileageReading } from "@/lib/mileage";
import { cardStyles } from "@/components/ui/styles";
import { ProgressBar } from "@/components/ui/progress-bar";
import { DefectDonut, type DefectSeverity } from "./defect-donut";
import { MarkResolvedButton } from "./mark-resolved-button";

interface OwnedVehicleRow {
  started_at: string;
  vehicle: {
    id: string;
    vrm: string;
    make: string | null;
    model: string | null;
  } | null;
}

interface MotRow {
  id: string;
  vehicle_id: string;
  completed_at: string;
  expiry_date: string | null;
  result: "PASS" | "FAIL";
  odometer_value: number | null;
  raw_data: { defects?: { text: string; type: string }[] } | null;
}

interface ServiceRow {
  vehicle_id: string;
  entry_date: string;
  mileage: number | null;
  resolved_mot_history_id: string | null;
  resolved_defect_index: number | null;
}

interface UnresolvedDefect {
  motHistoryId: string;
  defectIndex: number;
  text: string;
  severity: DefectSeverity;
}

// Matches the badge grouping already used on the vehicle pages —
// MAJOR and DANGEROUS both read as "critical" there too.
function severityOf(type: string): DefectSeverity {
  if (type === "MAJOR" || type === "DANGEROUS") return "critical";
  if (type === "MINOR") return "warning";
  return "neutral";
}

export default async function InsightsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: ownedRows } = await supabase
    .from("vehicle_owners")
    .select("started_at, vehicle:vehicles(id, vrm, make, model)")
    .eq("user_id", user.id)
    .eq("is_current", true)
    .returns<OwnedVehicleRow[]>();

  const vehicles = (ownedRows ?? [])
    .filter((row) => row.vehicle !== null)
    .map((row) => ({ ...row.vehicle!, startedAt: row.started_at }));

  const vehicleIds = vehicles.map((vehicle) => vehicle.id);

  const [{ data: allMot }, { data: allService }] =
    vehicleIds.length > 0
      ? await Promise.all([
          supabase
            .from("mot_history")
            .select(
              "id, vehicle_id, completed_at, expiry_date, result, odometer_value, raw_data",
            )
            .in("vehicle_id", vehicleIds)
            .order("completed_at", { ascending: false })
            .returns<MotRow[]>(),
          supabase
            .from("service_entries")
            .select(
              "vehicle_id, entry_date, mileage, resolved_mot_history_id, resolved_defect_index",
            )
            .in("vehicle_id", vehicleIds)
            .order("entry_date", { ascending: false })
            .returns<ServiceRow[]>(),
        ])
      : [{ data: [] as MotRow[] }, { data: [] as ServiceRow[] }];

  const motByVehicle = new Map<string, MotRow[]>();
  for (const row of allMot ?? []) {
    const list = motByVehicle.get(row.vehicle_id) ?? [];
    list.push(row);
    motByVehicle.set(row.vehicle_id, list);
  }

  const serviceByVehicle = new Map<string, ServiceRow[]>();
  for (const row of allService ?? []) {
    const list = serviceByVehicle.get(row.vehicle_id) ?? [];
    list.push(row);
    serviceByVehicle.set(row.vehicle_id, list);
  }

  const vehicleStats = vehicles.map((vehicle) => {
    const motRows = motByVehicle.get(vehicle.id) ?? [];
    const serviceRows = serviceByVehicle.get(vehicle.id) ?? [];
    const latestMot = motRows[0] ?? null;

    const readings: MileageReading[] = [
      ...motRows
        .filter((row) => row.odometer_value != null)
        .map((row) => ({ date: row.completed_at, mileage: row.odometer_value! })),
      ...serviceRows
        .filter((row) => row.mileage != null)
        .map((row) => ({ date: row.entry_date, mileage: row.mileage! })),
    ];
    const latestReading = [...readings].sort((a, b) =>
      a.date < b.date ? 1 : -1,
    )[0];

    const mileageStats = computeMileageStats(
      readings,
      latestMot?.expiry_date ?? null,
    );
    const motStatus = computeMotStatus(latestMot);
    const serviceStatus = computeServiceStatus(serviceRows[0]?.entry_date ?? null);
    const motProgress = computeMotProgress(latestMot);
    const serviceProgress = computeServiceProgress(serviceRows[0]?.entry_date ?? null);

    // Outstanding findings only look at the latest MOT — an advisory
    // from three tests ago that the car has since passed again isn't
    // "outstanding" in any useful sense, even if nobody ever logged a
    // service entry against it.
    const resolvedKeys = new Set(
      serviceRows
        .filter((row) => row.resolved_mot_history_id != null)
        .map((row) => `${row.resolved_mot_history_id}:${row.resolved_defect_index}`),
    );

    const unresolvedDefects: UnresolvedDefect[] = [];
    if (latestMot) {
      (latestMot.raw_data?.defects ?? []).forEach((defect, index) => {
        const key = `${latestMot.id}:${index}`;
        if (!resolvedKeys.has(key)) {
          unresolvedDefects.push({
            motHistoryId: latestMot.id,
            defectIndex: index,
            text: defect.text,
            severity: severityOf(defect.type),
          });
        }
      });
    }

    const yearsOwned =
      (Date.now() - new Date(vehicle.startedAt).getTime()) /
      (1000 * 60 * 60 * 24 * 365.25);

    return {
      vehicle,
      latestMileage: latestReading?.mileage ?? null,
      mileageStats,
      motStatus,
      serviceStatus,
      motProgress,
      serviceProgress,
      unresolvedDefects,
      yearsOwned,
    };
  });

  const totalMileage = vehicleStats.reduce(
    (sum, stat) => sum + (stat.latestMileage ?? 0),
    0,
  );
  const totalUnresolved = vehicleStats.reduce(
    (sum, stat) => sum + stat.unresolvedDefects.length,
    0,
  );
  const needsAttentionNow = vehicleStats.filter(
    (stat) =>
      stat.motStatus.level === "critical" || stat.serviceStatus.level === "critical",
  ).length;

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-5 p-6">
      <h1 className="text-2xl font-bold tracking-tight text-foreground">
        My Dashboard
      </h1>

      {vehicles.length === 0 ? (
        <p className={cardStyles("text-sm text-muted-foreground")}>
          Add a vehicle to start seeing insights here.
        </p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2.5">
            <div className={cardStyles("text-center")}>
              <p className="text-2xl font-bold text-foreground">{vehicles.length}</p>
              <p className="text-xs text-muted-foreground">
                Vehicle{vehicles.length === 1 ? "" : "s"}
              </p>
            </div>
            <div className={cardStyles("text-center")}>
              <p className="text-2xl font-bold text-foreground">
                {totalMileage.toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground">Total mileage</p>
            </div>
            <div
              className={cardStyles(
                `text-center ${needsAttentionNow > 0 ? "border-critical/30 bg-critical-bg" : ""}`,
              )}
            >
              <p
                className={`text-2xl font-bold ${needsAttentionNow > 0 ? "text-critical" : "text-foreground"}`}
              >
                {needsAttentionNow}
              </p>
              <p className="text-xs text-muted-foreground">Need attention now</p>
            </div>
            <div
              className={cardStyles(
                `text-center ${totalUnresolved > 0 ? "border-warning/30 bg-warning-bg" : ""}`,
              )}
            >
              <p
                className={`text-2xl font-bold ${totalUnresolved > 0 ? "text-warning" : "text-foreground"}`}
              >
                {totalUnresolved}
              </p>
              <p className="text-xs text-muted-foreground">
                Outstanding MOT findings
              </p>
            </div>
          </div>

          <ul className="flex flex-col gap-2.5">
            {vehicleStats.map((stat) => (
              <li key={stat.vehicle.id} className={cardStyles("text-sm")}>
                <Link href={`/dashboard/vehicles/${stat.vehicle.id}`} className="block">
                  <p className="font-mono text-base font-semibold tracking-wide text-foreground">
                    {stat.vehicle.vrm}
                  </p>
                  <p className="text-muted-foreground">
                    {[stat.vehicle.make, stat.vehicle.model].filter(Boolean).join(" ")}
                  </p>
                </Link>

                <div className="mt-2 flex flex-wrap gap-1.5">
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold ${REMINDER_BADGE_CLASS[stat.motStatus.level]}`}
                  >
                    {stat.motStatus.message}
                  </span>
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold ${REMINDER_BADGE_CLASS[stat.serviceStatus.level]}`}
                  >
                    {stat.serviceStatus.message}
                  </span>
                </div>

                <div className="mt-3 flex flex-col gap-2.5">
                  {stat.motProgress && (
                    <ProgressBar
                      percent={stat.motProgress.percent}
                      level={stat.motProgress.level}
                      label="Current MOT cycle"
                    />
                  )}
                  {stat.serviceProgress && (
                    <ProgressBar
                      percent={stat.serviceProgress.percent}
                      level={stat.serviceProgress.level}
                      label="Since last service"
                    />
                  )}
                </div>

                <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5">
                  <div>
                    <dt className="text-xs text-muted-foreground">Owned</dt>
                    <dd className="text-foreground">
                      {stat.yearsOwned < 1
                        ? `${Math.max(1, Math.round(stat.yearsOwned * 12))} mo`
                        : `${stat.yearsOwned.toFixed(1)} yrs`}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Mileage</dt>
                    <dd className="text-foreground">
                      {stat.latestMileage != null
                        ? `${stat.latestMileage.toLocaleString()} mi`
                        : "—"}
                    </dd>
                  </div>
                  {stat.mileageStats && (
                    <div className="col-span-2">
                      <dt className="text-xs text-muted-foreground">Average use</dt>
                      <dd className="text-foreground">
                        ~{stat.mileageStats.avgPerYear.toLocaleString()} mi/year
                      </dd>
                    </div>
                  )}
                </dl>

                {stat.unresolvedDefects.length > 0 && (
                  <div className="mt-3 border-t border-border pt-3">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Latest MOT findings
                    </p>
                    <DefectDonut items={stat.unresolvedDefects} />
                    <ul className="mt-3 flex flex-col gap-2">
                      {stat.unresolvedDefects.map((defect) => (
                        <li
                          key={defect.defectIndex}
                          className="flex items-start justify-between gap-3 rounded-lg bg-background px-2.5 py-2"
                        >
                          <span className="text-foreground">{defect.text}</span>
                          <MarkResolvedButton
                            vehicleId={stat.vehicle.id}
                            motHistoryId={defect.motHistoryId}
                            defectIndex={defect.defectIndex}
                          />
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </>
      )}
    </main>
  );
}
