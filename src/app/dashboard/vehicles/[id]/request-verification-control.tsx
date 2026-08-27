"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface ConnectedGarage {
  garageId: string;
  garageName: string;
}

interface ExistingRequest {
  id: string;
  status: "pending" | "approved" | "declined" | "cancelled";
  garageName: string;
}

export function RequestVerificationControl({
  vehicleId,
  entryId,
  connectedGarages,
  existingRequest,
}: {
  vehicleId: string;
  entryId: string;
  connectedGarages: ConnectedGarage[];
  existingRequest: ExistingRequest | null;
}) {
  const router = useRouter();
  const [garageId, setGarageId] = useState(
    connectedGarages[0]?.garageId ?? "",
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleRequest() {
    if (!garageId) return;
    setBusy(true);
    setError(null);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError("You've been signed out — please log in again.");
      setBusy(false);
      return;
    }

    const { error: insertError } = await supabase
      .from("entry_verification_requests")
      .insert({
        vehicle_id: vehicleId,
        service_entry_id: entryId,
        garage_id: garageId,
        requested_by: user.id,
      });

    setBusy(false);

    if (insertError) {
      setError(insertError.message);
      return;
    }

    router.refresh();
  }

  async function handleCancel() {
    if (!existingRequest) return;
    setBusy(true);
    setError(null);

    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("entry_verification_requests")
      .update({ status: "cancelled" })
      .eq("id", existingRequest.id);

    setBusy(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    router.refresh();
  }

  if (connectedGarages.length === 0) {
    return null;
  }

  if (existingRequest?.status === "pending") {
    return (
      <p className="mt-2 flex flex-wrap items-center gap-2 text-xs">
        <span className="text-muted-foreground">
          Verification requested from {existingRequest.garageName}
        </span>
        <button
          type="button"
          onClick={handleCancel}
          disabled={busy}
          className="font-medium text-critical underline underline-offset-2 disabled:opacity-50"
        >
          {busy ? "Cancelling…" : "Cancel"}
        </button>
        {error && <span className="text-critical">{error}</span>}
      </p>
    );
  }

  return (
    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
      {existingRequest?.status === "declined" && (
        <span className="text-muted-foreground">
          Declined by {existingRequest.garageName} —
        </span>
      )}
      {connectedGarages.length > 1 ? (
        <select
          value={garageId}
          onChange={(event) => setGarageId(event.target.value)}
          className="rounded-md border border-border bg-surface px-1.5 py-0.5 text-xs text-foreground"
        >
          {connectedGarages.map((garage) => (
            <option key={garage.garageId} value={garage.garageId}>
              {garage.garageName}
            </option>
          ))}
        </select>
      ) : null}
      <button
        type="button"
        onClick={handleRequest}
        disabled={busy}
        className="font-medium text-primary underline underline-offset-2 hover:text-primary-hover disabled:opacity-50"
      >
        {busy
          ? "Requesting…"
          : connectedGarages.length > 1
            ? "Request verification"
            : `Request verification from ${connectedGarages[0].garageName}`}
      </button>
      {error && <span className="text-critical">{error}</span>}
    </div>
  );
}
