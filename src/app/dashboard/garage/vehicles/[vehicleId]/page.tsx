import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  buildTimeline,
  type ServiceEntry,
  type MotHistoryRow,
} from "@/lib/timeline";
import { buttonStyles, cardStyles } from "@/components/ui/styles";

const DEFECT_BADGE_CLASS: Record<string, string> = {
  DANGEROUS: "bg-critical-bg text-critical",
  MAJOR: "bg-critical-bg text-critical",
  MINOR: "bg-warning-bg text-warning",
  ADVISORY: "bg-neutral-badge-bg text-neutral-badge",
};

const ATTACHMENT_TYPE_LABELS: Record<string, string> = {
  invoice: "Invoice",
  receipt: "Receipt",
  mot_certificate: "MOT certificate",
  other: "Attachment",
};

interface Attachment {
  id: string;
  service_entry_id: string | null;
  storage_path: string;
  file_name: string | null;
  attachment_type: string;
}

interface AttachmentLink {
  id: string;
  fileName: string;
  url: string | null;
  attachmentType: string;
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
          "id, entry_date, mileage, service_type, garage_name, notes, verified, cost, resolved_mot_history_id, resolved_defect_index",
        )
        .eq("vehicle_id", vehicleId)
        .order("entry_date", { ascending: false })
        .returns<ServiceEntry[]>(),
      supabase
        .from("mot_history")
        .select(
          "id, test_date, completed_at, expiry_date, result, odometer_value, odometer_unit, raw_data, cost",
        )
        .eq("vehicle_id", vehicleId)
        .order("completed_at", { ascending: false })
        .returns<MotHistoryRow[]>(),
      supabase
        .from("file_attachments")
        .select("id, service_entry_id, storage_path, file_name, attachment_type")
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
      attachmentType: attachment.attachment_type,
    });
    attachmentsByEntry.set(attachment.service_entry_id, list);
  }

  const timeline = buildTimeline(serviceEntries ?? [], motHistory ?? []);

  const resolvedDefectKeys = new Set(
    (serviceEntries ?? [])
      .filter((entry) => entry.resolved_mot_history_id != null)
      .map((entry) => `${entry.resolved_mot_history_id}:${entry.resolved_defect_index}`),
  );

  const motHistoryById = new Map((motHistory ?? []).map((row) => [row.id, row]));
  function describeResolvedDefect(entry: ServiceEntry): string | null {
    if (entry.resolved_mot_history_id == null || entry.resolved_defect_index == null) {
      return null;
    }
    const test = motHistoryById.get(entry.resolved_mot_history_id);
    const defect = test?.raw_data?.defects?.[entry.resolved_defect_index];
    return defect ? `Resolves: ${defect.text}` : null;
  }

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
                {item.entry.cost != null && (
                  <p className="text-muted-foreground">
                    £{item.entry.cost.toFixed(2)}
                  </p>
                )}
                {(item.entry.raw_data?.defects?.length ?? 0) > 0 && (
                  <details className="mt-2">
                    <summary className="cursor-pointer text-muted-foreground">
                      {item.entry.raw_data!.defects!.length} defect
                      {item.entry.raw_data!.defects!.length === 1 ? "" : "s"}
                    </summary>
                    <ul className="mt-2 flex flex-col gap-1.5">
                      {item.entry.raw_data!.defects!.map((defect, index) => {
                        const resolved = resolvedDefectKeys.has(
                          `${item.entry.id}:${index}`,
                        );
                        return (
                          <li key={index} className="flex items-start gap-2">
                            <span
                              className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold uppercase ${
                                DEFECT_BADGE_CLASS[defect.type] ??
                                DEFECT_BADGE_CLASS.ADVISORY
                              }`}
                            >
                              {defect.type.toLowerCase()}
                            </span>
                            <span
                              className={
                                resolved
                                  ? "text-muted-foreground line-through"
                                  : "text-muted-foreground"
                              }
                            >
                              {defect.text}
                            </span>
                            {resolved && (
                              <span className="shrink-0 text-xs font-medium text-success">
                                Resolved
                              </span>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  </details>
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
                {item.entry.cost != null && (
                  <p className="text-muted-foreground">
                    £{item.entry.cost.toFixed(2)}
                  </p>
                )}
                {item.entry.garage_name && (
                  <p className="text-foreground">{item.entry.garage_name}</p>
                )}
                {item.entry.notes && (
                  <p className="text-muted-foreground">{item.entry.notes}</p>
                )}
                {describeResolvedDefect(item.entry) && (
                  <p className="text-success">{describeResolvedDefect(item.entry)}</p>
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
                        📎 {ATTACHMENT_TYPE_LABELS[attachment.attachmentType] ?? "Attachment"}: {attachment.fileName}
                      </a>
                    ) : (
                      <p key={attachment.id} className="mt-1 text-muted-foreground">
                        📎 {ATTACHMENT_TYPE_LABELS[attachment.attachmentType] ?? "Attachment"}: {attachment.fileName} (link unavailable)
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
