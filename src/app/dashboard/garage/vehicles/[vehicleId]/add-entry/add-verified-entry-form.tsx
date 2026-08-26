"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { buttonStyles } from "@/components/ui/styles";
import { Field, TextInput, Select, Textarea } from "@/components/ui/field";

const SERVICE_TYPES = [
  "service",
  "repair",
  "tyres",
  "brakes",
  "battery",
  "modification",
  "other",
] as const;

export function AddVerifiedEntryForm({
  vehicleId,
  garageId,
}: {
  vehicleId: string;
  garageId: string;
}) {
  const router = useRouter();
  const [entryDate, setEntryDate] = useState(() =>
    new Date().toISOString().slice(0, 10),
  );
  const [mileage, setMileage] = useState("");
  const [serviceType, setServiceType] =
    useState<(typeof SERVICE_TYPES)[number]>("service");
  const [notes, setNotes] = useState("");
  const [file, setFile] = useState<File | null>(null);
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

      const { data: entry, error: insertError } = await supabase
        .from("service_entries")
        .insert({
          vehicle_id: vehicleId,
          created_by: user.id,
          garage_id: garageId,
          verified: true,
          entry_date: entryDate,
          mileage: mileage ? Number(mileage) : null,
          service_type: serviceType,
          notes: notes || null,
        })
        .select("id")
        .single();

      if (insertError || !entry) {
        setError(insertError?.message ?? "Failed to save entry");
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
          });

        if (attachmentError) {
          setError(
            `Entry saved, but the attachment record failed: ${attachmentError.message}`,
          );
          setSaving(false);
          return;
        }
      }

      router.push(`/dashboard/garage/vehicles/${vehicleId}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save entry");
      setSaving(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col gap-4 p-6">
      <h1 className="text-2xl font-bold tracking-tight text-foreground">
        Add verified entry
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

        <Field label="Notes">
          <Textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            rows={3}
          />
        </Field>

        <Field label="Invoice (photo or PDF, optional)">
          <input
            type="file"
            accept="image/*,.pdf"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            className="text-sm text-muted-foreground file:mr-3 file:rounded-lg file:border file:border-border file:bg-surface file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-foreground"
          />
        </Field>

        <button type="submit" disabled={saving} className={buttonStyles("primary")}>
          {saving ? "Saving…" : "Save verified entry"}
        </button>
        {error && <p className="text-sm text-critical">{error}</p>}
      </form>
    </main>
  );
}
