import Image from "next/image";
import motor360Full from "@/assets/motor360-logo.png";
import motor360Compact from "@/assets/motor360-logo-compact.png";

const VARIANTS = {
  // Icon, wordmark, and tagline — for spacious, low-frequency placements
  // (landing hero, sign-in screen) where the tagline has room to read.
  full: motor360Full,
  // Icon and wordmark only — for tight or repeated placements (header,
  // share page) where a tagline would just be noise at that size.
  compact: motor360Compact,
} as const;

export function Logo({
  variant = "compact",
  className = "",
  priority = false,
}: {
  variant?: keyof typeof VARIANTS;
  className?: string;
  priority?: boolean;
}) {
  return (
    <Image
      src={VARIANTS[variant]}
      alt="Motor360"
      priority={priority}
      className={`w-auto ${className}`}
    />
  );
}
