import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { createClient } from "@/lib/supabase/server";
import {
  buildTimeline,
  type ServiceEntry,
  type MotHistoryRow,
} from "@/lib/timeline";
import { VehicleHistoryDocument } from "./document";

export async function GET(
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

  // RLS scopes this to the current owner already — a non-owner (or
  // logged-out request) just gets nothing back, same as the vehicle page.
  const { data: vehicle } = await supabase
    .from("vehicles")
    .select("id, vrm, make, model, colour, fuel_type")
    .eq("id", id)
    .maybeSingle();

  if (!vehicle) {
    return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });
  }

  const [{ data: serviceEntries }, { data: motHistory }] = await Promise.all([
    supabase
      .from("service_entries")
      .select(
        "id, entry_date, mileage, service_type, garage_name, notes, verified",
      )
      .eq("vehicle_id", id)
      .order("entry_date", { ascending: false })
      .returns<ServiceEntry[]>(),
    supabase
      .from("mot_history")
      .select(
        "id, test_date, completed_at, expiry_date, result, odometer_value, odometer_unit, raw_data",
      )
      .eq("vehicle_id", id)
      .order("completed_at", { ascending: false })
      .returns<MotHistoryRow[]>(),
  ]);

  const timeline = buildTimeline(serviceEntries ?? [], motHistory ?? []);

  const pdfBuffer = await renderToBuffer(
    VehicleHistoryDocument({ vehicle, timeline }),
  );

  return new NextResponse(new Uint8Array(pdfBuffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${vehicle.vrm}-history.pdf"`,
    },
  });
}
