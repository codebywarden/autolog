"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { buttonStyles } from "@/components/ui/styles";
import { Field, TextInput, Select, Textarea } from "@/components/ui/field";
import type { ResolvableDefect } from "@/lib/timeline";

interface ConnectedGarage {
  garageId: string;
  garageName: string;
}

export function RequestWorkPanel({
  vehicleId,
  connectedGarages,
  resolvableDefects,
}: {
  vehicleId: string;
  connectedGarages: ConnectedGarage[];
  resolvableDefects: ResolvableDefect[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [garageId, setGarageId] = useState(connectedGarages[0]?.garageId ?? "");
  const [notes, setNotes] = useState("");
  const [preferredDate, setPreferredDate] = useState("");
  const [relatesToKey, setRelatesToKey] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError("You've been signed out — please log in again.");
      setSaving(false);
      return;
    }

    const [resolvedMotHistoryId, resolvedDefectIndex] = relatesToKey
      ? relatesToKey.split(":")
      : [null, null];

    const { error: insertError } = await supabase.from("work_requests").insert({
      vehicle_id: vehicleId,
      garage_id: garageId,
      requested_by: user.id,
      notes,
      preferred_date: preferredDate || null,
      resolved_mot_history_id: resolvedMotHistoryId,
      resolved_defect_index:
        resolvedDefectIndex != null ? Number(resolvedDefectIndex) : null,
    });

    setSaving(false);

    if (insertError) {
      setError(insertError.message);
      return;
    }

    setOpen(false);
    setNotes("");
    setPreferredDate("");
    setRelatesToKey("");
    router.refresh();
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={buttonStyles("secondary")}
      >
        Request work from a garage
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      {connectedGarages.length > 1 && (
        <Field label="Garage">
          <Select
            value={garageId}
            onChange={(event) => setGarageId(event.target.value)}
          >
            {connectedGarages.map((garage) => (
              <option key={garage.garageId} value={garage.garageId}>
                {garage.garageName}
              </option>
            ))}
          </Select>
        </Field>
      )}

      <Field label="What do you need doing?">
        <Textarea
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          rows={3}
          required
          placeholder="e.g. Front brake pads need replacing"
        />
      </Field>

      <Field label="Preferred date (optional)">
        <TextInput
          type="date"
          value={preferredDate}
          onChange={(event) => setPreferredDate(event.target.value)}
        />
      </Field>

      {resolvableDefects.length > 0 && (
        <Field label="Relates to a previous MOT advisory (optional)">
          <Select
            value={relatesToKey}
            onChange={(event) => setRelatesToKey(event.target.value)}
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

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setOpen(false)}
          className={buttonStyles("secondary", "flex-1")}
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving}
          className={buttonStyles("primary", "flex-1")}
        >
          {saving ? "Sending…" : "Send request"}
        </button>
      </div>
      {error && <p className="text-sm text-critical">{error}</p>}
    </form>
  );
}
