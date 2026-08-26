import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SignOutButton } from "./sign-out-button";
import {
  computeMotStatus,
  computeServiceStatus,
  REMINDER_BADGE_CLASS,
} from "@/lib/reminders";
import { buttonStyles, cardStyles } from "@/components/ui/styles";

interface OwnedVehicleRow {
  vehicle: {
    id: string;
    vrm: string;
    make: string | null;
    model: string | null;
    colour: string | null;
  } | null;
}

interface LatestMot {
  vehicle_id: string;
  result: "PASS" | "FAIL";
  expiry_date: string | null;
}

interface LatestServiceEntry {
  vehicle_id: string;
  entry_date: string;
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: ownedVehicles } = await supabase
    .from("vehicle_owners")
    .select("vehicle:vehicles(id, vrm, make, model, colour)")
    .eq("user_id", user.id)
    .eq("is_current", true)
    .returns<OwnedVehicleRow[]>();

  const vehicles = (ownedVehicles ?? [])
    .map((row) => row.vehicle)
    .filter((vehicle) => vehicle !== null);

  const vehicleIds = vehicles.map((vehicle) => vehicle.id);

  // One query per table across all owned vehicles, reduced to "latest
  // per vehicle" in JS — simpler than a DISTINCT ON query through
  // PostgREST, and the row counts here are small enough that it's not
  // worth the complexity.
  const [{ data: allMot }, { data: allServiceEntries }] =
    vehicleIds.length > 0
      ? await Promise.all([
          supabase
            .from("mot_history")
            .select("vehicle_id, result, expiry_date")
            .in("vehicle_id", vehicleIds)
            .order("completed_at", { ascending: false })
            .returns<LatestMot[]>(),
          supabase
            .from("service_entries")
            .select("vehicle_id, entry_date")
            .in("vehicle_id", vehicleIds)
            .order("entry_date", { ascending: false })
            .returns<LatestServiceEntry[]>(),
        ])
      : [{ data: [] as LatestMot[] }, { data: [] as LatestServiceEntry[] }];

  const latestMotByVehicle = new Map<string, LatestMot>();
  for (const row of allMot ?? []) {
    if (!latestMotByVehicle.has(row.vehicle_id)) {
      latestMotByVehicle.set(row.vehicle_id, row);
    }
  }

  const latestServiceByVehicle = new Map<string, string>();
  for (const row of allServiceEntries ?? []) {
    if (!latestServiceByVehicle.has(row.vehicle_id)) {
      latestServiceByVehicle.set(row.vehicle_id, row.entry_date);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col gap-5 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Your vehicles
        </h1>
        <SignOutButton />
      </div>
      <p className="-mt-3 text-sm text-muted-foreground">
        Signed in as {user.email}
      </p>

      <div className="flex flex-col gap-2">
        <div className="flex gap-2">
          <Link
            href="/dashboard/vehicles/add"
            className={buttonStyles("primary", "flex-1")}
          >
            Add a vehicle
          </Link>
          <Link
            href="/dashboard/garage"
            className={buttonStyles("secondary", "flex-1")}
          >
            Garage portal
          </Link>
        </div>
        <Link href="/dashboard/vehicles/receive" className={buttonStyles("ghost")}>
          Receive a vehicle
        </Link>
        <Link href="/dashboard/resources" className={buttonStyles("ghost")}>
          Resources
        </Link>
      </div>

      {vehicles.length === 0 ? (
        <p className={cardStyles("text-sm text-muted-foreground")}>
          No vehicles yet.
        </p>
      ) : (
        <ul className="flex flex-col gap-2.5">
          {vehicles.map((vehicle) => {
            const motStatus = computeMotStatus(
              latestMotByVehicle.get(vehicle.id) ?? null,
            );
            const serviceStatus = computeServiceStatus(
              latestServiceByVehicle.get(vehicle.id) ?? null,
            );

            return (
              <li key={vehicle.id}>
                <Link
                  href={`/dashboard/vehicles/${vehicle.id}`}
                  className={cardStyles(
                    "block text-sm transition-colors hover:border-border-strong",
                  )}
                >
                  <p className="font-mono text-base font-semibold tracking-wide text-foreground">
                    {vehicle.vrm}
                  </p>
                  <p className="text-muted-foreground">
                    {[vehicle.make, vehicle.model, vehicle.colour]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${REMINDER_BADGE_CLASS[motStatus.level]}`}
                    >
                      {motStatus.message}
                    </span>
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${REMINDER_BADGE_CLASS[serviceStatus.level]}`}
                    >
                      {serviceStatus.message}
                    </span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
