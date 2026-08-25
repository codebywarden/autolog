"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

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
      <h1 className="text-xl font-semibold">Add verified entry</h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <label className="flex flex-col gap-1 text-sm">
          Date
          <input
            type="date"
            value={entryDate}
            onChange={(event) => setEntryDate(event.target.value)}
            required
            className="rounded border border-neutral-300 px-3 py-2"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Mileage
          <input
            type="number"
            inputMode="numeric"
            min={0}
            value={mileage}
            onChange={(event) => setMileage(event.target.value)}
            placeholder="e.g. 84210"
            className="rounded border border-neutral-300 px-3 py-2"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Type
          <select
            value={serviceType}
            onChange={(event) =>
              setServiceType(
                event.target.value as (typeof SERVICE_TYPES)[number],
              )
            }
            className="rounded border border-neutral-300 px-3 py-2"
          >
            {SERVICE_TYPES.map((type) => (
              <option key={type} value={type}>
                {type[0].toUpperCase() + type.slice(1)}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Notes
          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            rows={3}
            className="rounded border border-neutral-300 px-3 py-2"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Invoice (photo or PDF, optional)
          <input
            type="file"
            accept="image/*,.pdf"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            className="text-sm"
          />
        </label>

        <button
          type="submit"
          disabled={saving}
          className="rounded bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save verified entry"}
        </button>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </form>
    </main>
  );
}
