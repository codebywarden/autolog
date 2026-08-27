import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  buildResolvableDefects,
  type MotHistoryRow,
  type ServiceEntry,
} from "@/lib/timeline";
import { EditEntryForm } from "./edit-entry-form";

interface AttachmentRow {
  id: string;
  storage_path: string;
  file_name: string | null;
  attachment_type: string;
}

export default async function EditEntryPage({
  params,
}: {
  params: Promise<{ id: string; entryId: string }>;
}) {
  const { id, entryId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: entry } = await supabase
    .from("service_entries")
    .select(
      "id, entry_date, mileage, service_type, cost, garage_name, notes, verified, resolved_mot_history_id, resolved_defect_index",
    )
    .eq("id", entryId)
    .eq("vehicle_id", id)
    .maybeSingle<ServiceEntry>();

  // A garage's verified entry isn't editable from the owner side (see
  // 0012_owner_entry_edit_delete.sql) — treat it the same as "not
  // found" here rather than showing a form that would just fail to save.
  if (!entry || entry.verified) {
    notFound();
  }

  const [{ data: motHistory }, { data: resolvedRows }, { data: attachments }] =
    await Promise.all([
      supabase
        .from("mot_history")
        .select(
          "id, test_date, completed_at, expiry_date, result, odometer_value, odometer_unit, raw_data",
        )
        .eq("vehicle_id", id)
        .order("completed_at", { ascending: false })
        .returns<MotHistoryRow[]>(),
      supabase
        .from("service_entries")
        .select("id, resolved_mot_history_id, resolved_defect_index")
        .eq("vehicle_id", id)
        .not("resolved_mot_history_id", "is", null),
      supabase
        .from("file_attachments")
        .select("id, storage_path, file_name, attachment_type")
        .eq("service_entry_id", entryId)
        .returns<AttachmentRow[]>(),
    ]);

  // Exclude this entry's own resolution from "already used" — otherwise
  // editing would make its currently-selected advisory disappear from
  // the options instead of showing as selected.
  const alreadyResolved = new Set(
    (resolvedRows ?? [])
      .filter((row) => row.id !== entryId)
      .map((row) => `${row.resolved_mot_history_id}:${row.resolved_defect_index}`),
  );

  const resolvableDefects = buildResolvableDefects(
    motHistory ?? [],
    alreadyResolved,
  );

  return (
    <EditEntryForm
      vehicleId={id}
      entry={entry}
      resolvableDefects={resolvableDefects}
      attachments={attachments ?? []}
    />
  );
}
