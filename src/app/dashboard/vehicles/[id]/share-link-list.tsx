"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface ShareLink {
  id: string;
  expiresAt: string;
  createdAt: string;
}

export function ShareLinkList({ links }: { links: ShareLink[] }) {
  const router = useRouter();
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleRevoke(linkId: string) {
    if (
      !confirm("Revoke this share link? It will stop working immediately.")
    ) {
      return;
    }

    setRevokingId(linkId);
    setError(null);

    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("vehicle_share_links")
      .update({ revoked_at: new Date().toISOString() })
      .eq("id", linkId);

    if (updateError) {
      setError(updateError.message);
      setRevokingId(null);
      return;
    }

    router.refresh();
  }

  if (links.length === 0) {
    return null;
  }

  return (
    <div className="text-sm">
      <p className="text-muted-foreground">Active share links:</p>
      <ul className="mt-1 flex flex-col gap-1.5">
        {links.map((link) => (
          <li
            key={link.id}
            className="flex items-center justify-between gap-2 rounded-lg border border-border bg-surface px-3 py-2"
          >
            <span className="text-muted-foreground">
              Created {link.createdAt.slice(0, 10)} · expires{" "}
              {link.expiresAt.slice(0, 10)}
            </span>
            <button
              onClick={() => handleRevoke(link.id)}
              disabled={revokingId === link.id}
              className="shrink-0 text-critical underline underline-offset-2 disabled:opacity-50"
            >
              {revokingId === link.id ? "Revoking…" : "Revoke"}
            </button>
          </li>
        ))}
      </ul>
      {error && <p className="mt-1 text-critical">{error}</p>}
    </div>
  );
}
