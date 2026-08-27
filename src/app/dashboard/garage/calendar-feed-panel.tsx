"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { buttonStyles, cardStyles } from "@/components/ui/styles";

// Same shape as the vehicle share-link token (share-panel.tsx) — this
// URL is the only thing standing between a calendar app and the
// garage's job list, so it needs to resist guessing on its own.
function generateFeedToken(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function CalendarFeedPanel({
  garageId,
  feedToken,
}: {
  garageId: string;
  feedToken: string;
}) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const url =
    typeof window !== "undefined"
      ? `${window.location.origin}/api/garage/calendar/${feedToken}`
      : `/api/garage/calendar/${feedToken}`;

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      // Best-effort — the link is already visible on screen either way.
    }
  }

  async function handleRegenerate() {
    if (
      !confirm(
        "Regenerate the calendar link? Any calendar app already subscribed to the old link will stop receiving updates.",
      )
    ) {
      return;
    }

    setRegenerating(true);
    setError(null);
    setCopied(false);

    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("garages")
      .update({ calendar_feed_token: generateFeedToken() })
      .eq("id", garageId);

    setRegenerating(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    router.refresh();
  }

  return (
    <div className={cardStyles("text-sm")}>
      <p className="font-semibold text-foreground">Calendar feed</p>
      <p className="mt-1 text-muted-foreground">
        Subscribe to this URL from Google Calendar, Outlook, or Apple
        Calendar to see your accepted jobs alongside everything else —
        it updates on its own, no need to re-import.
      </p>
      <div className="mt-2 flex items-center gap-2 overflow-x-auto">
        <code className="whitespace-nowrap rounded-lg bg-primary-tint px-2 py-1 font-mono text-xs text-primary">
          {url}
        </code>
        <button
          onClick={handleCopy}
          className="shrink-0 text-primary underline underline-offset-2"
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <button
        onClick={handleRegenerate}
        disabled={regenerating}
        className={buttonStyles("secondary", "mt-2 text-xs")}
      >
        {regenerating ? "Regenerating…" : "Regenerate link"}
      </button>
      {error && <p className="mt-2 text-critical">{error}</p>}
    </div>
  );
}
