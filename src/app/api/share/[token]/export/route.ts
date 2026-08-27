import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  buildTimeline,
  type ServiceEntry,
  type MotHistoryRow,
} from "@/lib/timeline";
import { VehicleHistoryDocument } from "@/app/api/vehicles/[id]/export/document";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const admin = createAdminClient();

  const { data: link } = await admin
    .from("vehicle_share_links")
    .select("vehicle_id, expires_at, revoked_at")
    .eq("token", token)
    .maybeSingle();

  if (!link || link.revoked_at || new Date(link.expires_at) < new Date()) {
    return NextResponse.json(
      { error: "Invalid or expired link" },
      { status: 404 },
    );
  }

  const { data: vehicle } = await admin
    .from("vehicles")
    .select("id, vrm, make, model, colour, fuel_type")
    .eq("id", link.vehicle_id)
    .maybeSingle();

  if (!vehicle) {
    return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });
  }

  const [{ data: serviceEntries }, { data: motHistory }] = await Promise.all([
    admin
      .from("service_entries")
      .select(
        "id, entry_date, mileage, service_type, garage_name, notes, verified",
      )
      .eq("vehicle_id", vehicle.id)
      .order("entry_date", { ascending: false })
      .returns<ServiceEntry[]>(),
    admin
      .from("mot_history")
      .select(
        "id, test_date, completed_at, expiry_date, result, odometer_value, odometer_unit, raw_data",
      )
      .eq("vehicle_id", vehicle.id)
      .order("completed_at", { ascending: false })
      .returns<MotHistoryRow[]>(),
  ]);

  const timeline = buildTimeline(serviceEntries ?? [], motHistory ?? []);

  // showCost: false — a public share link is meant for verifying history
  // (MOT results, service dates), not for disclosing what the owner paid.
  const pdfBuffer = await renderToBuffer(
    VehicleHistoryDocument({ vehicle, timeline, showCost: false }),
  );

  return new NextResponse(new Uint8Array(pdfBuffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${vehicle.vrm}-history.pdf"`,
    },
  });
}
