import type { ComponentType, SVGProps } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { cardStyles } from "@/components/ui/styles";
import {
  OilCanIcon,
  ThermometerIcon,
  BrakeIcon,
  BatteryIcon,
  EngineIcon,
  AbsIcon,
  TyrePressureIcon,
  DpfIcon,
  PowerSteeringIcon,
  AirbagIcon,
  SeatbeltIcon,
  IndicatorIcon,
  FogLightIcon,
  CruiseControlIcon,
  MainBeamIcon,
} from "./warning-icons";

interface WarningLight {
  name: string;
  Icon: ComponentType<SVGProps<SVGSVGElement>>;
  description: string;
}

interface ColourBand {
  title: string;
  meaning: string;
  textClass: string;
  bgClass: string;
  borderClass: string;
  lights: WarningLight[];
}

// Grouped by dashboard light colour, not by system — colour is what a
// driver actually sees first, and it's what determines urgency
// regardless of which specific system triggered it.
const COLOUR_BANDS: ColourBand[] = [
  {
    title: "Red",
    meaning: "Stop safely as soon as you can — these indicate an immediate risk.",
    textClass: "text-critical",
    bgClass: "bg-critical-bg",
    borderClass: "border-critical/25",
    lights: [
      {
        name: "Oil pressure",
        Icon: OilCanIcon,
        description: "Low oil pressure. Continuing to drive risks serious engine damage — stop as soon as it's safe and check the oil level.",
      },
      {
        name: "Coolant temperature",
        Icon: ThermometerIcon,
        description: "The engine is overheating. Stop, let it cool, and don't remove the coolant cap while hot.",
      },
      {
        name: "Brake system",
        Icon: BrakeIcon,
        description: "A fault in the braking system, or brake fluid is low. Treat as urgent — check the handbrake is fully released first.",
      },
    ],
  },
  {
    title: "Amber",
    meaning: "Not an emergency, but get it checked soon — a fault has been detected.",
    textClass: "text-warning",
    bgClass: "bg-warning-bg",
    borderClass: "border-warning/25",
    lights: [
      {
        name: "Engine management / check engine",
        Icon: EngineIcon,
        description: "The engine control system has flagged a fault. Usually safe to drive short-term, but worth a diagnostic soon — it's also what most MOT emissions failures trace back to.",
      },
      {
        name: "ABS",
        Icon: AbsIcon,
        description: "The anti-lock braking system has a fault. Normal braking still works, but ABS won't assist in an emergency stop.",
      },
      {
        name: "Battery / charging",
        Icon: BatteryIcon,
        description: "The battery isn't charging correctly. The car may still run for a while on battery power, but could fail to restart.",
      },
      {
        name: "Tyre pressure (TPMS)",
        Icon: TyrePressureIcon,
        description: "One or more tyres are significantly under-inflated. Check pressures when safe to do so.",
      },
      {
        name: "DPF (diesel particulate filter)",
        Icon: DpfIcon,
        description: "The filter needs a regeneration cycle, usually done automatically on a sustained motorway drive. Persisting after that suggests a fault.",
      },
      {
        name: "Power steering",
        Icon: PowerSteeringIcon,
        description: "A fault in the power-assisted steering. The car will still steer, but much more heavily.",
      },
      {
        name: "Airbag (SRS)",
        Icon: AirbagIcon,
        description: "A fault in the airbag or seatbelt pretensioner system. Airbags may not deploy correctly in a collision.",
      },
    ],
  },
  {
    title: "Green",
    meaning: "A system is switched on and working — this is normal, not a fault.",
    textClass: "text-success",
    bgClass: "bg-success-bg",
    borderClass: "border-success/25",
    lights: [
      {
        name: "Direction indicators",
        Icon: IndicatorIcon,
        description: "Your indicators are active. A fast-flashing indicator light usually means a bulb has blown.",
      },
      {
        name: "Front fog lights",
        Icon: FogLightIcon,
        description: "Front fog lights are on. Switch off once visibility improves — they can dazzle other drivers.",
      },
      {
        name: "Cruise control",
        Icon: CruiseControlIcon,
        description: "Cruise control is active and holding a set speed.",
      },
      {
        name: "Seatbelt reminder",
        Icon: SeatbeltIcon,
        description: "A reminder that a seatbelt isn't fastened. No fault — just buckle up.",
      },
    ],
  },
  {
    title: "Blue",
    meaning: "Informational — almost always your main beam headlights.",
    textClass: "text-primary",
    bgClass: "bg-primary-tint",
    borderClass: "border-primary/25",
    lights: [
      {
        name: "Main beam headlights",
        Icon: MainBeamIcon,
        description: "Main beam is on. Dip to sidelights/dipped beam when another vehicle approaches.",
      },
    ],
  },
];

const USEFUL_LINKS = [
  { label: "Tax your vehicle", href: "https://www.gov.uk/vehicle-tax" },
  { label: "Check if a vehicle is taxed", href: "https://www.gov.uk/check-vehicle-tax" },
  { label: "Book an MOT test", href: "https://www.gov.uk/getting-an-mot" },
  { label: "Check MOT history", href: "https://www.gov.uk/check-mot-history" },
  { label: "Request a V5C logbook", href: "https://www.gov.uk/get-vehicle-log-book" },
  { label: "Renew your driving licence", href: "https://www.gov.uk/renew-driving-licence" },
  { label: "Declare SORN (off the road)", href: "https://www.gov.uk/sorn" },
];

export default async function ResourcesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-5 p-6">
      <Link
        href="/dashboard"
        className="text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        ← Your vehicles
      </Link>

      <h1 className="text-2xl font-bold tracking-tight text-foreground">
        Resources
      </h1>

      <section className="flex flex-col gap-2.5">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Useful links
        </h2>
        <div className={cardStyles("grid grid-cols-1 gap-2 sm:grid-cols-2")}>
          {USEFUL_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-primary underline underline-offset-2 hover:text-primary-hover"
            >
              {link.label} ↗
            </a>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-5">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Dashboard warning lights
        </h2>

        {COLOUR_BANDS.map((band) => (
          <div key={band.title} className="flex flex-col gap-2.5">
            <div className={`rounded-lg border ${band.borderClass} ${band.bgClass} px-3 py-2`}>
              <p className={`text-sm font-semibold ${band.textClass}`}>{band.title}</p>
              <p className="text-sm text-muted-foreground">{band.meaning}</p>
            </div>
            <ul className="flex flex-col gap-2">
              {band.lights.map((light) => (
                <li
                  key={light.name}
                  className={cardStyles("flex items-start gap-3 text-sm")}
                >
                  <light.Icon className={`h-6 w-6 shrink-0 ${band.textClass}`} />
                  <div>
                    <p className="font-semibold text-foreground">{light.name}</p>
                    <p className="mt-0.5 text-muted-foreground">{light.description}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>
    </main>
  );
}
