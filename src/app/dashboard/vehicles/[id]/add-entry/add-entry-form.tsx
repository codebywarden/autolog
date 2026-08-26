"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { buttonStyles } from "@/components/ui/styles";
import { Field, TextInput, Select, Textarea } from "@/components/ui/field";
import type { ResolvableDefect } from "@/lib/timeline";

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

export function AddEntryForm({
  vehicleId,
  resolvableDefects,
}: {
  vehicleId: string;
  resolvableDefects: ResolvableDefect[];
}) {
  const router = useRouter();
  const [entryDate, setEntryDate] = useState(() =>
    new Date().toISOString().slice(0, 10),
  );
  const [mileage, setMileage] = useState("");
  const [serviceType, setServiceType] =
    useState<(typeof SERVICE_TYPES)[number]>("service");
  const [garageName, setGarageName] = useState("");
  const [notes, setNotes] = useState("");
  const [resolvesKey, setResolvesKey] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [attachmentType, setAttachmentType] =
    useState<(typeof ATTACHMENT_TYPES)[number]>("invoice");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

      const { data: entry, error: entryError } = await supabase
        .from("service_entries")
        .insert({
          vehicle_id: vehicleId,
          created_by: user.id,
          entry_date: entryDate,
          mileage: mileage ? Number(mileage) : null,
          service_type: serviceType,
          garage_name: garageName || null,
          notes: notes || null,
          resolved_mot_history_id: resolvedMotHistoryId,
          resolved_defect_index:
            resolvedDefectIndex != null ? Number(resolvedDefectIndex) : null,
        })
        .select("id")
        .single();

      if (entryError || !entry) {
        setError(entryError?.message ?? "Failed to save entry");
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
        Add service entry
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

        <Field label="Invoice (photo or PDF, optional)">
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
          {saving ? "Saving…" : "Save entry"}
        </button>
        {error && <p className="text-sm text-critical">{error}</p>}
      </form>
    </main>
  );
}
