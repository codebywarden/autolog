"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function DeleteEntryButton({
  entryId,
  attachmentPaths,
}: {
  entryId: string;
  attachmentPaths: string[];
}) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    if (!confirm("Delete this entry? This can't be undone.")) {
      return;
    }

    setDeleting(true);
    setError(null);

    const supabase = createClient();

    // Best-effort — the file_attachments rows are removed automatically
    // via the on-delete-cascade from service_entries, but that doesn't
    // touch the underlying storage objects, so those are cleaned up
    // explicitly first.
    if (attachmentPaths.length > 0) {
      await supabase.storage.from("invoices").remove(attachmentPaths);
    }

    const { error: deleteError } = await supabase
      .from("service_entries")
      .delete()
      .eq("id", entryId);

    if (deleteError) {
      setError(deleteError.message);
      setDeleting(false);
      return;
    }

    router.refresh();
  }

  return (
    <span className="inline-flex items-center gap-1">
      <button
        type="button"
        onClick={handleDelete}
        disabled={deleting}
        className="text-critical underline underline-offset-2 hover:text-critical/80 disabled:opacity-50"
      >
        {deleting ? "Deleting…" : "Delete"}
      </button>
      {error && <span className="text-critical">{error}</span>}
    </span>
  );
}
