/**
 * ============================================================================
 * BUSINESS VERTICAL — SITE CONFIG
 * ============================================================================
 * Mirrors siteConfig.ts, but for the business/corporate audience instead of
 * political campaigns. Same team, same four capabilities, same contact
 * details — reframed for a different kind of client. Kept as a separate
 * file (rather than branching siteConfig.ts) so the political site's copy
 * and this one can evolve independently without risk of cross-contamination.
 * ============================================================================
 */

import { Target, Megaphone, Printer, Globe, MapPin, Phone, Mail } from "lucide-react";
import type { NavLink, ServicePillar, ContactDetail, FooterColumn } from "@/types";

export const businessBrand = {
  name: "Magnolia Grove Consultants",
  shortName: "Magnolia Grove",
  tagline: "Marketing & Growth Execution Built to Deliver | Magnolia Grove",
  logoImage: "/images/logo-magnolia-grove-white.png",
  logoImageAlt: "Magnolia Grove Consultants",
};

export const businessNavLinks: NavLink[] = [
  { label: "Home", href: "/business" },
  { label: "Services / 4 Pillars", href: "/business/pillars" },
  { label: "About", href: "/business/about" },
  { label: "Contact", href: "/business/contact" },
];

export const businessNav = {
  primaryCta: "Schedule a Consultation",
  primaryCtaHref: "/business/contact",
};

export const businessHero = {
  eyebrow: "MARKETING & GROWTH EXECUTION",
  headline: "One Team. Every Part of Your Growth.",
  subtitle:
    "Outreach, digital, print, and web — coordinated under one roof for businesses and organizations who don't have time to manage five different vendors.",
  primaryCta: "Schedule a Consultation",
  primaryCtaHref: "/business/contact",
  secondaryCta: "See Our Capabilities",
  secondaryCtaHref: "/business/pillars",
  proofPoints: ["Outreach", "Digital", "Print", "Web"],
  imageAlt:
    "Classic white marble government columns standing under high-contrast dark twilight, symbolizing institutional strength.",
};

export const businessServicesIntro = {
  eyebrow: "What We Do",
  headline: "Four Pillars. One Team.",
  subtitle: "Outreach, digital, print, and web — run by one team instead of five vendors.",
};

export const businessServicePillars: ServicePillar[] = [
  {
    id: "sales-outreach",
    icon: Target,
    title: "Sales & Outreach Execution",
    description:
      "We identify the right prospects, manage an outreach team to make contact, and track progress every day.",
    subItems: ["Targeted Prospect Lists", "Proven Outreach Scripts", "Daily Progress Reports"],
    image: "/images/pillar-1-field-ops.webp",
    imageAlt: "Tactical map with compass and territory legend",
    pillarSlug: "sales-outreach",
  },
  {
    id: "digital-marketing",
    icon: Megaphone,
    title: "Digital Marketing",
    description:
      "We place ads where your customers are actually watching, produce professional video, and respond fast when the market shifts.",
    subItems: [
      "Streaming & Social Ads",
      "Fast-Turnaround Messaging",
      "Pages Built to Turn Visitors into Customers",
    ],
    image: "/images/pillar-2-media.webp",
    imageAlt: "Cinema camera lens with live data and analytics overlay",
    pillarSlug: "digital-marketing",
  },
  {
    id: "print-collateral",
    icon: Printer,
    title: "Printing & Media Collateral",
    description:
      "We design and print mailers, signage, and marketing materials — personalized where it counts, delivered on time.",
    subItems: ["Personalized Direct Mail", "Trackable QR Codes", "Signage & Banners"],
    image: "/images/pillar-3-print.webp",
    imageAlt: "Offset printing press running a paper feed",
    pillarSlug: "print-collateral",
  },
  {
    id: "web-development",
    icon: Globe,
    title: "Web Development & Digital",
    description:
      "We build fast, mobile-friendly websites with secure payment pages, and connect everything to your contact list automatically.",
    subItems: [
      "Fast-Loading Pages",
      "Secure Online Payments",
      "Automatic Text & Email Follow-Ups",
    ],
    image: "/images/pillar-4-web.webp",
    imageAlt: "Laptop displaying a marketing dashboard",
    pillarSlug: "web-development",
  },
];

export const businessTrustBadgesLabel = "Built For";

export const businessTrustBadges = [
  { id: "small-business", label: "Small & Mid-Size Businesses" },
  { id: "nonprofits", label: "Nonprofits & Associations" },
  { id: "franchises", label: "Franchises & Multi-Location Brands" },
  { id: "enterprise", label: "Enterprise & B2B Organizations" },
];

export const businessAbout = {
  eyebrow: "Why Magnolia Grove",
  headline: "Strategy and Execution, Under One Roof.",
  body: "Magnolia Grove Consultants brings strategy and hands-on execution together under one roof for businesses and organizations — so you're not juggling five vendors when it matters most.",
  bullets: [
    "One Team, Every Channel: A single point of contact for outreach, print, digital, and your website.",
    "Smart Targeting: Budget goes toward the customers most likely to respond, not wasted reach.",
    "Fast Response: When the market shifts, we help you respond within hours, not days.",
  ],
};

export const businessLeadForm = {
  eyebrow: "Get Started",
  headline: "Schedule a Consultation",
  subtitle: "Connect directly with our senior advisors to talk through your goals, timeline, and budget.",
  serviceOptions: businessServicePillars.map((pillar) => pillar.title),
  messagePlaceholder: "Briefly tell us about your business, organization, or project...",
  submitLabel: "Submit Request",
  submittingLabel: "Submitting...",
  successTitle: "Request Received",
  successMessage:
    "Request received. A senior advisor will reach out within 12 hours — everything you share stays confidential.",
  errorMessage:
    "Something went wrong. Please double-check your contact information or reach out directly via ben@magnoliagrovega.com.",
  privacyNote: "Everything you share with us is kept strictly confidential.",
};

export const businessContactDetails: ContactDetail[] = [
  { icon: MapPin, label: "Address", value: "Columbus, GA" },
  { icon: Phone, label: "Phone", value: "(706) 573-1719", href: "tel:+17065731719" },
  {
    icon: Mail,
    label: "Email",
    value: "ben@magnoliagrovega.com",
    href: "mailto:ben@magnoliagrovega.com",
  },
];

export const businessFooter = {
  description:
    "Magnolia Grove Consultants provides outreach, digital, print, and web strategy for businesses, nonprofits, and organizations that need execution, not just advice.",
  legalDisclaimer: "Magnolia Grove Consultants, LLC. All rights reserved.",
  columns: [
    {
      title: "Company",
      links: [
        { label: "About", href: "/business/about" },
        { label: "Services", href: "/business/pillars" },
        { label: "Contact", href: "/business/contact" },
      ],
    },
  ] as FooterColumn[],
  copyrightName: businessBrand.name,
};
