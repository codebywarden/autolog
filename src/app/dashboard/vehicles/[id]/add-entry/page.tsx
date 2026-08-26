import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  buildResolvableDefects,
  type MotHistoryRow,
} from "@/lib/timeline";
import { AddEntryForm } from "./add-entry-form";

export default async function AddEntryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [{ data: motHistory }, { data: resolvedRows }] = await Promise.all([
    supabase
      .from("mot_history")
      .select(
        "id, test_date, completed_at, expiry_date, result, odometer_value, odometer_unit, raw_data",
      )
      .eq("vehicle_id", id)
      .order("completed_at", { ascending: false })
      .returns<MotHistoryRow[]>(),
    supabase
      .from("service_entries")
      .select("resolved_mot_history_id, resolved_defect_index")
      .eq("vehicle_id", id)
      .not("resolved_mot_history_id", "is", null),
  ]);

  const alreadyResolved = new Set(
    (resolvedRows ?? []).map(
      (row) => `${row.resolved_mot_history_id}:${row.resolved_defect_index}`,
    ),
  );

  const resolvableDefects = buildResolvableDefects(
    motHistory ?? [],
    alreadyResolved,
  );

  return <AddEntryForm vehicleId={id} resolvableDefects={resolvableDefects} />;
}
