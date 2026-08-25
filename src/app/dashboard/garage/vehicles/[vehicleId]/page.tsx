import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  buildTimeline,
  type ServiceEntry,
  type MotHistoryRow,
} from "@/lib/timeline";

export default async function GarageVehiclePage({
  params,
}: {
  params: Promise<{ vehicleId: string }>;
}) {
  const { vehicleId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: vehicle } = await supabase
    .from("vehicles")
    .select("id, vrm, make, model, colour, fuel_type")
    .eq("id", vehicleId)
    .maybeSingle();

  if (!vehicle) {
    notFound();
  }

  const [{ data: serviceEntries }, { data: motHistory }] = await Promise.all([
    supabase
      .from("service_entries")
      .select(
        "id, entry_date, mileage, service_type, garage_name, notes, verified",
      )
      .eq("vehicle_id", vehicleId)
      .order("entry_date", { ascending: false })
      .returns<ServiceEntry[]>(),
    supabase
      .from("mot_history")
      .select(
        "id, test_date, completed_at, expiry_date, result, odometer_value, odometer_unit, raw_data",
      )
      .eq("vehicle_id", vehicleId)
      .order("completed_at", { ascending: false })
      .returns<MotHistoryRow[]>(),
  ]);

  const timeline = buildTimeline(serviceEntries ?? [], motHistory ?? []);

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-4 p-6">
      <Link href="/dashboard/garage" className="text-sm text-neutral-500">
        ← Garage portal
      </Link>

      <div>
        <h1 className="text-xl font-semibold">{vehicle.vrm}</h1>
        <p className="text-neutral-600">
          {[vehicle.make, vehicle.model, vehicle.colour, vehicle.fuel_type]
            .filter(Boolean)
            .join(" · ")}
        </p>
      </div>

      <Link
        href={`/dashboard/garage/vehicles/${vehicleId}/add-entry`}
        className="rounded bg-black px-4 py-2 text-center text-sm font-medium text-white"
      >
        Add verified entry
      </Link>

      {timeline.length === 0 ? (
        <p className="text-sm text-neutral-600">No history yet.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {timeline.map((item) =>
            item.kind === "mot" ? (
              <li
                key={`mot-${item.entry.id}`}
                className="rounded border border-neutral-300 p-3 text-sm"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold">MOT test</span>
                  <span
                    className={
                      item.entry.result === "PASS"
                        ? "text-green-700"
                        : "text-red-700"
                    }
                  >
                    {item.entry.result === "PASS" ? "Pass" : "Fail"}
                  </span>
                </div>
                <p className="text-neutral-600">{item.date}</p>
                {item.entry.odometer_value != null && (
                  <p className="text-neutral-600">
                    {item.entry.odometer_value.toLocaleString()}{" "}
                    {item.entry.odometer_unit}
                  </p>
                )}
              </li>
            ) : (
              <li
                key={`service-${item.entry.id}`}
                className="rounded border border-neutral-300 p-3 text-sm"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold capitalize">
                    {item.entry.service_type}
                  </span>
                  {item.entry.verified && (
                    <span className="text-xs uppercase text-green-700">
                      Verified
                    </span>
                  )}
                </div>
                <p className="text-neutral-600">{item.date}</p>
                {item.entry.mileage != null && (
                  <p className="text-neutral-600">
                    {item.entry.mileage.toLocaleString()} mi
                  </p>
                )}
                {item.entry.garage_name && <p>{item.entry.garage_name}</p>}
                {item.entry.notes && (
                  <p className="text-neutral-600">{item.entry.notes}</p>
                )}
              </li>
            ),
          )}
        </ul>
      )}
    </main>
  );
}
