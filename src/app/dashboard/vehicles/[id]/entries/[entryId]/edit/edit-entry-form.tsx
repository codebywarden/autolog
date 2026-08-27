"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { buttonStyles, cardStyles } from "@/components/ui/styles";
import { Field, TextInput, Select, Textarea } from "@/components/ui/field";
import type { ResolvableDefect, ServiceEntry } from "@/lib/timeline";

const SERVICE_TYPES = [
  "service",
  "repair",
  "tyres",
  "brakes",
  "battery",
  "modification",
  "other",
] as const;

const ATTACHMENT_TYPES = [
  "invoice",
  "receipt",
  "mot_certificate",
  "other",
] as const;

const ATTACHMENT_TYPE_LABELS: Record<(typeof ATTACHMENT_TYPES)[number], string> = {
  invoice: "Invoice",
  receipt: "Receipt",
  mot_certificate: "MOT certificate",
  other: "Other",
};

interface ExistingAttachment {
  id: string;
  storage_path: string;
  file_name: string | null;
  attachment_type: string;
}

export function EditEntryForm({
  vehicleId,
  entry,
  resolvableDefects,
  attachments,
}: {
  vehicleId: string;
  entry: ServiceEntry;
  resolvableDefects: ResolvableDefect[];
  attachments: ExistingAttachment[];
}) {
  const router = useRouter();
  const [entryDate, setEntryDate] = useState(entry.entry_date);
  const [mileage, setMileage] = useState(
    entry.mileage != null ? String(entry.mileage) : "",
  );
  const [serviceType, setServiceType] = useState<(typeof SERVICE_TYPES)[number]>(
    entry.service_type as (typeof SERVICE_TYPES)[number],
  );
  const [cost, setCost] = useState(entry.cost != null ? String(entry.cost) : "");
  const [garageName, setGarageName] = useState(entry.garage_name ?? "");
  const [notes, setNotes] = useState(entry.notes ?? "");
  const [resolvesKey, setResolvesKey] = useState(
    entry.resolved_mot_history_id
      ? `${entry.resolved_mot_history_id}:${entry.resolved_defect_index}`
      : "",
  );
  const [existingAttachments, setExistingAttachments] = useState(attachments);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [attachmentType, setAttachmentType] =
    useState<(typeof ATTACHMENT_TYPES)[number]>("invoice");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleRemoveAttachment(attachment: ExistingAttachment) {
    if (!confirm("Remove this attachment?")) return;

    setRemovingId(attachment.id);
    const supabase = createClient();

    await supabase.storage.from("invoices").remove([attachment.storage_path]);
    const { error: deleteError } = await supabase
      .from("file_attachments")
      .delete()
      .eq("id", attachment.id);

    setRemovingId(null);

    if (deleteError) {
      setError(deleteError.message);
      return;
    }

    setExistingAttachments((current) =>
      current.filter((item) => item.id !== attachment.id),
    );
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setError("You've been signed out — please log in again.");
        setSaving(false);
        return;
      }

      const [resolvedMotHistoryId, resolvedDefectIndex] = resolvesKey
        ? resolvesKey.split(":")
        : [null, null];

      const { error: updateError } = await supabase
        .from("service_entries")
        .update({
          entry_date: entryDate,
          mileage: mileage ? Number(mileage) : null,
          service_type: serviceType,
          cost: cost ? Number(cost) : null,
          garage_name: garageName || null,
          notes: notes || null,
          resolved_mot_history_id: resolvedMotHistoryId,
          resolved_defect_index:
            resolvedDefectIndex != null ? Number(resolvedDefectIndex) : null,
        })
        .eq("id", entry.id);

      if (updateError) {
        setError(updateError.message);
        setSaving(false);
        return;
      }

      if (file) {
        const path = `${vehicleId}/${entry.id}-${file.name}`;
        const { error: uploadError } = await supabase.storage
          .from("invoices")
          .upload(path, file);

        if (uploadError) {
          setError(
            `Entry saved, but the file didn't upload: ${uploadError.message}`,
          );
          setSaving(false);
          return;
        }

        const { error: attachmentError } = await supabase
          .from("file_attachments")
          .insert({
            vehicle_id: vehicleId,
            service_entry_id: entry.id,
            uploaded_by: user.id,
            storage_path: path,
            file_name: file.name,
            mime_type: file.type,
            attachment_type: attachmentType,
          });

        if (attachmentError) {
          setError(
            `Entry saved, but the attachment record failed: ${attachmentError.message}`,
          );
          setSaving(false);
          return;
        }
      }

      router.push(`/dashboard/vehicles/${vehicleId}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save entry");
      setSaving(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col gap-4 p-6">
      <h1 className="text-2xl font-bold tracking-tight text-foreground">
        Edit entry
      </h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <Field label="Date">
          <TextInput
            type="date"
            value={entryDate}
            onChange={(event) => setEntryDate(event.target.value)}
            required
          />
        </Field>

        <Field label="Mileage">
          <TextInput
            type="number"
            inputMode="numeric"
            min={0}
            value={mileage}
            onChange={(event) => setMileage(event.target.value)}
            placeholder="e.g. 84210"
          />
        </Field>

        <Field label="Type">
          <Select
            value={serviceType}
            onChange={(event) =>
              setServiceType(
                event.target.value as (typeof SERVICE_TYPES)[number],
              )
            }
          >
            {SERVICE_TYPES.map((type) => (
              <option key={type} value={type}>
                {type[0].toUpperCase() + type.slice(1)}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Cost (£)">
          <TextInput
            type="number"
            inputMode="decimal"
            min={0}
            step="0.01"
            value={cost}
            onChange={(event) => setCost(event.target.value)}
            placeholder="e.g. 189.99"
          />
        </Field>

        <Field label="Garage">
          <TextInput
            type="text"
            value={garageName}
            onChange={(event) => setGarageName(event.target.value)}
            placeholder="e.g. Smith's Garage"
          />
        </Field>

        <Field label="Notes">
          <Textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            rows={3}
          />
        </Field>

        {resolvableDefects.length > 0 && (
          <Field label="Resolves a previous MOT advisory (optional)">
            <Select
              value={resolvesKey}
              onChange={(event) => setResolvesKey(event.target.value)}
            >
              <option value="">— not related to a specific advisory —</option>
              {resolvableDefects.map((defect) => (
                <option
                  key={`${defect.motHistoryId}:${defect.defectIndex}`}
                  value={`${defect.motHistoryId}:${defect.defectIndex}`}
                >
                  {defect.label}
                </option>
              ))}
            </Select>
          </Field>
        )}

        {existingAttachments.length > 0 && (
          <div className={cardStyles("flex flex-col gap-1.5 text-sm")}>
            <p className="font-medium text-foreground">Attachments</p>
            {existingAttachments.map((attachment) => (
              <div
                key={attachment.id}
                className="flex items-center justify-between gap-2"
              >
                <span className="text-muted-foreground">
                  📎 {ATTACHMENT_TYPE_LABELS[
                    attachment.attachment_type as (typeof ATTACHMENT_TYPES)[number]
                  ] ?? "Attachment"}: {attachment.file_name ?? "Attachment"}
                </span>
                <button
                  type="button"
                  onClick={() => handleRemoveAttachment(attachment)}
                  disabled={removingId === attachment.id}
                  className="shrink-0 text-critical underline underline-offset-2 disabled:opacity-50"
                >
                  {removingId === attachment.id ? "Removing…" : "Remove"}
                </button>
              </div>
            ))}
          </div>
        )}

        <Field label="Add another attachment (photo or PDF, optional)">
          <input
            type="file"
            accept="image/*,.pdf"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            className="text-sm text-muted-foreground file:mr-3 file:rounded-lg file:border file:border-border file:bg-surface file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-foreground"
          />
        </Field>

        {file && (
          <Field label="Attachment type">
            <Select
              value={attachmentType}
              onChange={(event) =>
                setAttachmentType(
                  event.target.value as (typeof ATTACHMENT_TYPES)[number],
                )
              }
            >
              {ATTACHMENT_TYPES.map((type) => (
                <option key={type} value={type}>
                  {ATTACHMENT_TYPE_LABELS[type]}
                </option>
              ))}
            </Select>
          </Field>
        )}

        <button type="submit" disabled={saving} className={buttonStyles("primary")}>
          {saving ? "Saving…" : "Save changes"}
        </button>
        {error && <p className="text-sm text-critical">{error}</p>}
      </form>
    </main>
  );
}
