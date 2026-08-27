"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export interface WorkRequestMessage {
  id: string;
  senderRole: "owner" | "garage";
  senderLabel: string;
  body: string;
  createdAt: string;
}

// Shared between the owner's vehicle page and the garage portal — the
// two sides see the same thread, just from opposite viewerRole values,
// so which role's messages get the "you" styling flips accordingly.
export function WorkRequestThread({
  workRequestId,
  viewerRole,
  senderLabel,
  initialMessages,
}: {
  workRequestId: string;
  viewerRole: "owner" | "garage";
  senderLabel: string;
  initialMessages: WorkRequestMessage[];
}) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSend(event: FormEvent) {
    event.preventDefault();
    if (!body.trim()) return;

    setSending(true);
    setError(null);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError("You've been signed out — please log in again.");
      setSending(false);
      return;
    }

    const { error: insertError } = await supabase
      .from("work_request_messages")
      .insert({
        work_request_id: workRequestId,
        sender_id: user.id,
        sender_role: viewerRole,
        sender_label: senderLabel,
        body: body.trim(),
      });

    setSending(false);

    if (insertError) {
      setError(insertError.message);
      return;
    }

    setBody("");
    router.refresh();
  }

  return (
    <details className="mt-2 text-xs">
      <summary className="cursor-pointer font-medium text-muted-foreground hover:text-foreground">
        {initialMessages.length > 0
          ? `Messages (${initialMessages.length})`
          : "Add a message"}
      </summary>
      <div className="mt-2 flex flex-col gap-2">
        {initialMessages.length > 0 && (
          <ul className="flex flex-col gap-1.5">
            {initialMessages.map((message) => (
              <li
                key={message.id}
                className="rounded-lg bg-background px-2.5 py-1.5"
              >
                <p className="font-semibold text-foreground">
                  {message.senderRole === viewerRole ? "You" : message.senderLabel}{" "}
                  <span className="font-normal text-muted-foreground">
                    · {message.createdAt.slice(0, 10)}
                  </span>
                </p>
                <p className="text-foreground">{message.body}</p>
              </li>
            ))}
          </ul>
        )}
        <form onSubmit={handleSend} className="flex gap-1.5">
          <input
            type="text"
            value={body}
            onChange={(event) => setBody(event.target.value)}
            placeholder="Ask a question or suggest a date…"
            className="flex-1 rounded-md border border-border bg-surface px-2 py-1 text-xs text-foreground placeholder:text-muted-foreground/60"
          />
          <button
            type="submit"
            disabled={sending || !body.trim()}
            className="shrink-0 font-semibold text-primary disabled:opacity-50"
          >
            {sending ? "Sending…" : "Send"}
          </button>
        </form>
        {error && <p className="text-critical">{error}</p>}
      </div>
    </details>
  );
}
