import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  computeMotStatus,
  computeServiceStatus,
  REMINDER_BADGE_CLASS,
} from "@/lib/reminders";
import {
  buildTimeline,
  type ServiceEntry,
  type MotHistoryRow,
} from "@/lib/timeline";
import { InviteCodePanel } from "./invite-code-panel";
import { GarageAccessList } from "./garage-access-list";

interface GarageAccessRow {
  id: string;
  garage: { name: string } | null;
}

const DEFECT_BADGE_CLASS: Record<string, string> = {
  DANGEROUS: "bg-red-700 text-white",
  MAJOR: "bg-orange-600 text-white",
  MINOR: "bg-yellow-500 text-black",
  ADVISORY: "bg-neutral-200 text-neutral-700",
};

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

export default async function VehiclePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
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
    .eq("id", id)
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
        .eq("vehicle_id", id)
        .order("entry_date", { ascending: false })
        .returns<ServiceEntry[]>(),
      supabase
        .from("mot_history")
        .select(
          "id, test_date, completed_at, expiry_date, result, odometer_value, odometer_unit, raw_data",
        )
        .eq("vehicle_id", id)
        .order("completed_at", { ascending: false })
        .returns<MotHistoryRow[]>(),
      supabase
        .from("file_attachments")
        .select("id, service_entry_id, storage_path, file_name")
        .eq("vehicle_id", id)
        .returns<Attachment[]>(),
    ]);

  // Signed URLs, not public ones — the bucket is private, so each link
  // is scoped to this request and expires rather than being shareable
  // indefinitely.
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

  const motStatus = computeMotStatus(motHistory?.[0] ?? null);
  const serviceStatus = computeServiceStatus(
    serviceEntries?.[0]?.entry_date ?? null,
  );

  const timeline = buildTimeline(serviceEntries ?? [], motHistory ?? []);

  const { data: accessGrants } = await supabase
    .from("vehicle_garage_access")
    .select("id, garage:garages(name)")
    .eq("vehicle_id", id)
    .is("revoked_at", null)
    .returns<GarageAccessRow[]>();

  const garageAccessGrants = (accessGrants ?? [])
    .filter((row) => row.garage !== null)
    .map((row) => ({ id: row.id, garageName: row.garage!.name }));

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-4 p-6">
      <Link href="/dashboard" className="text-sm text-neutral-500">
        ← Your vehicles
      </Link>

      <div>
        <h1 className="text-xl font-semibold">{vehicle.vrm}</h1>
        <p className="text-neutral-600">
          {[vehicle.make, vehicle.model, vehicle.colour, vehicle.fuel_type]
            .filter(Boolean)
            .join(" · ")}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <span
          className={`rounded px-2.5 py-1 text-xs font-medium ${REMINDER_BADGE_CLASS[motStatus.level]}`}
        >
          {motStatus.message}
        </span>
        <span
          className={`rounded px-2.5 py-1 text-xs font-medium ${REMINDER_BADGE_CLASS[serviceStatus.level]}`}
        >
          {serviceStatus.message}
        </span>
      </div>

      <InviteCodePanel vehicleId={id} />
      <GarageAccessList grants={garageAccessGrants} />

      <div className="flex gap-2">
        <Link
          href={`/dashboard/vehicles/${id}/add-entry`}
          className="flex-1 rounded bg-black px-4 py-2 text-center text-sm font-medium text-white"
        >
          Add service entry
        </Link>
        <a
          href={`/api/vehicles/${id}/export`}
          className="flex-1 rounded border border-neutral-300 px-4 py-2 text-center text-sm font-medium"
        >
          Export PDF
        </a>
      </div>

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
                {(item.entry.raw_data?.defects?.length ?? 0) > 0 && (
                  <details className="mt-2">
                    <summary className="cursor-pointer text-neutral-600">
                      {item.entry.raw_data!.defects!.length} defect
                      {item.entry.raw_data!.defects!.length === 1 ? "" : "s"}
                    </summary>
                    <ul className="mt-2 flex flex-col gap-1.5">
                      {item.entry.raw_data!.defects!.map((defect, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <span
                            className={`shrink-0 rounded px-1.5 py-0.5 text-xs font-medium uppercase ${
                              DEFECT_BADGE_CLASS[defect.type] ??
                              DEFECT_BADGE_CLASS.ADVISORY
                            }`}
                          >
                            {defect.type.toLowerCase()}
                          </span>
                          <span className="text-neutral-700">
                            {defect.text}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </details>
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
                {(attachmentsByEntry.get(item.entry.id) ?? []).map(
                  (attachment) =>
                    attachment.url ? (
                      <a
                        key={attachment.id}
                        href={attachment.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1 inline-block text-blue-700 underline"
                      >
                        📎 {attachment.fileName}
                      </a>
                    ) : (
                      <p key={attachment.id} className="mt-1 text-neutral-500">
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
