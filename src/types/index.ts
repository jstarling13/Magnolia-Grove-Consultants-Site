import type { LucideIcon } from "lucide-react";

export interface NavLink {
  label: string;
  href: string;
}

export interface ServicePillar {
  id: string;
  icon: LucideIcon;
  title: string;
  description: string;
  subItems: string[];
  image: string;
  imageAlt: string;
  pillarSlug: string;
}

export interface Metric {
  id: string;
  value: number;
  suffix: string;
  prefix: string;
  label: string;
}

export interface SocialLink {
  id: string;
  label: string;
  href: string;
  icon: LucideIcon;
}

export interface ContactDetail {
  icon: LucideIcon;
  label: string;
  value: string;
  href?: string;
}

export interface FooterColumn {
  title: string;
  links: NavLink[];
}

export interface PillarCard {
  index: string;
  title: string;
  description: string;
}

export interface StatItem {
  id: string;
  label: string;
  value?: number;
  prefix?: string;
  suffix?: string;
  raw?: string;
}

export interface CaseStudySpotlight {
  context: string;
  description: string;
  metric: string;
  metricLabel: string;
}

export interface EngagementOption {
  label: string;
  duration: string;
}

export interface PillarFAQItem {
  question: string;
  answer: string;
}

export interface CrossSellItem {
  slug: string;
  blurb: string;
}

export interface Pillar {
  slug: string;
  navLabel: string;
  icon: LucideIcon;
  heroTitle: string;
  heroSubheadline: string;
  heroStat: string;
  image: string;
  imageAlt: string;
  cards: PillarCard[];
  ctaLabel: string;
  ctaHref: string;
  deliverables: string[];
  techStack: string[];
  caseStudy: CaseStudySpotlight;
  engagementScope: EngagementOption[];
  faqs: PillarFAQItem[];
  crossSell: CrossSellItem[];
}

export interface TimelineMilestone {
  year: string;
  title: string;
  description: string;
}

export interface ValueCard {
  icon: LucideIcon;
  title: string;
  description: string;
}

export interface TeamMember {
  name: string;
  role: string;
  bio: string;
  photo?: string;
  photoAlt?: string;
}

export interface CaseStudy {
  id: string;
  district: string;
  pillar: string;
  challenge: string;
  execution: string;
  result: string;
  metric: string;
  metricLabel: string;
  quote: string;
  quoteAttribution: string;
}

export interface MerchPriceTier {
  /** Minimum order quantity this price applies to. */
  quantity: number;
  /** Per-unit price shown to the client at this quantity (markup already applied). */
  price: number;
}

export interface MerchProduct {
  id: string;
  name: string;
  category: string;
  description: string;
  /** Quantity-break pricing, sorted ascending by quantity. At least one tier. */
  priceTiers: MerchPriceTier[];
  image?: string;
  imageAlt?: string;
  /** Full list of color options as named on the supplier's product page. */
  colors?: string[];
  /**
   * Real product photo for a specific color, keyed by the exact string in
   * `colors`. Sourced from ESP+ gradually, one color at a time — a color
   * with no entry here just falls back to `image` when selected, so the
   * catalog never breaks or shows a placeholder while photos are still
   * being sourced.
   */
  colorImages?: Record<string, string>;
  /**
   * Brand shown on the product's own label (Nike, Peter Millar, etc.), used
   * to group the catalog. Unbranded/private-label items use "Essentials".
   */
  brand: string;
  /**
   * Shown under the price on the product page when the one price grid we hold is for a base
   * size and the product comes in several ("Priced for the standard size; other sizes quoted
   * on request."). Set by the catalog importer; omitted for ordinary products.
   */
  priceNote?: string;
  /**
   * Where an uploaded client logo is previewed on this product's photo, as
   * percentages of the image box (top/left = center point, width = logo
   * width as % of image width). Falls back to a per-category default in
   * CATEGORY_IMPRINT_DEFAULTS when omitted — most products don't need a
   * per-item override.
   */
  imprintArea?: ImprintArea;
}

export interface ImprintArea {
  top: number;
  left: number;
  width: number;
  /**
   * True when the supplier photo can't carry a believable logo overlay
   * (lifestyle scene, several products in one shot, sample artwork already
   * printed where a logo would go). The preview then shows a short note
   * instead of a misplaced logo. Set per product in imprintAreas.json.
   */
  hide?: boolean;
}
