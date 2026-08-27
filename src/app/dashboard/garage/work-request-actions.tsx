"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { buttonStyles } from "@/components/ui/styles";
import { Field, TextInput, Textarea } from "@/components/ui/field";

export function WorkRequestActions({ requestId }: { requestId: string }) {
  const router = useRouter();
  const [mode, setMode] = useState<"idle" | "accepting" | "declining">("idle");
  const [scheduledDate, setScheduledDate] = useState("");
  const [responseNote, setResponseNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDecide(status: "accepted" | "declined") {
    setSaving(true);
    setError(null);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { error: updateError } = await supabase
      .from("work_requests")
      .update({
        status,
        scheduled_date: status === "accepted" ? scheduledDate || null : null,
        garage_response_note: responseNote || null,
        decided_by: user?.id,
        decided_at: new Date().toISOString(),
      })
      .eq("id", requestId);

    setSaving(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    router.refresh();
  }

  if (mode === "idle") {
    return (
      <div className="mt-2 flex items-center gap-3 text-xs font-semibold">
        <button
          type="button"
          onClick={() => setMode("accepting")}
          className="text-success underline underline-offset-2"
        >
          Accept
        </button>
        <button
          type="button"
          onClick={() => setMode("declining")}
          className="text-critical underline underline-offset-2"
        >
          Decline
        </button>
      </div>
    );
  }

  return (
    <div className="mt-2 flex flex-col gap-2">
      {mode === "accepting" && (
        <Field label="Scheduled date (optional)">
          <TextInput
            type="date"
            value={scheduledDate}
            onChange={(event) => setScheduledDate(event.target.value)}
          />
        </Field>
      )}
      <Field label="Note to the customer (optional)">
        <Textarea
          value={responseNote}
          onChange={(event) => setResponseNote(event.target.value)}
          rows={2}
        />
      </Field>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setMode("idle")}
          className={buttonStyles("secondary", "flex-1 py-1.5 text-xs")}
        >
          Back
        </button>
        <button
          type="button"
          onClick={() => handleDecide(mode === "accepting" ? "accepted" : "declined")}
          disabled={saving}
          className={buttonStyles(
            mode === "accepting" ? "primary" : "secondary",
            "flex-1 py-1.5 text-xs",
          )}
        >
          {saving
            ? "Saving…"
            : mode === "accepting"
              ? "Confirm accept"
              : "Confirm decline"}
        </button>
      </div>
      {error && <p className="text-xs text-critical">{error}</p>}
    </div>
  );
}
