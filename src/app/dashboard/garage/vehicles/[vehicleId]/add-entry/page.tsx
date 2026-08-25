import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
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

  return (
    <AddVerifiedEntryForm vehicleId={vehicleId} garageId={membership.garage_id} />
  );
}
