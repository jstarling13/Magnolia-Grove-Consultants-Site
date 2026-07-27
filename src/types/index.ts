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

export interface ClientLogo {
  id: string;
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

export interface Pillar {
  slug: string;
  navLabel: string;
  icon: LucideIcon;
  heroTitle: string;
  heroSubheadline: string;
  image: string;
  imageAlt: string;
  cards: PillarCard[];
  ctaLabel: string;
  ctaHref: string;
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
