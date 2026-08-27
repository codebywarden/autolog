"use client";

import { useState } from "react";
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

type Mode = "idle" | "rescheduling" | "cancelling" | "completing";

export function AcceptedJobActions({
  requestId,
  currentDate,
  currentTime,
  defaultNotes,
}: {
  requestId: string;
  currentDate: string | null;
  currentTime: string | null;
  defaultNotes: string;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("idle");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [scheduledDate, setScheduledDate] = useState(currentDate ?? "");
  const [scheduledTime, setScheduledTime] = useState(currentTime?.slice(0, 5) ?? "");
  const [rescheduleNote, setRescheduleNote] = useState("");

  const [serviceType, setServiceType] =
    useState<(typeof SERVICE_TYPES)[number]>("service");
  const [entryDate, setEntryDate] = useState(() =>
    new Date().toISOString().slice(0, 10),
  );
  const [mileage, setMileage] = useState("");
  const [cost, setCost] = useState("");
  const [completionNotes, setCompletionNotes] = useState(defaultNotes);

  function reset() {
    setMode("idle");
    setError(null);
  }

  async function handleReschedule() {
    setSaving(true);
    setError(null);

    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("work_requests")
      .update({
        scheduled_date: scheduledDate || null,
        scheduled_time: scheduledTime || null,
        garage_response_note: rescheduleNote || null,
      })
      .eq("id", requestId);

    setSaving(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    router.refresh();
  }

  async function handleCancel() {
    setSaving(true);
    setError(null);

    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("work_requests")
      .update({
        status: "cancelled",
        garage_response_note: rescheduleNote || null,
      })
      .eq("id", requestId);

    setSaving(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    router.refresh();
  }

  async function handleComplete() {
    setSaving(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/garage/work-requests/${requestId}/complete`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            serviceType,
            entryDate,
            mileage: mileage ? Number(mileage) : null,
            cost: cost ? Number(cost) : null,
            notes: completionNotes,
          }),
        },
      );
      const responseBody = await response.json();

      if (!response.ok) {
        setError(responseBody.error ?? "Failed to complete this job");
        setSaving(false);
        return;
      }

      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to complete this job");
      setSaving(false);
    }
  }

  if (mode === "idle") {
    return (
      <div className="mt-2 flex items-center gap-3 text-xs font-semibold">
        <button
          type="button"
          onClick={() => setMode("completing")}
          className="text-success underline underline-offset-2"
        >
          Mark completed
        </button>
        <button
          type="button"
          onClick={() => setMode("rescheduling")}
          className="text-primary underline underline-offset-2"
        >
          Reschedule
        </button>
        <button
          type="button"
          onClick={() => setMode("cancelling")}
          className="text-critical underline underline-offset-2"
        >
          Cancel
        </button>
      </div>
    );
  }

  if (mode === "rescheduling") {
    return (
      <div className="mt-2 flex flex-col gap-2">
        <div className="flex gap-2">
          <Field label="Date">
            <TextInput
              type="date"
              value={scheduledDate}
              onChange={(event) => setScheduledDate(event.target.value)}
            />
          </Field>
          <Field label="Time (optional)">
            <TextInput
              type="time"
              value={scheduledTime}
              onChange={(event) => setScheduledTime(event.target.value)}
            />
          </Field>
        </div>
        <Field label="Note to the customer (optional)">
          <Textarea
            value={rescheduleNote}
            onChange={(event) => setRescheduleNote(event.target.value)}
            rows={2}
          />
        </Field>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={reset}
            className={buttonStyles("secondary", "flex-1 py-1.5 text-xs")}
          >
            Back
          </button>
          <button
            type="button"
            onClick={handleReschedule}
            disabled={saving}
            className={buttonStyles("primary", "flex-1 py-1.5 text-xs")}
          >
            {saving ? "Saving…" : "Save new time"}
          </button>
        </div>
        {error && <p className="text-xs text-critical">{error}</p>}
      </div>
    );
  }

  if (mode === "cancelling") {
    return (
      <div className="mt-2 flex flex-col gap-2">
        <Field label="Note to the customer (optional)">
          <Textarea
            value={rescheduleNote}
            onChange={(event) => setRescheduleNote(event.target.value)}
            rows={2}
            placeholder="e.g. Sorry, we can no longer fit this in"
          />
        </Field>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={reset}
            className={buttonStyles("secondary", "flex-1 py-1.5 text-xs")}
          >
            Back
          </button>
          <button
            type="button"
            onClick={handleCancel}
            disabled={saving}
            className={buttonStyles("danger", "flex-1 py-1.5 text-xs")}
          >
            {saving ? "Cancelling…" : "Confirm cancel"}
          </button>
        </div>
        {error && <p className="text-xs text-critical">{error}</p>}
      </div>
    );
  }

  return (
    <div className="mt-2 flex flex-col gap-2">
      <div className="flex gap-2">
        <Field label="Date">
          <TextInput
            type="date"
            value={entryDate}
            onChange={(event) => setEntryDate(event.target.value)}
          />
        </Field>
        <Field label="Type">
          <Select
            value={serviceType}
            onChange={(event) =>
              setServiceType(event.target.value as (typeof SERVICE_TYPES)[number])
            }
          >
            {SERVICE_TYPES.map((type) => (
              <option key={type} value={type}>
                {type[0].toUpperCase() + type.slice(1)}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <div className="flex gap-2">
        <Field label="Mileage (optional)">
          <TextInput
            type="number"
            inputMode="numeric"
            min={0}
            value={mileage}
            onChange={(event) => setMileage(event.target.value)}
          />
        </Field>
        <Field label="Cost (£, optional)">
          <TextInput
            type="number"
            inputMode="decimal"
            min={0}
            step="0.01"
            value={cost}
            onChange={(event) => setCost(event.target.value)}
          />
        </Field>
      </div>
      <Field label="Notes for the vehicle record">
        <Textarea
          value={completionNotes}
          onChange={(event) => setCompletionNotes(event.target.value)}
          rows={2}
        />
      </Field>
      <p className="text-muted-foreground">
        This creates a verified entry on the vehicle&apos;s record.
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={reset}
          className={buttonStyles("secondary", "flex-1 py-1.5 text-xs")}
        >
          Back
        </button>
        <button
          type="button"
          onClick={handleComplete}
          disabled={saving}
          className={buttonStyles("primary", "flex-1 py-1.5 text-xs")}
        >
          {saving ? "Saving…" : "Confirm completed"}
        </button>
      </div>
      {error && <p className="text-xs text-critical">{error}</p>}
    </div>
  );
}
