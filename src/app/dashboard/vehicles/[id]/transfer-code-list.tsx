"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface TransferCode {
  id: string;
  code: string;
  expiresAt: string;
}

export function TransferCodeList({ codes }: { codes: TransferCode[] }) {
  const router = useRouter();
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleCancel(codeId: string) {
    if (
      !confirm("Cancel this transfer code? It will stop working immediately.")
    ) {
      return;
    }

    setCancellingId(codeId);
    setError(null);

    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("vehicle_transfer_codes")
      .update({ revoked_at: new Date().toISOString() })
      .eq("id", codeId);

    if (updateError) {
      setError(updateError.message);
      setCancellingId(null);
      return;
    }

    router.refresh();
  }

  if (codes.length === 0) {
    return null;
  }

  return (
    <div className="text-sm">
      <p className="text-neutral-600">Pending transfer codes:</p>
      <ul className="mt-1 flex flex-col gap-1">
        {codes.map((transferCode) => (
          <li
            key={transferCode.id}
            className="flex items-center justify-between gap-2 rounded border border-neutral-300 px-2.5 py-1.5"
          >
            <span>
              <code className="font-mono">{transferCode.code}</code>{" "}
              <span className="text-neutral-500">
                expires {transferCode.expiresAt.slice(0, 10)}
              </span>
            </span>
            <button
              onClick={() => handleCancel(transferCode.id)}
              disabled={cancellingId === transferCode.id}
              className="text-red-700 underline disabled:opacity-50"
            >
              {cancellingId === transferCode.id ? "Cancelling…" : "Cancel"}
            </button>
          </li>
        ))}
      </ul>
      {error && <p className="mt-1 text-red-600">{error}</p>}
    </div>
  );
}
