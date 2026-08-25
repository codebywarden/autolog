import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SignOutButton } from "./sign-out-button";

interface OwnedVehicleRow {
  vehicle: {
    id: string;
    vrm: string;
    make: string | null;
    model: string | null;
    colour: string | null;
  } | null;
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: ownedVehicles } = await supabase
    .from("vehicle_owners")
    .select("vehicle:vehicles(id, vrm, make, model, colour)")
    .eq("user_id", user.id)
    .eq("is_current", true)
    .returns<OwnedVehicleRow[]>();

  const vehicles = (ownedVehicles ?? [])
    .map((row) => row.vehicle)
    .filter((vehicle) => vehicle !== null);

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col gap-4 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Your vehicles</h1>
        <SignOutButton />
      </div>
      <p className="text-sm text-neutral-600">Signed in as {user.email}</p>

      <Link
        href="/dashboard/vehicles/add"
        className="rounded bg-black px-4 py-2 text-center text-sm font-medium text-white"
      >
        Add a vehicle
      </Link>

      {vehicles.length === 0 ? (
        <p className="text-sm text-neutral-600">No vehicles yet.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {vehicles.map((vehicle) => (
            <li key={vehicle.id}>
              <Link
                href={`/dashboard/vehicles/${vehicle.id}`}
                className="block rounded border border-neutral-300 p-3 text-sm hover:border-neutral-400"
              >
                <p className="font-semibold">{vehicle.vrm}</p>
                <p className="text-neutral-600">
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
