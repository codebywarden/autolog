"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

// No 0/O/1/I — these codes are read off a screen and typed in by hand
// at a garage counter, so ambiguous characters cause real support pain.
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function generateCode(): string {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => CODE_ALPHABET[byte % CODE_ALPHABET.length]).join("");
}

export function InviteCodePanel({ vehicleId }: { vehicleId: string }) {
  const [code, setCode] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function handleGenerate() {
    setSaving(true);
    setError(null);
    setCode(null);
    setCopied(false);

    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setError("You've been signed out — please log in again.");
        setSaving(false);
        return;
      }

      const newCode = generateCode();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      const { error: insertError } = await supabase
        .from("vehicle_invite_codes")
        .insert({
          vehicle_id: vehicleId,
          code: newCode,
          created_by: user.id,
          expires_at: expiresAt.toISOString(),
        });

      if (insertError) {
        setError(insertError.message);
        setSaving(false);
        return;
      }

      setCode(newCode);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate code");
    } finally {
      setSaving(false);
    }
  }

  async function handleCopy() {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
    } catch {
      // Clipboard access can fail silently (permissions, non-HTTPS) —
      // the code is already visible on screen either way.
    }
  }

  return (
    <div className="rounded border border-neutral-300 p-3 text-sm">
      <p className="font-semibold">Garage access</p>
      <p className="mt-1 text-neutral-600">
        Generate a code and give it to a garage to let them view this
        vehicle and add verified entries. Codes expire after 7 days and
        work once.
      </p>
      <button
        onClick={handleGenerate}
        disabled={saving}
        className="mt-3 rounded border border-neutral-300 px-3 py-1.5 text-sm font-medium disabled:opacity-50"
      >
        {saving ? "Generating…" : "Generate invite code"}
      </button>
      {code && (
        <div className="mt-2 flex items-center gap-2">
          <code className="rounded bg-neutral-100 px-2 py-1 font-mono">
            {code}
          </code>
          <button onClick={handleCopy} className="text-blue-700 underline">
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
      )}
      {error && <p className="mt-2 text-red-600">{error}</p>}
    </div>
  );
}
