"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// The DVSA API has no concept of what an owner actually paid for a test,
// so unlike every other mot_history field this one is user-editable —
// backed by the narrow "log a cost" update policy in
// 0011_entry_costs.sql rather than the read-only policy the rest of the
// table relies on.
export function MotCostField({
  motHistoryId,
  cost,
}: {
  motHistoryId: string;
  cost: number | null;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(cost != null ? String(cost) : "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setSaving(true);
    setError(null);

    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("mot_history")
      .update({ cost: value ? Number(value) : null })
      .eq("id", motHistoryId);

    setSaving(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setEditing(false);
    router.refresh();
  }

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="text-muted-foreground underline decoration-dotted underline-offset-2 hover:text-foreground"
      >
        {cost != null ? `£${cost.toFixed(2)}` : "Add cost"}
      </button>
    );
  }

  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      <input
        type="number"
        inputMode="decimal"
        min={0}
        step={0.01}
        autoFocus
        value={value}
        onChange={(event) => setValue(event.target.value)}
        className="w-20 rounded-md border border-border bg-surface px-1.5 py-0.5 text-xs text-foreground"
      />
      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        className="text-xs font-semibold text-primary hover:text-primary-hover"
      >
        {saving ? "Saving…" : "Save"}
      </button>
      <button
        type="button"
        onClick={() => {
          setEditing(false);
          setValue(cost != null ? String(cost) : "");
          setError(null);
        }}
        className="text-xs text-muted-foreground hover:text-foreground"
      >
        Cancel
      </button>
      {error && <span className="text-xs text-critical">{error}</span>}
    </span>
  );
}
