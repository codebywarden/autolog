import type { ReactNode, SVGProps } from "react";

// Simple line-icon renditions of standardised dashboard telltale shapes
// (ISO 2575 and common industry conventions) — the same pictogram
// appears across manufacturers, so these represent the universal
// symbol, not any one brand's specific artwork. Text-based telltales
// (SRS, ABS, 4x4 LOW, etc.) are rendered as plain text, same as they
// appear on a real dashboard.

function Base({ children, ...props }: { children: ReactNode } & SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-6 w-6"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  );
}

function BracketShape() {
  return (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M9 8c-1 1.2-1 6.8 0 8" />
      <path d="M15 8c1 1.2 1 6.8 0 8" />
    </>
  );
}

export function TextIcon({
  lines,
  bracketed = false,
  slashed = false,
  ...props
}: SVGProps<SVGSVGElement> & { lines: string[]; bracketed?: boolean; slashed?: boolean }) {
  const fontSize = lines.length >= 3 ? 3.4 : lines.length === 2 ? 5 : 6.5;
  const lineHeight = fontSize * 1.2;
  const startY = 12 - ((lines.length - 1) * lineHeight) / 2 + fontSize * 0.35;
  return (
    <Base {...props}>
      {bracketed && <BracketShape />}
      {lines.map((line, i) => (
        <text
          key={i}
          x="12"
          y={startY + i * lineHeight}
          fontSize={fontSize}
          fontWeight={800}
          fontFamily="sans-serif"
          textAnchor="middle"
          fill="currentColor"
          stroke="none"
        >
          {line}
        </text>
      ))}
      {slashed && <line x1="5" y1="19" x2="19" y2="5" />}
    </Base>
  );
}

// --- Red ---------------------------------------------------------------

export function BatteryIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Base {...props}>
      <rect x="3" y="8" width="16" height="9" rx="1.5" />
      <path d="M19 11h2v3h-2" />
      <line x1="7" y1="8" x2="7" y2="5" />
      <line x1="14" y1="8" x2="14" y2="5" />
    </Base>
  );
}

export function BrakeIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Base {...props}>
      <BracketShape />
      <line x1="12" y1="9" x2="12" y2="14" />
      <circle cx="12" cy="16.3" r="0.5" fill="currentColor" stroke="none" />
    </Base>
  );
}

export function HazardIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Base {...props}>
      <path d="M12 4l9 15H3L12 4Z" />
      <line x1="12" y1="10" x2="12" y2="14.5" />
      <circle cx="12" cy="17" r="0.5" fill="currentColor" stroke="none" />
    </Base>
  );
}

export function OilCanIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Base {...props}>
      <path d="M6 11c0-2.5 2-4 5-4s5 1.5 5 4v6a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2v-6Z" />
      <path d="M16 10l4-2" />
      <path d="M9 7V5" />
    </Base>
  );
}

export function SeatbeltIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Base {...props}>
      <circle cx="12" cy="7" r="2.2" />
      <path d="M9 20v-5a3 3 0 0 1 3-3a3 3 0 0 1 3 3v5" />
      <line x1="7" y1="9" x2="16" y2="18" />
    </Base>
  );
}

export function PowerSteeringIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Base {...props}>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 4v4" />
      <path d="M12 20v-4" />
      <path d="M5.5 8.5l3.5 2" />
      <path d="M18.5 8.5l-3.5 2" />
      <circle cx="12" cy="12" r="1.3" fill="currentColor" stroke="none" />
    </Base>
  );
}

export function BrakePadsIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Base {...props}>
      <BracketShape />
      <circle cx="12" cy="12" r="3.2" />
    </Base>
  );
}

export function ThermometerIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Base {...props}>
      <path d="M12 3a2 2 0 0 0-2 2v9.5a4 4 0 1 0 4 0V5a2 2 0 0 0-2-2Z" />
      <path d="M12 8v6" />
    </Base>
  );
}

export function DoorsOpenIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Base {...props}>
      <path d="M5 9a1 1 0 0 1 1-1h10l3 3v6a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V9Z" />
      <path d="M16 8l2-3" />
      <line x1="9" y1="12" x2="13" y2="12" />
    </Base>
  );
}

export function SecurityKeyIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Base {...props}>
      <circle cx="7" cy="12" r="3" />
      <line x1="10" y1="12" x2="19" y2="12" />
      <line x1="16" y1="12" x2="16" y2="15" />
      <line x1="19" y1="12" x2="19" y2="15" />
      <circle cx="7" cy="12" r="0.6" fill="currentColor" stroke="none" />
    </Base>
  );
}

export function TransmissionIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Base {...props}>
      <circle cx="12" cy="12" r="6.5" />
      <circle cx="12" cy="12" r="2" />
      <line x1="12" y1="3.5" x2="12" y2="6" />
      <line x1="12" y1="18" x2="12" y2="20.5" />
      <line x1="3.5" y1="12" x2="6" y2="12" />
      <line x1="18" y1="12" x2="20.5" y2="12" />
    </Base>
  );
}

export function BonnetOpenIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Base {...props}>
      <path d="M3 16h4l2-3h8l2 3h2v2H3v-2Z" />
      <circle cx="7" cy="18" r="1.2" />
      <circle cx="17" cy="18" r="1.2" />
      <path d="M9 13l2-4" />
    </Base>
  );
}

export function AirbagOffIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Base {...props}>
      <circle cx="9" cy="7" r="2.2" />
      <path d="M6 20v-5a3 3 0 0 1 3-3a3 3 0 0 1 3 3v5" />
      <rect x="14" y="10" width="6" height="6" rx="1" />
      <line x1="4" y1="20" x2="20" y2="4" />
    </Base>
  );
}

export function BrakeFluidIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Base {...props}>
      <BracketShape />
      <path d="M9 14q1.5-1.5 3 0t3 0" />
      <line x1="12" y1="8" x2="12" y2="11.5" />
      <path d="M10.3 10l1.7 2 1.7-2" />
    </Base>
  );
}

export function TransOilTempIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Base {...props}>
      <circle cx="12" cy="12" r="7" />
      <line x1="12" y1="3.5" x2="12" y2="6" />
      <line x1="12" y1="18" x2="12" y2="20.5" />
      <line x1="3.5" y1="12" x2="6" y2="12" />
      <line x1="18" y1="12" x2="20.5" y2="12" />
      <path d="M12 8v6" />
      <circle cx="12" cy="15" r="1.1" fill="currentColor" stroke="none" />
    </Base>
  );
}

export function BootOpenIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Base {...props}>
      <path d="M4 15a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v3a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-3Z" />
      <path d="M6 13l1-4h10l1 4" />
      <circle cx="8" cy="19" r="1" />
      <circle cx="16" cy="19" r="1" />
    </Base>
  );
}

// --- Amber ---------------------------------------------------------------

export function WasherFluidIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Base {...props}>
      <path d="M5 15q7-4 14 0" />
      <path d="M12 8v7" />
      <path d="M9 5.5l1.5 1.5" />
      <path d="M15 5.5l-1.5 1.5" />
      <path d="M12 4v2" />
    </Base>
  );
}

export function EngineIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Base {...props}>
      <rect x="4" y="10" width="14" height="7" rx="1" />
      <rect x="7" y="6" width="5" height="4" rx="0.5" />
      <line x1="18" y1="12" x2="21" y2="12" />
      <line x1="18" y1="15" x2="20" y2="15" />
    </Base>
  );
}

export function FuelPumpIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Base {...props}>
      <rect x="5" y="6" width="8" height="14" rx="1" />
      <line x1="5" y1="11" x2="13" y2="11" />
      <path d="M13 9h3a2 2 0 0 1 2 2v6a1.4 1.4 0 0 1-2.8 0v-4h-2.2" />
    </Base>
  );
}

export function EspIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Base {...props}>
      <path d="M12 4l7 12H5L12 4Z" />
      <line x1="12" y1="10" x2="12" y2="13.5" />
      <circle cx="12" cy="15.8" r="0.5" fill="currentColor" stroke="none" />
      <path d="M6 19a6 6 0 0 1 10-4.5" />
    </Base>
  );
}

export function ServiceIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Base {...props}>
      <circle cx="9" cy="9" r="5" />
      <line x1="9" y1="9" x2="9" y2="6" />
      <line x1="9" y1="9" x2="11" y2="10" />
      <path d="M17 11l3 3-2 2-3-3a2 2 0 1 1 2-2Z" />
      <path d="M14.5 14.5l4.5 4.5" />
    </Base>
  );
}

export function TractionOnIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Base {...props}>
      <path d="M7 9a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2l1 2H6l1-2Z" />
      <line x1="6" y1="11" x2="18" y2="11" />
      <path d="M8 15q1-2 0-4" />
      <path d="M16 15q1-2 0-4" />
    </Base>
  );
}

export function LaneAssistIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Base {...props}>
      <line x1="7" y1="19" x2="10" y2="5" />
      <line x1="17" y1="19" x2="14" y2="5" />
      <line x1="12" y1="6" x2="12" y2="9" />
      <line x1="12" y1="11.5" x2="12" y2="14.5" />
      <line x1="12" y1="17" x2="12" y2="19" />
    </Base>
  );
}

export function LowOilIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Base {...props}>
      <path d="M6 10c0-2.2 2-3.5 5-3.5s5 1.3 5 3.5v4a1.8 1.8 0 0 1-1.8 1.8H7.8A1.8 1.8 0 0 1 6 14v-4Z" />
      <path d="M15 9.5l4-2" />
      <path d="M5 18q1.5-1.5 3 0t3 0t3 0" />
    </Base>
  );
}

export function CruiseControlIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Base {...props}>
      <path d="M4 15a8 8 0 0 1 16 0" />
      <line x1="12" y1="15" x2="15" y2="10.5" />
      <circle cx="12" cy="15" r="1" fill="currentColor" stroke="none" />
    </Base>
  );
}

export function LowCoolantIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Base {...props}>
      <rect x="5" y="7" width="14" height="10" rx="1" />
      <path d="M12 9v5" />
      <path d="M10 12l2 2 2-2" />
      <path d="M7 15.5q1.25-1 2.5 0t2.5 0t2.5 0" />
    </Base>
  );
}

export function TyrePressureIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Base {...props}>
      <path d="M5 14a7 7 0 0 1 14 0" />
      <path d="M7 14a5 5 0 0 1 10 0" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <circle cx="12" cy="14.5" r="0.5" fill="currentColor" stroke="none" />
    </Base>
  );
}

export function WaterInFuelIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Base {...props}>
      <rect x="4" y="9" width="8" height="11" rx="1" />
      <line x1="4" y1="13" x2="12" y2="13" />
      <path d="M16 6a1.6 1.6 0 1 1 0 3a1.6 1.6 0 0 1 0-3Z" />
      <path d="M19.5 8a1.6 1.6 0 1 1 0 3a1.6 1.6 0 0 1 0-3Z" />
    </Base>
  );
}

export function GlowPlugIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Base {...props}>
      <path d="M8 6c-2 1-2 4 0 5c2 1 2 4 0 5" />
      <path d="M14 6c-2 1-2 4 0 5c2 1 2 4 0 5" />
    </Base>
  );
}

export function DpfIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Base {...props}>
      <rect x="3" y="10" width="10" height="4" rx="2" />
      <circle cx="16" cy="9" r="0.6" fill="currentColor" stroke="none" />
      <circle cx="18" cy="11" r="0.6" fill="currentColor" stroke="none" />
      <circle cx="17" cy="14" r="0.6" fill="currentColor" stroke="none" />
      <circle cx="20" cy="13" r="0.6" fill="currentColor" stroke="none" />
    </Base>
  );
}

export function CatalyticIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Base {...props}>
      <rect x="6" y="15" width="12" height="3" rx="1" />
      <path d="M9 12q0.5-1.5 0-3" />
      <path d="M12 12q0.5-1.5 0-3" />
      <path d="M15 12q0.5-1.5 0-3" />
    </Base>
  );
}

export function ChildLockIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Base {...props}>
      <rect x="6" y="4" width="12" height="16" rx="2" />
      <circle cx="12" cy="10" r="2" />
      <path d="M9 17v-2a3 3 0 0 1 6 0v2" />
    </Base>
  );
}

export function AbsIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Base {...props}>
      <circle cx="12" cy="10" r="7" />
      <text
        x="12"
        y="12.6"
        fontSize="6"
        fontWeight={700}
        fontFamily="sans-serif"
        textAnchor="middle"
        fill="currentColor"
        stroke="none"
      >
        ABS
      </text>
      <path d="M7 18h10" />
      <circle cx="12" cy="19.3" r="0.5" fill="currentColor" stroke="none" />
    </Base>
  );
}

export function BulbFailureIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Base {...props}>
      <BracketShape />
      <path d="M9.5 9a2.5 2.5 0 1 1 5 0c0 1.2-1 1.6-1 3h-3c0-1.4-1-1.8-1-3Z" />
      <line x1="10.5" y1="14" x2="13.5" y2="14" />
      <line x1="5" y1="19" x2="19" y2="5" />
    </Base>
  );
}

export function TurtleIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Base {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M8 13a4 3 0 0 1 8 0a4 3 0 0 1-8 0Z" />
      <circle cx="6.5" cy="12" r="1" />
      <line x1="9" y1="16" x2="8" y2="18" />
      <line x1="15" y1="16" x2="16" y2="18" />
    </Base>
  );
}

export function PlugIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Base {...props}>
      <path d="M4 18c-1.5-2 0-4 2-4c2 0 3.5-2 2-4" />
      <rect x="13" y="8" width="6" height="5" rx="1" />
      <line x1="15" y1="6.5" x2="15" y2="8" />
      <line x1="17.5" y1="6.5" x2="17.5" y2="8" />
    </Base>
  );
}

// --- Green / blue --------------------------------------------------------

export function ParkingSensorIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Base {...props}>
      <text
        x="8"
        y="16"
        fontSize="11"
        fontWeight={800}
        fontFamily="sans-serif"
        textAnchor="middle"
        fill="currentColor"
        stroke="none"
      >
        P
      </text>
      <path d="M15 17l3-10" />
      <path d="M17 17l2.5-8.5" />
      <path d="M19 17l2-7" />
    </Base>
  );
}

export function DippedBeamIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Base {...props}>
      <path d="M4 8a4 4 0 0 1 4 4a4 4 0 0 1-4 4V8Z" />
      <line x1="10" y1="10" x2="17" y2="8" />
      <line x1="10" y1="12" x2="18" y2="12" />
      <line x1="10" y1="14" x2="17" y2="16" />
    </Base>
  );
}

export function FogLightIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Base {...props}>
      <rect x="3" y="9" width="6" height="6" rx="3" />
      <path d="M12 10h9" />
      <path d="M12 12.5h9" opacity={0.6} />
      <path d="M12 15h6" opacity={0.3} />
    </Base>
  );
}

export function MainBeamIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Base {...props}>
      <path d="M4 8a4 4 0 0 1 4 4a4 4 0 0 1-4 4V8Z" />
      <line x1="10" y1="9" x2="20" y2="9" />
      <line x1="10" y1="12" x2="20" y2="12" />
      <line x1="10" y1="15" x2="20" y2="15" />
    </Base>
  );
}

export function InteriorLightIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Base {...props}>
      <path d="M8 8a4 4 0 0 1 8 0" />
      <line x1="8" y1="8" x2="16" y2="8" />
      <line x1="12" y1="8" x2="12" y2="11" />
      <line x1="8.5" y1="8.5" x2="7" y2="10.5" />
      <line x1="15.5" y1="8.5" x2="17" y2="10.5" />
    </Base>
  );
}

export function DoubleIndicatorIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Base {...props}>
      <path d="M9 6L4 12l5 6" />
      <path d="M15 6l5 6-5 6" />
    </Base>
  );
}

export function VentilationIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Base {...props}>
      <path d="M4 8q3 2 6 0t6 0t4 1.5" />
      <path d="M4 12.5q3 2 6 0t6 0t4 1.5" />
      <path d="M4 17q3 2 6 0t6 0t4 1.5" />
    </Base>
  );
}

export function WiperIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Base {...props}>
      <path d="M12 19V9" />
      <path d="M12 9l6 8" />
      <path d="M12 9l-6 8" />
      <circle cx="12" cy="19" r="0.6" fill="currentColor" stroke="none" />
    </Base>
  );
}

export function SideLightsIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Base {...props}>
      <path d="M9 9a3 3 0 0 1 3 3a3 3 0 0 1-3 3V9Z" />
      <line x1="4" y1="10" x2="6" y2="10" />
      <line x1="4" y1="14" x2="6" y2="14" />
      <line x1="15" y1="10" x2="17" y2="10" />
      <line x1="15" y1="14" x2="17" y2="14" />
    </Base>
  );
}

export function StopStartIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Base {...props}>
      <path d="M12 4a8 8 0 1 1-6.5 3.3" />
      <path d="M5.5 4v3.5H9" />
      <text
        x="12"
        y="15.5"
        fontSize="6.5"
        fontWeight={800}
        fontFamily="sans-serif"
        textAnchor="middle"
        fill="currentColor"
        stroke="none"
      >
        A
      </text>
    </Base>
  );
}
