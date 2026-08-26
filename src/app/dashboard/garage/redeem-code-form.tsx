"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { buttonStyles, cardStyles } from "@/components/ui/styles";
import { Field, TextInput } from "@/components/ui/field";

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
    <form onSubmit={handleSubmit} className={cardStyles("flex flex-col gap-2")}>
      <Field label="Redeem a vehicle access code">
        <TextInput
          type="text"
          value={code}
          onChange={(event) => setCode(event.target.value)}
          placeholder="e.g. AB12CD34"
          required
          className="uppercase"
        />
      </Field>
      <button type="submit" disabled={saving} className={buttonStyles("primary")}>
        {saving ? "Redeeming…" : "Redeem code"}
      </button>
      {error && <p className="text-sm text-critical">{error}</p>}
      {success && <p className="text-sm text-success">{success}</p>}
    </form>
  );
}
