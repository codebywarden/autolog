"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { cardStyles } from "@/components/ui/styles";
import { WorkRequestThread, type WorkRequestMessage } from "@/components/work-request-thread";

interface WorkRequest {
  id: string;
  notes: string;
  preferredDate: string | null;
  scheduledDate: string | null;
  scheduledTime: string | null;
  status: "pending" | "accepted" | "declined" | "cancelled" | "completed";
  garageResponseNote: string | null;
  garageName: string;
  messages: WorkRequestMessage[];
}

const STATUS_BADGE_CLASS: Record<WorkRequest["status"], string> = {
  pending: "bg-neutral-badge-bg text-neutral-badge",
  accepted: "bg-success-bg text-success",
  declined: "bg-critical-bg text-critical",
  cancelled: "bg-neutral-badge-bg text-neutral-badge",
  completed: "bg-success-bg text-success",
};

const STATUS_LABEL: Record<WorkRequest["status"], string> = {
  pending: "Pending",
  accepted: "Accepted",
  declined: "Declined",
  cancelled: "Cancelled",
  completed: "Completed",
};

export function WorkRequestList({
  requests,
  ownerLabel,
}: {
  requests: WorkRequest[];
  ownerLabel: string;
}) {
  const router = useRouter();
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleCancel(requestId: string, wasAccepted: boolean) {
    if (
      wasAccepted &&
      !confirm(
        "Cancel this appointment? The garage has already confirmed this booking.",
      )
    ) {
      return;
    }

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
            <p className="text-success">
              Scheduled: {request.scheduledDate}
              {request.scheduledTime && ` at ${request.scheduledTime.slice(0, 5)}`}
            </p>
          )}
          {request.garageResponseNote && (
            <p className="text-muted-foreground">
              “{request.garageResponseNote}”
            </p>
          )}
          {(request.status === "pending" || request.status === "accepted") && (
            <button
              type="button"
              onClick={() => handleCancel(request.id, request.status === "accepted")}
              disabled={cancellingId === request.id}
              className="mt-1 text-xs font-medium text-critical underline underline-offset-2 disabled:opacity-50"
            >
              {cancellingId === request.id
                ? "Cancelling…"
                : request.status === "accepted"
                  ? "Cancel appointment"
                  : "Cancel request"}
            </button>
          )}
          <WorkRequestThread
            workRequestId={request.id}
            viewerRole="owner"
            senderLabel={ownerLabel}
            initialMessages={request.messages}
          />
        </li>
      ))}
      {error && <p className="text-sm text-critical">{error}</p>}
    </ul>
  );
}
