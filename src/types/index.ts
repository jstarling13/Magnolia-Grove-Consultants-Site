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
  /**
   * What we'd pay ASI/ESP for this item at this quantity — already includes
   * ASI's own markup over the raw supplier cost. This, not raw supplier
   * cost, is the base the 5% business surcharge is calculated on. Never
   * shown to the client.
   */
  espPrice: number;
  /** espPrice * (1 + MARKUP_RATE), rounded to cents — what the client sees. */
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
   * Brand shown on the product's own label (Nike, Peter Millar, etc.), used
   * to group the catalog. Unbranded/private-label items use "Essentials".
   */
  brand: string;
}
