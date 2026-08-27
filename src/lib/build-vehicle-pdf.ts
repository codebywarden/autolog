import type { SupabaseClient } from "@supabase/supabase-js";
import { renderToBuffer } from "@react-pdf/renderer";
import {
  buildTimeline,
  type ServiceEntry,
  type MotHistoryRow,
} from "@/lib/timeline";
import { buildFactsheetSummary } from "@/lib/factsheet-summary";
import { VehicleHistoryDocument } from "@/app/api/vehicles/[id]/export/document";

interface VehicleInfo {
  vrm: string;
  make: string | null;
  model: string | null;
  colour: string | null;
  fuel_type: string | null;
  engine_size_cc: number | null;
}

/**
 * Shared by all three PDF-producing routes (owner's full export, owner's
 * factsheet, and the public share-link export) — the only real
 * difference between them is showCost and which client/auth path
 * fetched the data, so the fetch-and-render logic itself lives in one
 * place rather than three times.
 */
export async function buildVehicleHistoryPdf(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any, any, any>,
  vehicle: VehicleInfo,
  vehicleId: string,
  showCost: boolean,
): Promise<Buffer> {
  const [{ data: serviceEntries }, { data: motHistory }, { data: ownerRow }] =
    await Promise.all([
      supabase
        .from("service_entries")
        .select(
          "id, entry_date, mileage, service_type, garage_name, notes, verified, cost, resolved_mot_history_id, resolved_defect_index",
        )
        .eq("vehicle_id", vehicleId)
        .order("entry_date", { ascending: false })
        .returns<ServiceEntry[]>(),
      supabase
        .from("mot_history")
        .select(
          "id, test_date, completed_at, expiry_date, result, odometer_value, odometer_unit, raw_data, cost",
        )
        .eq("vehicle_id", vehicleId)
        .order("completed_at", { ascending: false })
        .returns<MotHistoryRow[]>(),
      supabase
        .from("vehicle_owners")
        .select("started_at")
        .eq("vehicle_id", vehicleId)
        .eq("is_current", true)
        .maybeSingle(),
    ]);

  const timeline = buildTimeline(serviceEntries ?? [], motHistory ?? []);
  const summary = buildFactsheetSummary(
    serviceEntries ?? [],
    motHistory ?? [],
    (ownerRow as { started_at: string } | null)?.started_at ?? null,
  );

  return renderToBuffer(
    VehicleHistoryDocument({ vehicle, timeline, summary, showCost }),
  );
}
