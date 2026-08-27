"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function VerificationRequestActions({
  requestId,
}: {
  requestId: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<"approved" | "declined" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function decide(decision: "approved" | "declined") {
    setBusy(decision);
    setError(null);

    try {
      const response = await fetch(
        `/api/garage/verification-requests/${requestId}/decide`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ decision }),
        },
      );
      const body = await response.json();

      if (!response.ok) {
        setError(body.error ?? "Failed to save decision");
        setBusy(null);
        return;
      }

      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save decision");
      setBusy(null);
    }
  }

  return (
    <div className="mt-2 flex items-center gap-3 text-xs font-semibold">
      <button
        type="button"
        onClick={() => decide("approved")}
        disabled={busy !== null}
        className="text-success underline underline-offset-2 disabled:opacity-50"
      >
        {busy === "approved" ? "Verifying…" : "Verify"}
      </button>
      <button
        type="button"
        onClick={() => decide("declined")}
        disabled={busy !== null}
        className="text-critical underline underline-offset-2 disabled:opacity-50"
      >
        {busy === "declined" ? "Declining…" : "Decline"}
      </button>
      {error && <span className="font-normal text-critical">{error}</span>}
    </div>
  );
}
