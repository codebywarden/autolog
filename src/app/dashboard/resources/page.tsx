import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { cardStyles } from "@/components/ui/styles";
import { Badge, type BadgeTone } from "@/components/ui/badge";

interface WarningLight {
  name: string;
  tone: BadgeTone;
  toneLabel: string;
  description: string;
}

// Severity is about what to do, not a diagnosis — "stop safely" vs.
// "book it in soon" vs. "just a reminder" is the useful distinction for
// someone glancing at this mid-drive, not the technical cause.
const WARNING_LIGHTS: WarningLight[] = [
  {
    name: "Oil pressure",
    tone: "critical",
    toneLabel: "Stop safely",
    description: "Low oil pressure. Continuing to drive risks serious engine damage — stop as soon as it's safe and check the oil level.",
  },
  {
    name: "Coolant temperature",
    tone: "critical",
    toneLabel: "Stop safely",
    description: "The engine is overheating. Stop, let it cool, and don't remove the coolant cap while hot.",
  },
  {
    name: "Brake system",
    tone: "critical",
    toneLabel: "Stop safely",
    description: "A fault in the braking system, or the handbrake is engaged, or brake fluid is low. Treat as urgent.",
  },
  {
    name: "Engine management / check engine",
    tone: "warning",
    toneLabel: "Book it in",
    description: "The engine control system has flagged a fault. Usually safe to drive short-term, but worth a diagnostic soon — it's also what most MOT emissions failures trace back to.",
  },
  {
    name: "ABS",
    tone: "warning",
    toneLabel: "Book it in",
    description: "The anti-lock braking system has a fault. Normal braking still works, but ABS won't assist in an emergency stop.",
  },
  {
    name: "Battery / charging",
    tone: "warning",
    toneLabel: "Book it in",
    description: "The battery isn't charging correctly. The car may still run for a while on battery power, but could fail to restart.",
  },
  {
    name: "Tyre pressure (TPMS)",
    tone: "warning",
    toneLabel: "Book it in",
    description: "One or more tyres are significantly under-inflated. Check pressures when safe to do so.",
  },
  {
    name: "DPF (diesel particulate filter)",
    tone: "warning",
    toneLabel: "Book it in",
    description: "The filter needs a regeneration cycle, usually done automatically on a sustained motorway drive. Persisting after that suggests a fault.",
  },
  {
    name: "Airbag",
    tone: "warning",
    toneLabel: "Book it in",
    description: "A fault in the airbag or seatbelt pretensioner system. Airbags may not deploy correctly in a collision.",
  },
  {
    name: "Seatbelt reminder",
    tone: "neutral",
    toneLabel: "Informational",
    description: "A reminder that a seatbelt isn't fastened. No fault — just buckle up.",
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

      <section className="flex flex-col gap-2.5">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Warning light glossary
        </h2>
        <ul className="flex flex-col gap-2.5">
          {WARNING_LIGHTS.map((light) => (
            <li key={light.name} className={cardStyles("text-sm")}>
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold text-foreground">{light.name}</span>
                <Badge tone={light.tone}>{light.toneLabel}</Badge>
              </div>
              <p className="mt-1 text-muted-foreground">{light.description}</p>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
