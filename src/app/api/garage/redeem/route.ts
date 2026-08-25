import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { code } = (await request.json()) as { code?: string };
  if (!code) {
    return NextResponse.json({ error: "code is required" }, { status: 400 });
  }
  const normalized = code.trim().toUpperCase();

  const { data: membership } = await supabase
    .from("garage_members")
    .select("garage_id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (!membership) {
    return NextResponse.json(
      { error: "You need to create a garage before redeeming a code." },
      { status: 400 },
    );
  }

  // A one-time code being consumed (check unredeemed + unexpired, then
  // mark it redeemed) is a privileged, cross-user operation that RLS
  // can't express as a simple ownership check — service-role bypasses
  // RLS here, same reasoning as the add-vehicle route.
  const admin = createAdminClient();

  const { data: invite, error: inviteError } = await admin
    .from("vehicle_invite_codes")
    .select("id, vehicle_id, created_by, expires_at, redeemed_at")
    .eq("code", normalized)
    .maybeSingle();

  if (inviteError) {
    console.error(inviteError);
    return NextResponse.json({ error: "Redemption failed" }, { status: 500 });
  }

  if (
    !invite ||
    invite.redeemed_at ||
    new Date(invite.expires_at) < new Date()
  ) {
    return NextResponse.json(
      { error: "Invalid or expired code" },
      { status: 404 },
    );
  }

  const { error: accessError } = await admin
    .from("vehicle_garage_access")
    .upsert(
      {
        vehicle_id: invite.vehicle_id,
        garage_id: membership.garage_id,
        granted_by: invite.created_by,
        revoked_at: null,
      },
      { onConflict: "vehicle_id,garage_id" },
    );

  if (accessError) {
    console.error(accessError);
    return NextResponse.json(
      { error: "Failed to grant access" },
      { status: 500 },
    );
  }

  const { error: markRedeemedError } = await admin
    .from("vehicle_invite_codes")
    .update({
      redeemed_at: new Date().toISOString(),
      redeemed_by_garage_id: membership.garage_id,
    })
    .eq("id", invite.id);

  if (markRedeemedError) {
    // Not fatal — access has already been granted. Worth knowing about,
    // but shouldn't fail the request the garage is waiting on.
    console.error(markRedeemedError);
  }

  const { data: vehicle } = await admin
    .from("vehicles")
    .select("vrm")
    .eq("id", invite.vehicle_id)
    .maybeSingle();

  return NextResponse.json({ vehicleId: invite.vehicle_id, vrm: vehicle?.vrm });
}
