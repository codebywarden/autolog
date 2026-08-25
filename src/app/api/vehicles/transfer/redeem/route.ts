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

  const admin = createAdminClient();

  const { data: transferCode, error: codeError } = await admin
    .from("vehicle_transfer_codes")
    .select("id, vehicle_id, expires_at, redeemed_at, revoked_at")
    .eq("code", normalized)
    .maybeSingle();

  if (codeError) {
    console.error(codeError);
    return NextResponse.json({ error: "Transfer failed" }, { status: 500 });
  }

  if (
    !transferCode ||
    transferCode.redeemed_at ||
    transferCode.revoked_at ||
    new Date(transferCode.expires_at) < new Date()
  ) {
    return NextResponse.json(
      { error: "Invalid, expired, or already-used code" },
      { status: 404 },
    );
  }

  const { data: currentOwnership } = await admin
    .from("vehicle_owners")
    .select("id, user_id")
    .eq("vehicle_id", transferCode.vehicle_id)
    .eq("is_current", true)
    .maybeSingle();

  if (!currentOwnership) {
    console.error(
      `Vehicle ${transferCode.vehicle_id} has no current owner on record`,
    );
    return NextResponse.json(
      { error: "This vehicle has no current owner on record" },
      { status: 500 },
    );
  }

  if (currentOwnership.user_id === user.id) {
    return NextResponse.json(
      { error: "You already own this vehicle" },
      { status: 400 },
    );
  }

  const { error: endOwnershipError } = await admin
    .from("vehicle_owners")
    .update({ is_current: false, ended_at: new Date().toISOString() })
    .eq("id", currentOwnership.id);

  if (endOwnershipError) {
    console.error(endOwnershipError);
    return NextResponse.json(
      { error: "Failed to end previous ownership" },
      { status: 500 },
    );
  }

  const { error: newOwnerError } = await admin.from("vehicle_owners").insert({
    vehicle_id: transferCode.vehicle_id,
    user_id: user.id,
    is_current: true,
  });

  if (newOwnerError) {
    console.error(newOwnerError);
    return NextResponse.json(
      { error: "Failed to record new ownership" },
      { status: 500 },
    );
  }

  const { error: markRedeemedError } = await admin
    .from("vehicle_transfer_codes")
    .update({ redeemed_at: new Date().toISOString(), redeemed_by: user.id })
    .eq("id", transferCode.id);

  if (markRedeemedError) {
    // Not fatal — ownership has already moved. Worth knowing about, but
    // shouldn't fail the request the new owner is waiting on.
    console.error(markRedeemedError);
  }

  // Note: existing garage access grants and share links on this vehicle
  // stay active after transfer rather than being auto-revoked — the
  // new owner can see and manage them immediately from the vehicle
  // page's existing revoke controls, so this is a visible choice for
  // them to make, not a silent carry-over.

  const { data: previousOwnerAuth } = await admin.auth.admin.getUserById(
    currentOwnership.user_id,
  );

  const { data: vehicle } = await admin
    .from("vehicles")
    .select("vrm")
    .eq("id", transferCode.vehicle_id)
    .maybeSingle();

  const { error: logError } = await admin.from("activity_log").insert({
    vehicle_id: transferCode.vehicle_id,
    actor_id: user.id,
    actor_label: user.email ?? "New owner",
    action: "ownership_transferred",
    detail: {
      from: previousOwnerAuth?.user?.email ?? "previous owner",
      to: user.email ?? "new owner",
    },
  });

  if (logError) {
    console.error(logError);
  }

  return NextResponse.json({
    vehicleId: transferCode.vehicle_id,
    vrm: vehicle?.vrm,
  });
}
