import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  buildTimeline,
  type ServiceEntry,
  type MotHistoryRow,
} from "@/lib/timeline";

export default async function SharePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  // No session exists on this page at all — it's reached by an
  // anonymous visitor holding a link, not a logged-in user — so this
  // uses the service-role client throughout and enforces access itself
  // via the token/expiry check below, the same way the garage-redeem
  // and add-vehicle routes handle privileged, cross-user operations.
  const admin = createAdminClient();

  const { data: link } = await admin
    .from("vehicle_share_links")
    .select("vehicle_id, expires_at, revoked_at")
    .eq("token", token)
    .maybeSingle();

  if (!link || link.revoked_at || new Date(link.expires_at) < new Date()) {
    notFound();
  }

  const { data: vehicle } = await admin
    .from("vehicles")
    .select("id, vrm, make, model, colour, fuel_type")
    .eq("id", link.vehicle_id)
    .maybeSingle();

  if (!vehicle) {
    notFound();
  }

  const [{ data: serviceEntries }, { data: motHistory }] = await Promise.all([
    admin
      .from("service_entries")
      .select(
        "id, entry_date, mileage, service_type, garage_name, notes, verified",
      )
      .eq("vehicle_id", vehicle.id)
      .order("entry_date", { ascending: false })
      .returns<ServiceEntry[]>(),
    admin
      .from("mot_history")
      .select(
        "id, test_date, completed_at, expiry_date, result, odometer_value, odometer_unit, raw_data",
      )
      .eq("vehicle_id", vehicle.id)
      .order("completed_at", { ascending: false })
      .returns<MotHistoryRow[]>(),
  ]);

  const timeline = buildTimeline(serviceEntries ?? [], motHistory ?? []);

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-4 p-6">
      <div className="rounded border border-green-700 bg-green-50 p-3 text-sm text-green-800">
        ✓ Verified AutoLog history — shared read-only. Invoice
        attachments aren&apos;t included.
      </div>

      <div>
        <h1 className="text-xl font-semibold">{vehicle.vrm}</h1>
        <p className="text-neutral-600">
          {[vehicle.make, vehicle.model, vehicle.colour, vehicle.fuel_type]
            .filter(Boolean)
            .join(" · ")}
        </p>
      </div>

      <a
        href={`/api/share/${token}/export`}
        className="rounded border border-neutral-300 px-4 py-2 text-center text-sm font-medium"
      >
        Download PDF
      </a>

      {timeline.length === 0 ? (
        <p className="text-sm text-neutral-600">No history recorded yet.</p>
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
