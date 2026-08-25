import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  getMotHistoryByRegistration,
  MotHistoryNotFoundError,
} from "@/lib/dvsa/mot-history";
import {
  mapVehicleFields,
  mapMotHistoryRows,
  type DvsaVehicleResponse,
} from "@/lib/dvsa/mapping";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { vrm } = (await request.json()) as { vrm?: string };
  if (!vrm) {
    return NextResponse.json({ error: "vrm is required" }, { status: 400 });
  }
  const normalized = vrm.trim().toUpperCase().replace(/\s+/g, "");

  let dvsaData: DvsaVehicleResponse;
  try {
    dvsaData = (await getMotHistoryByRegistration(
      normalized,
    )) as DvsaVehicleResponse;
  } catch (error) {
    if (error instanceof MotHistoryNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    console.error(error);
    return NextResponse.json({ error: "DVSA lookup failed" }, { status: 502 });
  }

  // Writes below use the service-role client rather than RLS. This route
  // already re-authenticates the user itself (above) and needs a
  // multi-step conditional ("does this vehicle exist, and if so, am I
  // the owner?") that RLS on its own can't express cleanly — so we
  // enforce the ownership rule explicitly here instead.
  const admin = createAdminClient();

  const { data: existingVehicle, error: findError } = await admin
    .from("vehicles")
    .select("id")
    .eq("vrm", normalized)
    .maybeSingle();

  if (findError) {
    console.error(findError);
    return NextResponse.json({ error: "Lookup failed" }, { status: 500 });
  }

  let vehicleId: string;

  if (existingVehicle) {
    vehicleId = existingVehicle.id;

    const { data: existingOwnership } = await admin
      .from("vehicle_owners")
      .select("id")
      .eq("vehicle_id", vehicleId)
      .eq("user_id", user.id)
      .eq("is_current", true)
      .maybeSingle();

    if (!existingOwnership) {
      // Someone else currently owns this vehicle in AutoLog. Ownership
      // transfer (phase 3) is what should handle this — for MVP we
      // refuse rather than silently taking over their record.
      return NextResponse.json(
        {
          error:
            "This vehicle is already registered by another AutoLog account. Ownership transfer isn't available yet.",
        },
        { status: 409 },
      );
    }
  } else {
    const { data: newVehicle, error: insertError } = await admin
      .from("vehicles")
      .insert(mapVehicleFields(dvsaData))
      .select("id")
      .single();

    if (insertError || !newVehicle) {
      console.error(insertError);
      return NextResponse.json(
        { error: "Failed to save vehicle" },
        { status: 500 },
      );
    }

    vehicleId = newVehicle.id;

    const { error: ownerError } = await admin.from("vehicle_owners").insert({
      vehicle_id: vehicleId,
      user_id: user.id,
      is_current: true,
    });

    if (ownerError) {
      console.error(ownerError);
      return NextResponse.json(
        { error: "Failed to record ownership" },
        { status: 500 },
      );
    }
  }

  const motRows = mapMotHistoryRows(vehicleId, dvsaData);
  if (motRows.length > 0) {
    // Update rather than ignore on conflict: re-adding a vehicle re-syncs
    // its MOT rows with whatever DVSA (or our own mapping) currently
    // says, instead of freezing them at whatever was true on first import.
    const { error: motError } = await admin
      .from("mot_history")
      .upsert(motRows, { onConflict: "vehicle_id,mot_test_number" });

    if (motError) {
      // Not fatal — the vehicle and ownership are already saved. MOT
      // import can be retried later without losing the vehicle record.
      console.error(motError);
    }
  }

  return NextResponse.json({ vehicleId });
}
