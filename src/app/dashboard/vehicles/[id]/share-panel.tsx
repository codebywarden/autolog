"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

// URL-safe, high-entropy — unlike the garage invite code, anyone
// holding this string gets access with no account or code-entry step,
// so it needs to resist guessing on its own, not just be unique.
function generateShareToken(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function SharePanel({ vehicleId }: { vehicleId: string }) {
  const [url, setUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function handleGenerate() {
    setSaving(true);
    setError(null);
    setUrl(null);
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

      const token = generateShareToken();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 14);

      const { error: insertError } = await supabase
        .from("vehicle_share_links")
        .insert({
          vehicle_id: vehicleId,
          token,
          created_by: user.id,
          expires_at: expiresAt.toISOString(),
        });

      if (insertError) {
        setError(insertError.message);
        setSaving(false);
        return;
      }

      setUrl(`${window.location.origin}/share/${token}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create link");
    } finally {
      setSaving(false);
    }
  }

  async function handleCopy() {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      // Best-effort — the link is already visible on screen either way.
    }
  }

  return (
    <div className="rounded border border-neutral-300 p-3 text-sm">
      <p className="font-semibold">Share history</p>
      <p className="mt-1 text-neutral-600">
        Generate a read-only link to send to a buyer or dealer — no
        AutoLog account needed to view it. Invoice attachments aren&apos;t
        included. Links expire after 14 days.
      </p>
      <button
        onClick={handleGenerate}
        disabled={saving}
        className="mt-3 rounded border border-neutral-300 px-3 py-1.5 text-sm font-medium disabled:opacity-50"
      >
        {saving ? "Generating…" : "Generate share link"}
      </button>
      {url && (
        <div className="mt-2 flex items-center gap-2 overflow-x-auto">
          <code className="whitespace-nowrap rounded bg-neutral-100 px-2 py-1 font-mono text-xs">
            {url}
          </code>
          <button
            onClick={handleCopy}
            className="shrink-0 text-blue-700 underline"
          >
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
      )}
      {error && <p className="mt-2 text-red-600">{error}</p>}
    </div>
  );
}
