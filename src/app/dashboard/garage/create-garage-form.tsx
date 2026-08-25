"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function CreateGarageForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);

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

      const { data: garage, error: garageError } = await supabase
        .from("garages")
        .insert({ name, created_by: user.id })
        .select("id")
        .single();

      if (garageError || !garage) {
        setError(garageError?.message ?? "Failed to create garage");
        setSaving(false);
        return;
      }

      const { error: memberError } = await supabase
        .from("garage_members")
        .insert({ garage_id: garage.id, user_id: user.id });

      if (memberError) {
        setError(memberError.message);
        setSaving(false);
        return;
      }

      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create garage");
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <label className="flex flex-col gap-1 text-sm">
        Garage name
        <input
          type="text"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="e.g. Smith's Garage"
          required
          className="rounded border border-neutral-300 px-3 py-2"
        />
      </label>
      <button
        type="submit"
        disabled={saving}
        className="rounded bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {saving ? "Creating…" : "Create garage"}
      </button>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </form>
  );
}
