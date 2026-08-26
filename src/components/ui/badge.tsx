import type { ReactNode } from "react";

export type BadgeTone = "success" | "warning" | "critical" | "neutral";

const TONE_CLASS: Record<BadgeTone, string> = {
  success: "bg-success-bg text-success",
  warning: "bg-warning-bg text-warning",
  critical: "bg-critical-bg text-critical",
  neutral: "bg-neutral-badge-bg text-neutral-badge",
};

export function badgeStyles(tone: BadgeTone, className = "") {
  return `inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${TONE_CLASS[tone]} ${className}`;
}

export function Badge({
  tone,
  children,
  className = "",
}: {
  tone: BadgeTone;
  children: ReactNode;
  className?: string;
}) {
  return <span className={badgeStyles(tone, className)}>{children}</span>;
}
