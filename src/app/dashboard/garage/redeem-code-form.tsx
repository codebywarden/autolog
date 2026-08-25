"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

export function RedeemCodeForm() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch("/api/garage/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.trim().toUpperCase() }),
      });

      let body: { error?: string; vrm?: string } = {};
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

      setSuccess(`Access granted to ${body.vrm ?? "vehicle"}`);
      setCode("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to redeem code");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-2 rounded border border-neutral-300 p-3"
    >
      <label className="flex flex-col gap-1 text-sm">
        Redeem a vehicle access code
        <input
          type="text"
          value={code}
          onChange={(event) => setCode(event.target.value)}
          placeholder="e.g. AB12CD34"
          required
          className="rounded border border-neutral-300 px-3 py-2 uppercase"
        />
      </label>
      <button
        type="submit"
        disabled={saving}
        className="rounded bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {saving ? "Redeeming…" : "Redeem code"}
      </button>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {success && <p className="text-sm text-green-700">{success}</p>}
    </form>
  );
}
