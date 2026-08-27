import { matchAffiliateCategory } from "@/lib/affiliate-links";

// Purely presentational and server-renderable — no client interactivity
// needed for a link. Renders nothing when a defect's wording doesn't
// match any category, so call sites can drop this in unconditionally.
export function AffiliateSuggestion({ defectText }: { defectText: string }) {
  const category = matchAffiliateCategory(defectText);
  if (!category) return null;

  return (
    <a
      href={category.href}
      target="_blank"
      rel="noopener noreferrer sponsored"
      className="text-xs font-medium text-primary underline underline-offset-2 hover:text-primary-hover"
    >
      Find {category.label.toLowerCase()} ↗
    </a>
  );
}
