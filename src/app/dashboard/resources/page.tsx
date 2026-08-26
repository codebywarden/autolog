import type { ComponentType, SVGProps } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { cardStyles } from "@/components/ui/styles";
import {
  TextIcon,
  BatteryIcon,
  BrakeIcon,
  HazardIcon,
  OilCanIcon,
  SeatbeltIcon,
  PowerSteeringIcon,
  BrakePadsIcon,
  ThermometerIcon,
  DoorsOpenIcon,
  SecurityKeyIcon,
  TransmissionIcon,
  BonnetOpenIcon,
  AirbagOffIcon,
  BrakeFluidIcon,
  TransOilTempIcon,
  BootOpenIcon,
  WasherFluidIcon,
  EngineIcon,
  FuelPumpIcon,
  EspIcon,
  ServiceIcon,
  TractionOnIcon,
  LaneAssistIcon,
  LowOilIcon,
  CruiseControlIcon,
  LowCoolantIcon,
  TyrePressureIcon,
  WaterInFuelIcon,
  GlowPlugIcon,
  DpfIcon,
  CatalyticIcon,
  ChildLockIcon,
  AbsIcon,
  BulbFailureIcon,
  TurtleIcon,
  PlugIcon,
  ParkingSensorIcon,
  DippedBeamIcon,
  FogLightIcon,
  MainBeamIcon,
  InteriorLightIcon,
  DoubleIndicatorIcon,
  VentilationIcon,
  WiperIcon,
  SideLightsIcon,
  StopStartIcon,
} from "./warning-icons";

type Tone = "critical" | "warning" | "success" | "info";

interface WarningLight {
  name: string;
  Icon: ComponentType<SVGProps<SVGSVGElement>>;
  description: string;
  tone?: Tone;
}

interface ColourBand {
  title: string;
  meaning: string;
  defaultTone: Tone;
  lights: WarningLight[];
}

const TONE_TEXT: Record<Tone, string> = {
  critical: "text-critical",
  warning: "text-warning",
  success: "text-success",
  info: "text-primary",
};
const TONE_BG: Record<Tone, string> = {
  critical: "bg-critical-bg",
  warning: "bg-warning-bg",
  success: "bg-success-bg",
  info: "bg-primary-tint",
};
const TONE_BORDER: Record<Tone, string> = {
  critical: "border-critical/25",
  warning: "border-warning/25",
  success: "border-success/25",
  info: "border-primary/25",
};

// Grouped by dashboard light colour, matching how manufacturers and
// the Highway Code categorise them — colour is what a driver sees
// first, and determines urgency regardless of which system triggered it.
const COLOUR_BANDS: ColourBand[] = [
  {
    title: "Red",
    meaning: "Needs attention now — pull over safely as soon as you can.",
    defaultTone: "critical",
    lights: [
      { name: "Battery warning", Icon: BatteryIcon, description: "The battery isn't charging correctly — the car may run for a while but could fail to restart." },
      { name: "Brake system alert", Icon: BrakeIcon, description: "A fault in the braking system, or brake fluid is low. Treat as urgent." },
      { name: "Hazard warning", Icon: HazardIcon, description: "Your hazard lights are switched on." },
      { name: "Oil pressure warning", Icon: OilCanIcon, description: "Low oil pressure — continuing to drive risks serious engine damage." },
      { name: "Seat belt reminder", Icon: SeatbeltIcon, description: "A seatbelt isn't fastened." },
      { name: "Power steering warning", Icon: PowerSteeringIcon, description: "A fault in the power-assisted steering — it will still steer, but much more heavily." },
      { name: "Handbrake on", Icon: (p) => <TextIcon lines={["P"]} bracketed {...p} />, description: "The handbrake is engaged." },
      { name: "Brake pads fault", Icon: BrakePadsIcon, description: "Brake pads are worn thin and need replacing soon." },
      { name: "Engine temperature warning", Icon: ThermometerIcon, description: "The engine is overheating — stop, let it cool, and don't remove the coolant cap while hot." },
      { name: "Doors open reminder", Icon: DoorsOpenIcon, description: "A door isn't fully closed." },
      { name: "Security system fault", Icon: SecurityKeyIcon, description: "A fault in the immobiliser or alarm system." },
      { name: "Transmission fault", Icon: TransmissionIcon, description: "A fault in the gearbox or transmission system." },
      { name: "SRS fault", Icon: (p) => <TextIcon lines={["SRS"]} {...p} />, description: "A fault in the airbag/pretensioner (Supplementary Restraint System)." },
      { name: "Airbag switched off", Icon: AirbagOffIcon, description: "A passenger airbag has been manually switched off." },
      { name: "Bonnet open reminder", Icon: BonnetOpenIcon, description: "The bonnet isn't fully closed." },
      { name: "Airbag fault alert", Icon: (p) => <TextIcon lines={["AIR", "BAG"]} {...p} />, description: "A fault in the airbag system — it may not deploy correctly in a collision." },
      { name: "Brake fluid low", Icon: BrakeFluidIcon, description: "Brake fluid is low. Treat as urgent." },
      { name: "High transmission oil temperature", Icon: TransOilTempIcon, description: "Gearbox oil is overheating — common after heavy towing or stop-start traffic." },
      { name: "Boot open reminder", Icon: BootOpenIcon, description: "The boot isn't fully closed." },
    ],
  },
  {
    title: "Amber",
    meaning: "Not usually an emergency, but don't ignore it — get it checked before it becomes a bigger problem.",
    defaultTone: "warning",
    lights: [
      { name: "Washer fluid low", Icon: WasherFluidIcon, description: "Screen wash is running low." },
      { name: "Check engine", Icon: EngineIcon, description: "The engine management system has flagged a fault — worth a diagnostic soon. Also what most MOT emissions failures trace back to." },
      { name: "Low fuel warning", Icon: FuelPumpIcon, description: "Fuel is running low." },
      { name: "ESP fault warning", Icon: EspIcon, description: "A fault in the electronic stability/skid control system." },
      { name: "Due a service indicator", Icon: ServiceIcon, description: "The vehicle is due a scheduled service." },
      { name: "Traction control activated", Icon: TractionOnIcon, description: "Traction control has intervened because a wheel has lost grip." },
      { name: "Side airbag fault", Icon: (p) => <TextIcon lines={["SIDE", "AIRBAG", "OFF"]} {...p} />, description: "The side/curtain airbag has a fault, or has been switched off." },
      { name: "Lane assist in operation", Icon: LaneAssistIcon, description: "Lane-keeping assist is active." },
      { name: "Low oil level", Icon: LowOilIcon, description: "Engine oil level is low — top up soon." },
      { name: "Cruise control in operation", Icon: CruiseControlIcon, description: "Cruise control is active and holding a set speed." },
      { name: "Low on coolant", Icon: LowCoolantIcon, description: "Coolant level is low." },
      { name: "Change in tyre pressure (TPMS)", Icon: TyrePressureIcon, description: "One or more tyres are significantly under-inflated." },
      { name: "Water in fuel (diesel)", Icon: WaterInFuelIcon, description: "Water has been detected in the diesel fuel filter — drain it before it reaches the engine." },
      { name: "Glow plug indicator (diesel)", Icon: GlowPlugIcon, description: "Glow plugs are warming the engine before starting — a fault if it stays on after starting." },
      { name: "DPF replacement due", Icon: DpfIcon, description: "The diesel particulate filter needs attention, usually a sustained motorway run or a garage visit." },
      { name: "4x4 low gear mode", Icon: (p) => <TextIcon lines={["4x4", "LOW"]} {...p} />, description: "Four-wheel drive is set to low-range gearing." },
      { name: "4x4 high gear mode", Icon: (p) => <TextIcon lines={["4x4", "HIGH"]} {...p} />, description: "Four-wheel drive is set to high-range gearing." },
      { name: "Catalytic converter warning", Icon: CatalyticIcon, description: "The catalytic converter is overheating, often linked to a misfire." },
      { name: "Child safety lock on", Icon: ChildLockIcon, description: "Rear child locks are engaged." },
      { name: "RBS hybrid fault", Icon: (p) => <TextIcon lines={["RBS"]} bracketed {...p} />, description: "A fault in the regenerative braking system on a hybrid or EV." },
      { name: "Traction control deactivated", Icon: (p) => <TextIcon lines={["TC"]} bracketed slashed {...p} />, description: "Traction control has been manually switched off." },
      { name: "ABS warning", Icon: AbsIcon, description: "A fault in the anti-lock braking system — normal brakes still work, but without ABS assistance." },
      { name: "Bulb failure", Icon: BulbFailureIcon, description: "An exterior bulb has blown." },
      { name: "Limited electric power", Icon: TurtleIcon, description: "Reduced-power \"limp\" mode on a hybrid or EV." },
      { name: "Vehicle electric charging", Icon: PlugIcon, description: "The vehicle is plugged in, or a charging fault has been detected." },
    ],
  },
  {
    title: "Green (or blue)",
    meaning: "Confirms a system is switched on — normal, not a fault. The blue ones (main beam, a cold engine) are still worth a glance.",
    defaultTone: "success",
    lights: [
      { name: "Parking sensor in operation", Icon: ParkingSensorIcon, description: "Parking sensors are active and detecting an obstacle." },
      { name: "ECO mode activated", Icon: (p) => <TextIcon lines={["ECO", "MODE"]} {...p} />, description: "Economy driving mode is active." },
      { name: "Headlamps on", Icon: DippedBeamIcon, description: "Dipped headlights are on." },
      { name: "Fog lights on", Icon: FogLightIcon, description: "Front fog lights are on — switch off once visibility improves, they can dazzle other drivers." },
      { name: "Full beam lights on", Icon: MainBeamIcon, description: "Main beam is on — dip it when another vehicle approaches.", tone: "info" },
      { name: "Interior light on", Icon: InteriorLightIcon, description: "An interior light has been left on." },
      { name: "Coolant system too cold", Icon: ThermometerIcon, description: "The engine hasn't warmed up yet — normal on a cold start.", tone: "info" },
      { name: "Indicators on", Icon: DoubleIndicatorIcon, description: "A direction indicator is active — fast flashing usually means a bulb has blown." },
      { name: "Car ventilation indicator", Icon: VentilationIcon, description: "The climate/ventilation system is active." },
      { name: "Windscreen wipers on", Icon: WiperIcon, description: "Automatic wipers are active." },
      { name: "Automatic handbrake on (HOLD)", Icon: (p) => <TextIcon lines={["HOLD"]} bracketed {...p} />, description: "Auto hold is keeping the car stationary without the footbrake." },
      { name: "Side lights on", Icon: SideLightsIcon, description: "Sidelights are on." },
      { name: "Electric vehicle mode activated", Icon: (p) => <TextIcon lines={["EV", "MODE"]} {...p} />, description: "The hybrid is running on electric power only." },
      { name: "Electric car charging", Icon: PlugIcon, description: "The vehicle is actively charging." },
      { name: "Stop/start system", Icon: StopStartIcon, description: "Engine stop/start is active, switching the engine off at idle to save fuel." },
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
        ← My vehicles
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
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Dashboard warning lights
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            A guide only — exact symbols and meanings vary by make and
            model. Check your handbook for specifics, and see a garage
            for anything you're unsure about.
          </p>
        </div>

        {COLOUR_BANDS.map((band) => (
          <details key={band.title} open className="flex flex-col gap-2.5">
            <summary className="cursor-pointer list-none">
              <div
                className={`rounded-lg border ${TONE_BORDER[band.defaultTone]} ${TONE_BG[band.defaultTone]} px-3 py-2`}
              >
                <p className={`text-sm font-semibold ${TONE_TEXT[band.defaultTone]}`}>
                  {band.title} · {band.lights.length}
                </p>
                <p className="text-sm text-muted-foreground">{band.meaning}</p>
              </div>
            </summary>
            <ul className="mt-2.5 flex flex-col gap-2">
              {band.lights.map((light) => {
                const tone = light.tone ?? band.defaultTone;
                return (
                  <li
                    key={light.name}
                    className={cardStyles("flex items-start gap-3 text-sm")}
                  >
                    <light.Icon className={`h-6 w-6 shrink-0 ${TONE_TEXT[tone]}`} />
                    <div>
                      <p className="font-semibold text-foreground">{light.name}</p>
                      <p className="mt-0.5 text-muted-foreground">{light.description}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </details>
        ))}
      </section>
    </main>
  );
}
