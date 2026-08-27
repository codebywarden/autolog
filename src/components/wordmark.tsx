// Text-based placeholder wordmark. The previous logo.png had "AutoLog"
// baked into the artwork itself, not overlaid as separate text, so the
// rebrand to Motor360 couldn't reuse it — this stands in until a
// proper designed mark exists, and every call site only needs a font
// size, not new markup, once one does.
export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`font-extrabold tracking-tight ${className}`}>
      <span className="text-foreground">Motor</span>
      <span className="text-primary">360</span>
    </span>
  );
}
