import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildVehicleHistoryPdf } from "@/lib/build-vehicle-pdf";

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
    .select("id, vrm, make, model, colour, fuel_type, engine_size_cc")
    .eq("id", link.vehicle_id)
    .maybeSingle();

  if (!vehicle) {
    return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });
  }

  // showCost: false — a public share link is meant for verifying history
  // (MOT results, service dates), not for disclosing what the owner paid.
  const pdfBuffer = await buildVehicleHistoryPdf(admin, vehicle, vehicle.id, false);

  return new NextResponse(new Uint8Array(pdfBuffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${vehicle.vrm}-history.pdf"`,
    },
  });
}
