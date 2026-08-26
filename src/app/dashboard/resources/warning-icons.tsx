import type { ReactNode, SVGProps } from "react";

// Simple line-icon renditions of the standardised (ISO 2575) dashboard
// telltale shapes — the same pictogram appears on every manufacturer's
// dashboard, so these represent the universal symbol, not any one
// brand's specific artwork.
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

export function OilCanIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Base {...props}>
      <path d="M6 11c0-2.5 2-4 5-4s5 1.5 5 4v6a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2v-6Z" />
      <path d="M16 10l4-2" />
      <path d="M9 7V5" />
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

export function BrakeIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Base {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M9 8c-1 1.2-1 6.8 0 8" />
      <path d="M15 8c1 1.2 1 6.8 0 8" />
      <line x1="12" y1="9" x2="12" y2="14" />
      <circle cx="12" cy="16.3" r="0.5" fill="currentColor" />
    </Base>
  );
}

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
      <circle cx="12" cy="19.3" r="0.5" fill="currentColor" />
    </Base>
  );
}

export function TyrePressureIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Base {...props}>
      <path d="M5 14a7 7 0 0 1 14 0" />
      <path d="M7 14a5 5 0 0 1 10 0" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <circle cx="12" cy="14.5" r="0.5" fill="currentColor" />
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

export function AirbagIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Base {...props}>
      <circle cx="9" cy="7" r="2.2" />
      <path d="M6 20v-5a3 3 0 0 1 3-3a3 3 0 0 1 3 3v5" />
      <rect x="14" y="10" width="6" height="6" rx="1" />
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

export function IndicatorIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Base {...props}>
      <path d="M13 5l-7 7 7 7" />
      <path d="M19 5l-7 7 7 7" opacity={0.4} />
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

export function CruiseControlIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Base {...props}>
      <path d="M4 15a8 8 0 0 1 16 0" />
      <line x1="12" y1="15" x2="15" y2="10.5" />
      <circle cx="12" cy="15" r="1" fill="currentColor" stroke="none" />
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
