import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  getMotHistoryByRegistration,
  MotHistoryNotFoundError,
} from "@/lib/dvsa/mot-history";

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

  try {
    const data = await getMotHistoryByRegistration(normalized);
    return NextResponse.json({ vrm: normalized, data });
  } catch (error) {
    if (error instanceof MotHistoryNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    console.error(error);
    return NextResponse.json({ error: "Lookup failed" }, { status: 502 });
  }
}
