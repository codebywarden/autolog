export type AffiliateCategoryId = "insurance" | "tyres" | "parts" | "breakdown";

export interface AffiliateCategory {
  id: AffiliateCategoryId;
  label: string;
  blurb: string;
  href: string;
  // Matched against an MOT defect's text (lowercased) to surface this
  // category next to a relevant advisory — e.g. a tyre-wear advisory
  // suggesting the tyres category. Categories with no keywords
  // (insurance, breakdown) only ever appear in the general list on the
  // Resources page; nothing in a defect's wording implies either one.
  keywords: string[];
}

// Placeholder destinations, not yet real affiliate links — these are
// real, working pages at genuine UK comparison/retail services (not
// dead links), chosen because each one is a plausible actual affiliate
// partner later. Swap `href` for a tagged tracking URL once signed up
// to a program; nothing else about the UI needs to change.
export const AFFILIATE_CATEGORIES: AffiliateCategory[] = [
  {
    id: "tyres",
    label: "Tyres",
    blurb: "Compare prices and book local fitting.",
    href: "https://www.blackcircles.com/",
    keywords: ["tyre", "tire"],
  },
  {
    id: "parts",
    label: "Parts & accessories",
    blurb: "Brakes, batteries, bulbs, and more.",
    href: "https://www.eurocarparts.com/",
    keywords: [
      "brake",
      "disc",
      "pad",
      "battery",
      "bulb",
      "wiper",
      "exhaust",
      "suspension",
      "shock absorber",
      "spring",
      "light",
      "lamp",
      "wing mirror",
      "mirror",
    ],
  },
  {
    id: "insurance",
    label: "Car insurance",
    blurb: "Compare quotes from UK insurers.",
    href: "https://www.moneysupermarket.com/car-insurance/",
    keywords: [],
  },
  {
    id: "breakdown",
    label: "Breakdown cover",
    blurb: "UK-wide roadside assistance.",
    href: "https://www.theaa.com/breakdown-cover/",
    keywords: [],
  },
];

/**
 * First category whose keywords appear in a defect's text, checked in
 * array order — tyres is tried before the broader parts category so a
 * tyre-specific advisory doesn't get swallowed by a generic match.
 */
export function matchAffiliateCategory(
  defectText: string,
): AffiliateCategory | null {
  const lower = defectText.toLowerCase();
  for (const category of AFFILIATE_CATEGORIES) {
    if (category.keywords.some((keyword) => lower.includes(keyword))) {
      return category;
    }
  }
  return null;
}
