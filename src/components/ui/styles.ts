export type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";

const VARIANT_CLASS: Record<ButtonVariant, string> = {
  primary: "bg-primary text-primary-foreground hover:bg-primary-hover",
  secondary:
    "border border-border bg-surface text-foreground hover:border-border-strong",
  danger:
    "border border-critical/25 bg-critical-bg text-critical hover:border-critical/40",
  ghost: "text-muted-foreground hover:text-foreground",
};

/**
 * A className generator, not a component — this codebase mixes
 * <button>, next/link, and plain <a> (for API-route downloads) for
 * what's visually "a button," so one shared style function is more
 * flexible than forcing all three through a single component.
 */
export function buttonStyles(variant: ButtonVariant = "primary", className = "") {
  return `inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors disabled:opacity-50 disabled:pointer-events-none ${VARIANT_CLASS[variant]} ${className}`;
}

export function cardStyles(className = "") {
  return `rounded-xl border border-border bg-surface p-4 shadow-sm ${className}`;
}

export const inputClass =
  "w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15";
