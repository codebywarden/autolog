"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/**
 * A one-click shortcut for the same resolution mechanism the full
 * add-entry form already offers (linking a service entry to a
 * specific MOT defect) — creates a minimal entry rather than a new
 * data model, so the vehicle page's timeline stays the single source
 * of truth for what happened and when.
 */
export function MarkResolvedButton({
  vehicleId,
  motHistoryId,
  defectIndex,
}: {
  vehicleId: string;
  motHistoryId: string;
  defectIndex: number;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setSaving(true);
    setError(null);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError("Signed out — refresh and try again.");
      setSaving(false);
      return;
    }

    const { error: insertError } = await supabase.from("service_entries").insert({
      vehicle_id: vehicleId,
      created_by: user.id,
      entry_date: new Date().toISOString().slice(0, 10),
      service_type: "other",
      notes: "Marked resolved from My Dashboard",
      resolved_mot_history_id: motHistoryId,
      resolved_defect_index: defectIndex,
    });

    if (insertError) {
      setError(insertError.message);
      setSaving(false);
      return;
    }

    router.refresh();
  }

  return (
    <div className="flex flex-col items-end gap-0.5">
      <button
        onClick={handleClick}
        disabled={saving}
        className="shrink-0 text-xs font-medium text-primary underline underline-offset-2 disabled:opacity-50"
      >
        {saving ? "Marking…" : "Mark resolved"}
      </button>
      {error && <p className="text-xs text-critical">{error}</p>}
    </div>
  );
}
