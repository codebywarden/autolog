import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  buildTimeline,
  type ServiceEntry,
  type MotHistoryRow,
} from "@/lib/timeline";
import { buttonStyles, cardStyles } from "@/components/ui/styles";

interface Attachment {
  id: string;
  service_entry_id: string | null;
  storage_path: string;
  file_name: string | null;
}

interface AttachmentLink {
  id: string;
  fileName: string;
  url: string | null;
}

const SIGNED_URL_TTL_SECONDS = 600;

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

  const [{ data: serviceEntries }, { data: motHistory }, { data: attachments }] =
    await Promise.all([
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
      supabase
        .from("file_attachments")
        .select("id, service_entry_id, storage_path, file_name")
        .eq("vehicle_id", vehicleId)
        .returns<Attachment[]>(),
    ]);

  const attachmentsByEntry = new Map<string, AttachmentLink[]>();
  for (const attachment of attachments ?? []) {
    if (!attachment.service_entry_id) continue;

    const { data: signed } = await supabase.storage
      .from("invoices")
      .createSignedUrl(attachment.storage_path, SIGNED_URL_TTL_SECONDS);

    const list = attachmentsByEntry.get(attachment.service_entry_id) ?? [];
    list.push({
      id: attachment.id,
      fileName: attachment.file_name ?? "Attachment",
      url: signed?.signedUrl ?? null,
    });
    attachmentsByEntry.set(attachment.service_entry_id, list);
  }

  const timeline = buildTimeline(serviceEntries ?? [], motHistory ?? []);

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-4 p-6">
      <Link
        href="/dashboard/garage"
        className="text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        ← Garage portal
      </Link>

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

      <Link
        href={`/dashboard/garage/vehicles/${vehicleId}/add-entry`}
        className={buttonStyles("primary")}
      >
        Add verified entry
      </Link>

      {timeline.length === 0 ? (
        <p className={cardStyles("text-sm text-muted-foreground")}>
          No history yet.
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
                {(attachmentsByEntry.get(item.entry.id) ?? []).map(
                  (attachment) =>
                    attachment.url ? (
                      <a
                        key={attachment.id}
                        href={attachment.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1 inline-block text-primary underline underline-offset-2 hover:text-primary-hover"
                      >
                        📎 {attachment.fileName}
                      </a>
                    ) : (
                      <p key={attachment.id} className="mt-1 text-muted-foreground">
                        📎 {attachment.fileName} (link unavailable)
                      </p>
                    ),
                )}
              </li>
            ),
          )}
        </ul>
      )}
    </main>
  );
}
