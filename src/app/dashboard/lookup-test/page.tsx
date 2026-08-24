"use client";

import { useState, type FormEvent } from "react";

export default function LookupTestPage() {
  const [vrm, setVrm] = useState("");
  const [result, setResult] = useState<unknown>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    const response = await fetch("/api/vehicles/lookup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ vrm }),
    });

    const body = await response.json();
    setLoading(false);

    if (!response.ok) {
      setError(body.error ?? "Lookup failed");
      return;
    }

    setResult(body.data);
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-4 p-6">
      <h1 className="text-xl font-semibold">MOT history lookup (test)</h1>
      <p className="text-sm text-neutral-600">
        Shows the raw DVSA response, unmapped — this is here to confirm the
        live field names before we build the real &quot;add vehicle&quot;
        flow on top of it.
      </p>
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          value={vrm}
          onChange={(event) => setVrm(event.target.value)}
          placeholder="AB12CDE"
          required
          className="flex-1 rounded border border-neutral-300 px-3 py-2 text-sm uppercase"
        />
        <button
          type="submit"
          disabled={loading}
          className="rounded bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {loading ? "Looking up…" : "Look up"}
        </button>
      </form>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {result !== null && (
        <pre className="overflow-x-auto rounded bg-neutral-100 p-4 text-xs">
          {JSON.stringify(result, null, 2)}
        </pre>
      )}
    </main>
  );
}
