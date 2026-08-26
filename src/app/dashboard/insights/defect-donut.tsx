"use client";

import { useState } from "react";

export type DefectSeverity = "critical" | "warning" | "neutral";

interface DefectItem {
  severity: DefectSeverity;
}

const SEVERITY_ORDER: DefectSeverity[] = ["critical", "warning", "neutral"];

const SEVERITY_LABEL: Record<DefectSeverity, string> = {
  critical: "Major / dangerous",
  warning: "Minor",
  neutral: "Advisory",
};

const SEVERITY_STROKE: Record<DefectSeverity, string> = {
  critical: "var(--critical)",
  warning: "var(--warning)",
  neutral: "var(--neutral-badge)",
};

const SEVERITY_TEXT_CLASS: Record<DefectSeverity, string> = {
  critical: "text-critical",
  warning: "text-warning",
  neutral: "text-neutral-badge",
};

/**
 * Composition of the latest MOT's outstanding defects by severity — a
 * genuine parts-of-a-whole question (what share are major vs
 * advisory), not just decoration. The severity breakdown below the
 * ring is always visible, not hover-only, since touch devices can't
 * hover and the count alone isn't enough context to act on.
 */
export function DefectDonut({ items }: { items: DefectItem[] }) {
  const [active, setActive] = useState<DefectSeverity | null>(null);

  const total = items.length;
  if (total === 0) return null;

  const counts: Record<DefectSeverity, number> = {
    critical: 0,
    warning: 0,
    neutral: 0,
  };
  for (const item of items) counts[item.severity] += 1;

  const radius = 30;
  const strokeWidth = 12;
  const circumference = 2 * Math.PI * radius;

  let cumulative = 0;
  const segments = SEVERITY_ORDER.filter((key) => counts[key] > 0).map((key) => {
    const length = (counts[key] / total) * circumference;
    const segment = { key, length, offset: cumulative };
    cumulative += length;
    return segment;
  });

  return (
    <div className="flex items-center gap-4">
      <svg viewBox="0 0 72 72" className="h-16 w-16 shrink-0 -rotate-90">
        <circle
          cx="36"
          cy="36"
          r={radius}
          fill="none"
          stroke="var(--border)"
          strokeWidth={strokeWidth}
        />
        {segments.map((segment) => (
          <circle
            key={segment.key}
            cx="36"
            cy="36"
            r={radius}
            fill="none"
            stroke={SEVERITY_STROKE[segment.key]}
            strokeWidth={strokeWidth}
            strokeDasharray={`${segment.length} ${circumference - segment.length}`}
            strokeDashoffset={-segment.offset}
            className="cursor-pointer transition-opacity"
            opacity={active && active !== segment.key ? 0.35 : 1}
            onMouseEnter={() => setActive(segment.key)}
            onMouseLeave={() => setActive(null)}
            onClick={() =>
              setActive((current) => (current === segment.key ? null : segment.key))
            }
          />
        ))}
        <text
          x="36"
          y="36"
          textAnchor="middle"
          dominantBaseline="central"
          transform="rotate(90 36 36)"
          fontSize="15"
          fontWeight={700}
          fill="var(--foreground)"
        >
          {total}
        </text>
      </svg>

      <ul className="flex flex-1 flex-col gap-1">
        {SEVERITY_ORDER.filter((key) => counts[key] > 0).map((key) => (
          <li
            key={key}
            onMouseEnter={() => setActive(key)}
            onMouseLeave={() => setActive(null)}
            className={`flex items-center justify-between rounded-md px-1.5 py-0.5 text-sm transition-colors ${
              active === key ? "bg-background" : ""
            }`}
          >
            <span className={`font-medium ${SEVERITY_TEXT_CLASS[key]}`}>
              {SEVERITY_LABEL[key]}
            </span>
            <span className="text-muted-foreground">{counts[key]}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
