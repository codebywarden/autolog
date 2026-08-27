import { notFound } from "next/navigation";
import { Wordmark } from "@/components/wordmark";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  buildTimeline,
  type ServiceEntry,
  type MotHistoryRow,
} from "@/lib/timeline";
import { buttonStyles, cardStyles } from "@/components/ui/styles";

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
      <Wordmark className="text-2xl" />

      <div className="flex items-center gap-2 rounded-xl border border-success/25 bg-success-bg px-4 py-3 text-sm font-medium text-success">
        <span aria-hidden>✓</span>
        Verified Motor360 history — shared read-only. Invoice attachments
        aren&apos;t included.
      </div>

      <div>
        <h1 className="font-mono text-2xl font-semibold tracking-wide text-foreground">
          {vehicle.vrm}
        </h1>
        <p className="text-muted-foreground">
          {[vehicle.make, vehicle.model, vehicle.colour, vehicle.fuel_type]
            .filter(Boolean)
            .join(" · ")}
        </p>
      </div>

      <a
        href={`/api/share/${token}/export`}
        className={buttonStyles("secondary")}
      >
        Download PDF
      </a>

      {timeline.length === 0 ? (
        <p className={cardStyles("text-sm text-muted-foreground")}>
          No history recorded yet.
        </p>
      ) : (
        <ul className="flex flex-col gap-2.5">
          {timeline.map((item) =>
            item.kind === "mot" ? (
              <li key={`mot-${item.entry.id}`} className={cardStyles("text-sm")}>
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-foreground">MOT test</span>
                  <span
                    className={`text-xs font-semibold ${
                      item.entry.result === "PASS" ? "text-success" : "text-critical"
                    }`}
                  >
                    {item.entry.result === "PASS" ? "Pass" : "Fail"}
                  </span>
                </div>
                <p className="mt-0.5 text-muted-foreground">{item.date}</p>
                {item.entry.odometer_value != null && (
                  <p className="text-muted-foreground">
                    {item.entry.odometer_value.toLocaleString()}{" "}
                    {item.entry.odometer_unit}
                  </p>
                )}
              </li>
            ) : (
              <li
                key={`service-${item.entry.id}`}
                className={cardStyles("text-sm")}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold capitalize text-foreground">
                    {item.entry.service_type}
                  </span>
                  {item.entry.verified && (
                    <span className="rounded-full bg-success-bg px-2 py-0.5 text-xs font-semibold uppercase text-success">
                      Verified
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-muted-foreground">{item.date}</p>
                {item.entry.mileage != null && (
                  <p className="text-muted-foreground">
                    {item.entry.mileage.toLocaleString()} mi
                  </p>
                )}
                {item.entry.garage_name && (
                  <p className="text-foreground">{item.entry.garage_name}</p>
                )}
                {item.entry.notes && (
                  <p className="text-muted-foreground">{item.entry.notes}</p>
                )}
              </li>
            ),
          )}
        </ul>
      )}
    </main>
  );
}
