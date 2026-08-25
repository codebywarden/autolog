import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SignOutButton } from "./sign-out-button";
import {
  computeMotStatus,
  computeServiceStatus,
  REMINDER_BADGE_CLASS,
} from "@/lib/reminders";

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
    <main className="mx-auto flex min-h-screen max-w-md flex-col gap-4 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Your vehicles</h1>
        <SignOutButton />
      </div>
      <p className="text-sm text-neutral-600">Signed in as {user.email}</p>

      <Link
        href="/dashboard/vehicles/add"
        className="rounded bg-black px-4 py-2 text-center text-sm font-medium text-white"
      >
        Add a vehicle
      </Link>

      {vehicles.length === 0 ? (
        <p className="text-sm text-neutral-600">No vehicles yet.</p>
      ) : (
        <ul className="flex flex-col gap-2">
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
                  className="block rounded border border-neutral-300 p-3 text-sm hover:border-neutral-400"
                >
                  <p className="font-semibold">{vehicle.vrm}</p>
                  <p className="text-neutral-600">
                    {[vehicle.make, vehicle.model, vehicle.colour]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <span
                      className={`rounded px-2 py-0.5 text-xs font-medium ${REMINDER_BADGE_CLASS[motStatus.level]}`}
                    >
                      {motStatus.message}
                    </span>
                    <span
                      className={`rounded px-2 py-0.5 text-xs font-medium ${REMINDER_BADGE_CLASS[serviceStatus.level]}`}
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
