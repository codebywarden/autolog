"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface GarageAccessGrant {
  id: string;
  garageName: string;
}

export function GarageAccessList({ grants }: { grants: GarageAccessGrant[] }) {
  const router = useRouter();
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleRevoke(grantId: string, garageName: string) {
    if (!confirm(`Revoke ${garageName}'s access to this vehicle?`)) {
      return;
    }

    setRevokingId(grantId);
    setError(null);

    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("vehicle_garage_access")
      .update({ revoked_at: new Date().toISOString() })
      .eq("id", grantId);

    if (updateError) {
      setError(updateError.message);
      setRevokingId(null);
      return;
    }

    router.refresh();
  }

  if (grants.length === 0) {
    return null;
  }

  return (
    <div className="text-sm">
      <p className="text-muted-foreground">Garages with access:</p>
      <ul className="mt-1 flex flex-col gap-1.5">
        {grants.map((grant) => (
          <li
            key={grant.id}
            className="flex items-center justify-between gap-2 rounded-lg border border-border bg-surface px-3 py-2"
          >
            <span className="text-foreground">{grant.garageName}</span>
            <button
              onClick={() => handleRevoke(grant.id, grant.garageName)}
              disabled={revokingId === grant.id}
              className="text-critical underline underline-offset-2 disabled:opacity-50"
            >
              {revokingId === grant.id ? "Revoking…" : "Revoke"}
            </button>
          </li>
        ))}
      </ul>
      {error && <p className="mt-1 text-critical">{error}</p>}
    </div>
  );
}
