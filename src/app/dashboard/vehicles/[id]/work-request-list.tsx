"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { cardStyles } from "@/components/ui/styles";

interface WorkRequest {
  id: string;
  notes: string;
  preferredDate: string | null;
  scheduledDate: string | null;
  status: "pending" | "accepted" | "declined" | "cancelled";
  garageResponseNote: string | null;
  garageName: string;
}

const STATUS_BADGE_CLASS: Record<WorkRequest["status"], string> = {
  pending: "bg-neutral-badge-bg text-neutral-badge",
  accepted: "bg-success-bg text-success",
  declined: "bg-critical-bg text-critical",
  cancelled: "bg-neutral-badge-bg text-neutral-badge",
};

const STATUS_LABEL: Record<WorkRequest["status"], string> = {
  pending: "Pending",
  accepted: "Accepted",
  declined: "Declined",
  cancelled: "Cancelled",
};

export function WorkRequestList({ requests }: { requests: WorkRequest[] }) {
  const router = useRouter();
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleCancel(requestId: string) {
    setCancellingId(requestId);
    setError(null);

    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("work_requests")
      .update({ status: "cancelled" })
      .eq("id", requestId);

    setCancellingId(null);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    router.refresh();
  }

  if (requests.length === 0) {
    return null;
  }

  return (
    <ul className="flex flex-col gap-2">
      {requests.map((request) => (
        <li key={request.id} className={cardStyles("text-sm")}>
          <div className="flex items-center justify-between gap-2">
            <span className="font-medium text-foreground">
              {request.garageName}
            </span>
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-semibold uppercase ${STATUS_BADGE_CLASS[request.status]}`}
            >
              {STATUS_LABEL[request.status]}
            </span>
          </div>
          <p className="mt-0.5 text-muted-foreground">{request.notes}</p>
          {request.preferredDate && (
            <p className="text-muted-foreground">
              Preferred: {request.preferredDate}
            </p>
          )}
          {request.status === "accepted" && request.scheduledDate && (
            <p className="text-success">Scheduled: {request.scheduledDate}</p>
          )}
          {request.garageResponseNote && (
            <p className="text-muted-foreground">
              “{request.garageResponseNote}”
            </p>
          )}
          {request.status === "pending" && (
            <button
              type="button"
              onClick={() => handleCancel(request.id)}
              disabled={cancellingId === request.id}
              className="mt-1 text-xs font-medium text-critical underline underline-offset-2 disabled:opacity-50"
            >
              {cancellingId === request.id ? "Cancelling…" : "Cancel request"}
            </button>
          )}
        </li>
      ))}
      {error && <p className="text-sm text-critical">{error}</p>}
    </ul>
  );
}
