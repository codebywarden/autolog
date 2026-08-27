import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildWorkRequestIcsFeed, type IcsJob } from "@/lib/ics";

interface AcceptedJobRow {
  id: string;
  notes: string;
  scheduled_date: string | null;
  scheduled_time: string | null;
  contact_info: string | null;
  vehicle: { vrm: string } | null;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;

  // No session exists here at all — a calendar app polls this URL
  // unauthenticated on its own schedule, so access is gated by the
  // high-entropy token itself rather than a login, same shape as the
  // public share-link route.
  const admin = createAdminClient();

  const { data: garage } = await admin
    .from("garages")
    .select("id, name")
    .eq("calendar_feed_token", token)
    .maybeSingle();

  if (!garage) {
    return NextResponse.json({ error: "Invalid feed" }, { status: 404 });
  }

  const { data: jobRows } = await admin
    .from("work_requests")
    .select(
      "id, notes, scheduled_date, scheduled_time, contact_info, vehicle:vehicles(vrm)",
    )
    .eq("garage_id", garage.id)
    .eq("status", "accepted")
    .not("scheduled_date", "is", null)
    .returns<AcceptedJobRow[]>();

  const jobs: IcsJob[] = (jobRows ?? []).map((row) => ({
    id: row.id,
    vrm: row.vehicle?.vrm ?? "Unknown vehicle",
    notes: row.notes,
    scheduledDate: row.scheduled_date!,
    scheduledTime: row.scheduled_time,
    contactInfo: row.contact_info,
  }));

  const ics = buildWorkRequestIcsFeed(`${garage.name} — Motor360 jobs`, jobs);

  return new NextResponse(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'attachment; filename="motor360-jobs.ics"',
      "Cache-Control": "no-store",
    },
  });
}
