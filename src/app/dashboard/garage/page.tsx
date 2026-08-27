import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { cardStyles } from "@/components/ui/styles";
import { CreateGarageForm } from "./create-garage-form";
import { RedeemCodeForm } from "./redeem-code-form";
import { VerificationRequestActions } from "./verification-request-actions";
import { WorkRequestActions } from "./work-request-actions";
import { WorkRequestThread, type WorkRequestMessage } from "@/components/work-request-thread";

interface GarageMembership {
  garage: { id: string; name: string } | null;
}

interface GarageVehicleRow {
  vehicle_id: string;
  vehicle: {
    id: string;
    vrm: string;
    make: string | null;
    model: string | null;
    colour: string | null;
  } | null;
}

interface PendingVerificationRequestRow {
  id: string;
  created_at: string;
  vehicle: { id: string; vrm: string } | null;
  service_entry: {
    entry_date: string;
    service_type: string;
    mileage: number | null;
    notes: string | null;
  } | null;
}

interface PendingWorkRequestRow {
  id: string;
  notes: string;
  preferred_date: string | null;
  contact_info: string | null;
  created_at: string;
  vehicle: { id: string; vrm: string } | null;
}

interface WorkRequestMessageRow {
  id: string;
  work_request_id: string;
  sender_role: "owner" | "garage";
  sender_label: string;
  body: string;
  created_at: string;
}

export default async function GaragePortalPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: memberships } = await supabase
    .from("garage_members")
    .select("garage:garages(id, name)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true })
    .returns<GarageMembership[]>();

  const garage = memberships?.[0]?.garage ?? null;

  if (!garage) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col gap-4 p-6">
        <Link
          href="/dashboard"
          className="text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          ← My vehicles
        </Link>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Set up your garage
        </h1>
        <p className="text-sm text-muted-foreground">
          Create a garage account to redeem vehicle access codes and add
          verified service entries.
        </p>
        <CreateGarageForm />
      </main>
    );
  }

  const { data: accessRows } = await supabase
    .from("vehicle_garage_access")
    .select("vehicle_id, vehicle:vehicles(id, vrm, make, model, colour)")
    .eq("garage_id", garage.id)
    .is("revoked_at", null)
    .returns<GarageVehicleRow[]>();

  const vehicles = (accessRows ?? [])
    .map((row) => row.vehicle)
    .filter((vehicle) => vehicle !== null);

  const { data: pendingRequestRows } = await supabase
    .from("entry_verification_requests")
    .select(
      "id, created_at, vehicle:vehicles(id, vrm), service_entry:service_entries(entry_date, service_type, mileage, notes)",
    )
    .eq("garage_id", garage.id)
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .returns<PendingVerificationRequestRow[]>();

  const pendingRequests = pendingRequestRows ?? [];

  const { data: pendingWorkRequestRows } = await supabase
    .from("work_requests")
    .select(
      "id, notes, preferred_date, contact_info, created_at, vehicle:vehicles(id, vrm)",
    )
    .eq("garage_id", garage.id)
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .returns<PendingWorkRequestRow[]>();

  const pendingWorkRequests = pendingWorkRequestRows ?? [];

  const pendingWorkRequestIds = pendingWorkRequests.map((request) => request.id);
  const { data: workRequestMessageRows } =
    pendingWorkRequestIds.length > 0
      ? await supabase
          .from("work_request_messages")
          .select("id, work_request_id, sender_role, sender_label, body, created_at")
          .in("work_request_id", pendingWorkRequestIds)
          .order("created_at", { ascending: true })
          .returns<WorkRequestMessageRow[]>()
      : { data: [] as WorkRequestMessageRow[] };

  const messagesByWorkRequest = new Map<string, WorkRequestMessage[]>();
  for (const message of workRequestMessageRows ?? []) {
    const list = messagesByWorkRequest.get(message.work_request_id) ?? [];
    list.push({
      id: message.id,
      senderRole: message.sender_role,
      senderLabel: message.sender_label,
      body: message.body,
      createdAt: message.created_at,
    });
    messagesByWorkRequest.set(message.work_request_id, list);
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col gap-4 p-6">
      <Link
        href="/dashboard"
        className="text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        ← My vehicles
      </Link>
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          {garage.name}
        </h1>
        <p className="text-sm text-muted-foreground">Garage portal</p>
      </div>

      <RedeemCodeForm />

      {pendingRequests.length > 0 && (
        <div className="flex flex-col gap-2.5">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Verification requests
          </p>
          <ul className="flex flex-col gap-2.5">
            {pendingRequests.map((request) => (
              <li key={request.id} className={cardStyles("text-sm")}>
                <p className="font-mono text-sm font-semibold tracking-wide text-foreground">
                  {request.vehicle?.vrm ?? "Unknown vehicle"}
                </p>
                {request.service_entry && (
                  <>
                    <p className="mt-0.5 capitalize text-foreground">
                      {request.service_entry.service_type} —{" "}
                      {request.service_entry.entry_date}
                    </p>
                    {request.service_entry.mileage != null && (
                      <p className="text-muted-foreground">
                        {request.service_entry.mileage.toLocaleString()} mi
                      </p>
                    )}
                    {request.service_entry.notes && (
                      <p className="text-muted-foreground">
                        {request.service_entry.notes}
                      </p>
                    )}
                  </>
                )}
                <VerificationRequestActions requestId={request.id} />
              </li>
            ))}
          </ul>
        </div>
      )}

      {pendingWorkRequests.length > 0 && (
        <div className="flex flex-col gap-2.5">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Work requests
          </p>
          <ul className="flex flex-col gap-2.5">
            {pendingWorkRequests.map((request) => (
              <li key={request.id} className={cardStyles("text-sm")}>
                <p className="font-mono text-sm font-semibold tracking-wide text-foreground">
                  {request.vehicle?.vrm ?? "Unknown vehicle"}
                </p>
                <p className="mt-0.5 text-foreground">{request.notes}</p>
                {request.preferred_date && (
                  <p className="text-muted-foreground">
                    Preferred: {request.preferred_date}
                  </p>
                )}
                {request.contact_info && (
                  <p className="text-muted-foreground">
                    Contact: {request.contact_info}
                  </p>
                )}
                <WorkRequestActions requestId={request.id} />
                <WorkRequestThread
                  workRequestId={request.id}
                  viewerRole="garage"
                  senderLabel={garage.name}
                  initialMessages={messagesByWorkRequest.get(request.id) ?? []}
                />
              </li>
            ))}
          </ul>
        </div>
      )}

      {vehicles.length === 0 ? (
        <p className={cardStyles("text-sm text-muted-foreground")}>
          No vehicles yet — redeem a code from a customer to get access.
        </p>
      ) : (
        <ul className="flex flex-col gap-2.5">
          {vehicles.map((vehicle) => (
            <li key={vehicle.id}>
              <Link
                href={`/dashboard/garage/vehicles/${vehicle.id}`}
                className={cardStyles(
                  "block text-sm transition-colors hover:border-border-strong",
                )}
              >
                <p className="font-mono text-base font-semibold tracking-wide text-foreground">
                  {vehicle.vrm}
                </p>
                <p className="text-muted-foreground">
                  {[vehicle.make, vehicle.model, vehicle.colour]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
