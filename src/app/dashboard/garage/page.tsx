import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { cardStyles } from "@/components/ui/styles";
import { CreateGarageForm } from "./create-garage-form";
import { RedeemCodeForm } from "./redeem-code-form";

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
          ← Your vehicles
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

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col gap-4 p-6">
      <Link
        href="/dashboard"
        className="text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        ← Your vehicles
      </Link>
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          {garage.name}
        </h1>
        <p className="text-sm text-muted-foreground">Garage portal</p>
      </div>

      <RedeemCodeForm />

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
