import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const SERVICE_TYPES = [
  "service",
  "repair",
  "tyres",
  "brakes",
  "battery",
  "modification",
  "other",
] as const;

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

  const body = (await request.json()) as {
    serviceType?: string;
    entryDate?: string;
    mileage?: number | null;
    cost?: number | null;
    notes?: string;
  };

  const serviceType = (SERVICE_TYPES as readonly string[]).includes(
    body.serviceType ?? "",
  )
    ? (body.serviceType as (typeof SERVICE_TYPES)[number])
    : "service";

  // Creating the service entry and updating the work request has to
  // happen as one privileged operation — RLS alone can't express
  // "write a row in a different table as a side effect of this update,"
  // same reasoning as the verification-request decide route.
  const admin = createAdminClient();

  const { data: workRequest, error: fetchError } = await admin
    .from("work_requests")
    .select(
      "id, vehicle_id, garage_id, status, notes, resolved_mot_history_id, resolved_defect_index",
    )
    .eq("id", id)
    .maybeSingle();

  if (fetchError) {
    console.error(fetchError);
    return NextResponse.json({ error: "Lookup failed" }, { status: 500 });
  }

  if (!workRequest || workRequest.status !== "accepted") {
    return NextResponse.json(
      { error: "Request not found or not accepted" },
      { status: 404 },
    );
  }

  const { data: membership } = await admin
    .from("garage_members")
    .select("garage_id")
    .eq("user_id", user.id)
    .eq("garage_id", workRequest.garage_id)
    .maybeSingle();

  if (!membership) {
    return NextResponse.json(
      { error: "You're not a member of the garage this job belongs to." },
      { status: 403 },
    );
  }

  const { data: entry, error: insertError } = await admin
    .from("service_entries")
    .insert({
      vehicle_id: workRequest.vehicle_id,
      created_by: user.id,
      garage_id: workRequest.garage_id,
      verified: true,
      entry_date: body.entryDate || new Date().toISOString().slice(0, 10),
      mileage: body.mileage ?? null,
      cost: body.cost ?? null,
      service_type: serviceType,
      notes: body.notes || workRequest.notes,
      resolved_mot_history_id: workRequest.resolved_mot_history_id,
      resolved_defect_index: workRequest.resolved_defect_index,
    })
    .select("id")
    .single();

  if (insertError || !entry) {
    console.error(insertError);
    return NextResponse.json(
      { error: "Failed to create the service entry" },
      { status: 500 },
    );
  }

  const { error: updateError } = await admin
    .from("work_requests")
    .update({
      status: "completed",
      completed_at: new Date().toISOString(),
      resulting_service_entry_id: entry.id,
    })
    .eq("id", id);

  if (updateError) {
    // Not fatal — the verified entry is already saved and will already
    // show up on the vehicle's record either way.
    console.error(updateError);
  }

  return NextResponse.json({ serviceEntryId: entry.id });
}
