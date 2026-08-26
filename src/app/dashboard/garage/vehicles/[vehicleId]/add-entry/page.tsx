import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  buildResolvableDefects,
  type MotHistoryRow,
} from "@/lib/timeline";
import { AddVerifiedEntryForm } from "./add-verified-entry-form";

export default async function GarageAddEntryPage({
  params,
}: {
  params: Promise<{ vehicleId: string }>;
}) {
  const { vehicleId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: membership } = await supabase
    .from("garage_members")
    .select("garage_id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (!membership) {
    redirect("/dashboard/garage");
  }

  const [{ data: motHistory }, { data: resolvedRows }] = await Promise.all([
    supabase
      .from("mot_history")
      .select(
        "id, test_date, completed_at, expiry_date, result, odometer_value, odometer_unit, raw_data",
      )
      .eq("vehicle_id", vehicleId)
      .order("completed_at", { ascending: false })
      .returns<MotHistoryRow[]>(),
    supabase
      .from("service_entries")
      .select("resolved_mot_history_id, resolved_defect_index")
      .eq("vehicle_id", vehicleId)
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

  return (
    <AddVerifiedEntryForm
      vehicleId={vehicleId}
      garageId={membership.garage_id}
      resolvableDefects={resolvableDefects}
    />
  );
}
