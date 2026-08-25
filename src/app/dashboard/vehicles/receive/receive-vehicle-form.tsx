"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

export function ReceiveVehicleForm() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const response = await fetch("/api/vehicles/transfer/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.trim().toUpperCase() }),
      });

      let body: { error?: string; vehicleId?: string } = {};
      try {
        body = await response.json();
      } catch {
        // Response wasn't JSON (e.g. a platform error page) — fall
        // through to the generic error below.
      }

      if (!response.ok) {
        setError(body.error ?? `Failed to redeem code (${response.status})`);
        setSaving(false);
        return;
      }

      router.push(`/dashboard/vehicles/${body.vehicleId}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to redeem code");
      setSaving(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col gap-4 p-6">
      <h1 className="text-xl font-semibold">Receive a vehicle</h1>
      <p className="text-sm text-neutral-600">
        Enter the transfer code the current owner gave you. This makes
        you the new owner and ends their access to it immediately.
      </p>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <input
          type="text"
          value={code}
          onChange={(event) => setCode(event.target.value)}
          placeholder="e.g. AB12CD34"
          required
          className="rounded border border-neutral-300 px-3 py-2 uppercase"
        />
        <button
          type="submit"
          disabled={saving}
          className="rounded bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {saving ? "Transferring…" : "Confirm transfer"}
        </button>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </form>
    </main>
  );
}
