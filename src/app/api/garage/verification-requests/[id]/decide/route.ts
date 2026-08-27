import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { decision } = (await request.json()) as {
    decision?: "approved" | "declined";
  };

  if (decision !== "approved" && decision !== "declined") {
    return NextResponse.json({ error: "Invalid decision" }, { status: 400 });
  }

  // Approving has to flip verified/garage_id on the linked service_entries
  // row in the same operation — a cross-table write no RLS policy alone
  // can express, so this goes through service-role like the other
  // privileged routes (add-vehicle, redeem-code).
  const admin = createAdminClient();

  const { data: verificationRequest, error: fetchError } = await admin
    .from("entry_verification_requests")
    .select("id, service_entry_id, vehicle_id, garage_id, status")
    .eq("id", id)
    .maybeSingle();

  if (fetchError) {
    console.error(fetchError);
    return NextResponse.json({ error: "Lookup failed" }, { status: 500 });
  }

  if (!verificationRequest || verificationRequest.status !== "pending") {
    return NextResponse.json(
      { error: "Request not found or already decided" },
      { status: 404 },
    );
  }

  const { data: membership } = await admin
    .from("garage_members")
    .select("garage_id")
    .eq("user_id", user.id)
    .eq("garage_id", verificationRequest.garage_id)
    .maybeSingle();

  if (!membership) {
    return NextResponse.json(
      { error: "You're not a member of the garage this request was sent to." },
      { status: 403 },
    );
  }

  const { error: decisionError } = await admin
    .from("entry_verification_requests")
    .update({
      status: decision,
      decided_by: user.id,
      decided_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (decisionError) {
    console.error(decisionError);
    return NextResponse.json({ error: "Failed to save decision" }, { status: 500 });
  }

  const { data: garage } = await admin
    .from("garages")
    .select("name")
    .eq("id", verificationRequest.garage_id)
    .maybeSingle();

  if (decision === "approved") {
    // Guard with .eq("verified", false) rather than trusting the request
    // row alone — the entry could in principle have been edited or
    // deleted by the owner between the request being made and decided.
    const { error: verifyError } = await admin
      .from("service_entries")
      .update({ verified: true, garage_id: verificationRequest.garage_id })
      .eq("id", verificationRequest.service_entry_id)
      .eq("verified", false);

    if (verifyError) {
      console.error(verifyError);
      return NextResponse.json(
        { error: "Decision saved, but verifying the entry failed" },
        { status: 500 },
      );
    }

    const { error: logError } = await admin.from("activity_log").insert({
      vehicle_id: verificationRequest.vehicle_id,
      actor_id: user.id,
      actor_label: garage?.name ?? "Garage",
      action: "verification_approved",
      detail: { service_entry_id: verificationRequest.service_entry_id },
    });

    if (logError) {
      console.error(logError);
    }
  } else {
    const { error: logError } = await admin.from("activity_log").insert({
      vehicle_id: verificationRequest.vehicle_id,
      actor_id: user.id,
      actor_label: garage?.name ?? "Garage",
      action: "verification_declined",
      detail: { service_entry_id: verificationRequest.service_entry_id },
    });

    if (logError) {
      console.error(logError);
    }
  }

  return NextResponse.json({ status: decision });
}
