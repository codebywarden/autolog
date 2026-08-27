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
  buildResolvableDefects,
  type ServiceEntry,
  type MotHistoryRow,
} from "@/lib/timeline";
import { computeMileageStats, type MileageReading } from "@/lib/mileage";
import { buttonStyles, cardStyles } from "@/components/ui/styles";

const ATTACHMENT_TYPE_LABELS: Record<string, string> = {
  invoice: "Invoice",
  receipt: "Receipt",
  mot_certificate: "MOT certificate",
  other: "Attachment",
};
import { InviteCodePanel } from "./invite-code-panel";
import { GarageAccessList } from "./garage-access-list";
import { SharePanel } from "./share-panel";
import { ShareLinkList } from "./share-link-list";
import { TransferPanel } from "./transfer-panel";
import { TransferCodeList } from "./transfer-code-list";
import { MotCostField } from "./mot-cost-field";
import { DeleteEntryButton } from "./delete-entry-button";
import { RequestVerificationControl } from "./request-verification-control";
import { RequestWorkPanel } from "./request-work-panel";
import { WorkRequestList } from "./work-request-list";

interface GarageAccessRow {
  id: string;
  garage_id: string;
  garage: { name: string } | null;
}

interface VerificationRequestRow {
  id: string;
  service_entry_id: string;
  status: "pending" | "approved" | "declined" | "cancelled";
  garage: { name: string } | null;
  created_at: string;
}

interface WorkRequestRow {
  id: string;
  notes: string;
  preferred_date: string | null;
  scheduled_date: string | null;
  status: "pending" | "accepted" | "declined" | "cancelled";
  garage_response_note: string | null;
  created_at: string;
  garage: { name: string } | null;
}

interface ShareLinkRow {
  id: string;
  expires_at: string;
  created_at: string;
}

const DEFECT_BADGE_CLASS: Record<string, string> = {
  DANGEROUS: "bg-critical-bg text-critical",
  MAJOR: "bg-critical-bg text-critical",
  MINOR: "bg-warning-bg text-warning",
  ADVISORY: "bg-neutral-badge-bg text-neutral-badge",
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
  storagePath: string;
}

interface ActivityLogRow {
  id: string;
  actor_label: string;
  action: string;
  detail: Record<string, unknown> | null;
  created_at: string;
}

function describeActivity(row: ActivityLogRow): string {
  switch (row.action) {
    case "vehicle_added":
      return `${row.actor_label} added this vehicle`;
    case "entry_added":
      return `${row.actor_label} added a service entry`;
    case "verified_entry_added":
      return `${row.actor_label} added a verified service entry`;
    case "verification_approved":
      return `${row.actor_label} verified a service entry`;
    case "verification_declined":
      return `${row.actor_label} declined to verify a service entry`;
    case "work_requested":
      return `${row.actor_label} requested work from a garage`;
    case "work_accepted":
      return `${row.actor_label} accepted a work request`;
    case "work_declined":
      return `${row.actor_label} declined a work request`;
    case "garage_access_granted":
      return `${row.actor_label} was granted access`;
    case "garage_access_revoked": {
      const garageName =
        (row.detail?.garage_name as string | undefined) ?? "a garage";
      return `${row.actor_label} revoked ${garageName}'s access`;
    }
    case "ownership_transferred": {
      const from = (row.detail?.from as string | undefined) ?? "the previous owner";
      const to = (row.detail?.to as string | undefined) ?? row.actor_label;
      return `Ownership transferred from ${from} to ${to}`;
    }
    default:
      return `${row.actor_label} — ${row.action}`;
  }
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
          "id, entry_date, mileage, service_type, garage_name, notes, verified, cost, resolved_mot_history_id, resolved_defect_index",
        )
        .eq("vehicle_id", id)
        .order("entry_date", { ascending: false })
        .returns<ServiceEntry[]>(),
      supabase
        .from("mot_history")
        .select(
          "id, test_date, completed_at, expiry_date, result, odometer_value, odometer_unit, raw_data, cost",
        )
        .eq("vehicle_id", id)
        .order("completed_at", { ascending: false })
        .returns<MotHistoryRow[]>(),
      supabase
        .from("file_attachments")
        .select("id, service_entry_id, storage_path, file_name, attachment_type")
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
      attachmentType: attachment.attachment_type,
      storagePath: attachment.storage_path,
    });
    attachmentsByEntry.set(attachment.service_entry_id, list);
  }

  const motStatus = computeMotStatus(motHistory?.[0] ?? null);
  const serviceStatus = computeServiceStatus(
    serviceEntries?.[0]?.entry_date ?? null,
  );

  const timeline = buildTimeline(serviceEntries ?? [], motHistory ?? []);

  const mileageReadings: MileageReading[] = [
    ...(motHistory ?? [])
      .filter((row) => row.odometer_value != null)
      .map((row) => ({ date: row.completed_at, mileage: row.odometer_value! })),
    ...(serviceEntries ?? [])
      .filter((row) => row.mileage != null)
      .map((row) => ({ date: row.entry_date, mileage: row.mileage! })),
  ];
  const mileageStats = computeMileageStats(
    mileageReadings,
    motHistory?.[0]?.expiry_date ?? null,
  );

  // Defects a later service entry has already resolved, keyed the same
  // way the "resolves" selector on the add-entry form builds its list.
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

  const resolvableDefects = buildResolvableDefects(
    motHistory ?? [],
    resolvedDefectKeys,
  );

  const { data: accessGrants } = await supabase
    .from("vehicle_garage_access")
    .select("id, garage_id, garage:garages(name)")
    .eq("vehicle_id", id)
    .is("revoked_at", null)
    .returns<GarageAccessRow[]>();

  const garageAccessGrants = (accessGrants ?? [])
    .filter((row) => row.garage !== null)
    .map((row) => ({ id: row.id, garageName: row.garage!.name }));

  const connectedGarages = (accessGrants ?? [])
    .filter((row) => row.garage !== null)
    .map((row) => ({ garageId: row.garage_id, garageName: row.garage!.name }));

  const { data: verificationRequestRows } = await supabase
    .from("entry_verification_requests")
    .select("id, service_entry_id, status, created_at, garage:garages(name)")
    .eq("vehicle_id", id)
    .order("created_at", { ascending: false })
    .returns<VerificationRequestRow[]>();

  // Latest request per entry — rows are already newest-first, so the
  // first one seen for a given entry is the one that matters.
  const latestVerificationRequestByEntry = new Map<
    string,
    VerificationRequestRow
  >();
  for (const row of verificationRequestRows ?? []) {
    if (!latestVerificationRequestByEntry.has(row.service_entry_id)) {
      latestVerificationRequestByEntry.set(row.service_entry_id, row);
    }
  }

  const { data: workRequestRows } = await supabase
    .from("work_requests")
    .select(
      "id, notes, preferred_date, scheduled_date, status, garage_response_note, created_at, garage:garages(name)",
    )
    .eq("vehicle_id", id)
    .order("created_at", { ascending: false })
    .returns<WorkRequestRow[]>();

  const workRequests = (workRequestRows ?? []).map((row) => ({
    id: row.id,
    notes: row.notes,
    preferredDate: row.preferred_date,
    scheduledDate: row.scheduled_date,
    status: row.status,
    garageResponseNote: row.garage_response_note,
    garageName: row.garage?.name ?? "the garage",
  }));

  const { data: shareLinkRows } = await supabase
    .from("vehicle_share_links")
    .select("id, expires_at, created_at")
    .eq("vehicle_id", id)
    .is("revoked_at", null)
    .order("created_at", { ascending: false })
    .returns<ShareLinkRow[]>();

  const shareLinks = (shareLinkRows ?? []).map((row) => ({
    id: row.id,
    expiresAt: row.expires_at,
    createdAt: row.created_at,
  }));

  const { data: transferCodeRows } = await supabase
    .from("vehicle_transfer_codes")
    .select("id, code, expires_at")
    .eq("vehicle_id", id)
    .is("redeemed_at", null)
    .is("revoked_at", null)
    .order("created_at", { ascending: false })
    .returns<{ id: string; code: string; expires_at: string }[]>();

  const transferCodes = (transferCodeRows ?? []).map((row) => ({
    id: row.id,
    code: row.code,
    expiresAt: row.expires_at,
  }));

  const { data: activityLog } = await supabase
    .from("activity_log")
    .select("id, actor_label, action, detail, created_at")
    .eq("vehicle_id", id)
    .order("created_at", { ascending: false })
    .returns<ActivityLogRow[]>();

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-5 p-6">
      <Link
        href="/dashboard"
        className="text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        ← My vehicles
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

      <div className="flex flex-wrap gap-2">
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

      {mileageStats && (
        <p className="text-sm text-muted-foreground">
          ~{mileageStats.avgPerYear.toLocaleString()} mi/year · est.{" "}
          {mileageStats.estimatedYtd.toLocaleString()} mi this year
          {mileageStats.projectedAtNextMot != null &&
            ` · ~${mileageStats.projectedAtNextMot.toLocaleString()} mi by next MOT`}
        </p>
      )}

      <div className="flex gap-2">
        <Link
          href={`/dashboard/vehicles/${id}/add-entry`}
          className={buttonStyles("primary", "flex-1")}
        >
          Add service entry
        </Link>
        <a
          href={`/api/vehicles/${id}/export`}
          className={buttonStyles("secondary", "flex-1")}
        >
          Export PDF
        </a>
      </div>

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
                <p className="mt-0.5">
                  <MotCostField motHistoryId={item.entry.id} cost={item.entry.cost} />
                </p>
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
                {!item.entry.verified && (
                  <>
                    <div className="mt-2 flex gap-3 text-xs font-medium">
                      <Link
                        href={`/dashboard/vehicles/${id}/entries/${item.entry.id}/edit`}
                        className="text-primary underline underline-offset-2 hover:text-primary-hover"
                      >
                        Edit
                      </Link>
                      <DeleteEntryButton
                        entryId={item.entry.id}
                        attachmentPaths={(attachmentsByEntry.get(item.entry.id) ?? []).map(
                          (attachment) => attachment.storagePath,
                        )}
                      />
                    </div>
                    <RequestVerificationControl
                      vehicleId={id}
                      entryId={item.entry.id}
                      connectedGarages={connectedGarages}
                      existingRequest={
                        latestVerificationRequestByEntry.has(item.entry.id)
                          ? {
                              id: latestVerificationRequestByEntry.get(item.entry.id)!.id,
                              status: latestVerificationRequestByEntry.get(item.entry.id)!
                                .status,
                              garageName:
                                latestVerificationRequestByEntry.get(item.entry.id)!.garage
                                  ?.name ?? "the garage",
                            }
                          : null
                      }
                    />
                  </>
                )}
              </li>
            ),
          )}
        </ul>
      )}

      {activityLog && activityLog.length > 0 && (
        <details className={cardStyles("text-sm")}>
          <summary className="cursor-pointer font-semibold text-foreground">
            Activity log
          </summary>
          <ul className="mt-2 flex flex-col gap-1.5">
            {activityLog.map((row) => (
              <li key={row.id} className="text-muted-foreground">
                <span className="font-mono text-xs text-muted-foreground/80">
                  {row.created_at.slice(0, 10)}
                </span>{" "}
                {describeActivity(row)}
              </li>
            ))}
          </ul>
        </details>
      )}

      {(connectedGarages.length > 0 || workRequests.length > 0) && (
        <div className="mt-4 flex flex-col gap-3 border-t border-border pt-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Book work
          </p>
          {connectedGarages.length > 0 && (
            <RequestWorkPanel
              vehicleId={id}
              connectedGarages={connectedGarages}
              resolvableDefects={resolvableDefects}
            />
          )}
          <WorkRequestList requests={workRequests} />
        </div>
      )}

      <div className="mt-4 flex flex-col gap-3 border-t border-border pt-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Access &amp; sharing
        </p>
        <InviteCodePanel vehicleId={id} />
        <GarageAccessList grants={garageAccessGrants} />
        <SharePanel vehicleId={id} />
        <ShareLinkList links={shareLinks} />
      </div>

      <div className="flex flex-col gap-3">
        <TransferPanel vehicleId={id} />
        <TransferCodeList codes={transferCodes} />
      </div>
    </main>
  );
}
