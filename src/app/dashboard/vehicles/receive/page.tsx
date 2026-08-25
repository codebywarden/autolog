import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ReceiveVehicleForm } from "./receive-vehicle-form";

export default async function ReceiveVehiclePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return <ReceiveVehicleForm />;
}
