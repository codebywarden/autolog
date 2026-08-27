import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildVehicleHistoryPdf } from "@/lib/build-vehicle-pdf";

// Same document as the full export, minus cost — the owner's own
// no-login-required-to-generate copy of what a share link would produce,
// for handovers where creating and sending a link is more than needed.
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

  const { data: vehicle } = await supabase
    .from("vehicles")
    .select("id, vrm, make, model, colour, fuel_type, engine_size_cc")
    .eq("id", id)
    .maybeSingle();

  if (!vehicle) {
    return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });
  }

  const pdfBuffer = await buildVehicleHistoryPdf(supabase, vehicle, id, false);

  return new NextResponse(new Uint8Array(pdfBuffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${vehicle.vrm}-factsheet.pdf"`,
    },
  });
}
