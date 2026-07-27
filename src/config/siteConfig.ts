/**
 * ============================================================================
 * MAGNOLIA GROVE CONSULTANTS — SITE CONFIG
 * ============================================================================
 * This is the single source of truth for every piece of copy, stat, link,
 * and label rendered on the site. Update the values below — no component
 * code needs to change.
 * ============================================================================
 */

import {
  Target,
  Megaphone,
  Printer,
  Globe,
  MapPin,
  Phone,
  Mail,
  Linkedin,
} from "lucide-react";
import type {
  NavLink,
  ServicePillar,
  Metric,
  ClientLogo,
  SocialLink,
  ContactDetail,
  FooterColumn,
} from "@/types";

/* ----------------------------------------------------------------------- */
/*  BRAND                                                                   */
/* ----------------------------------------------------------------------- */

export const brand = {
  name: "Magnolia Grove Consultants",
  shortName: "Magnolia Grove",
  tagline: "Strategic Campaign Operations & High-Stakes Advisory | Magnolia Grove",
  logoText: "Magnolia Grove",
  logoImage: "/images/logo-magnolia-grove-white.avif",
  logoImageAlt: "Magnolia Grove Consultants",
};

/* ----------------------------------------------------------------------- */
/*  PRIMARY NAVIGATION                                                     */
/* ----------------------------------------------------------------------- */

export const navLinks: NavLink[] = [
  { label: "Services", href: "/services" },
  { label: "4 Pillars", href: "/pillars" },
  { label: "Track Record", href: "/case-studies" },
  { label: "Results", href: "/results" },
  { label: "Contact", href: "/contact" },
];

export const nav = {
  primaryCta: "Schedule Strategy Call",
  primaryCtaHref: "/booking",
};

/* ----------------------------------------------------------------------- */
/*  HERO SECTION                                                           */
/* ----------------------------------------------------------------------- */

export const hero = {
  eyebrow: "DATA-DRIVEN CAMPAIGN & CONSULTING INFRASTRUCTURE",
  headline: "Comprehensive Strategy & Execution for High-Stakes Victories.",
  subtitle:
    "We deliver turnkey field operations, precision media targeting, variable-data print logistics, and high-speed web architecture for campaigns and corporate leaders.",
  primaryCta: "Schedule Strategy Call",
  primaryCtaHref: "/contact",
  secondaryCta: "View All Services",
  secondaryCtaHref: "/services",
  proofPoints: ["Turnkey Field Ops", "Omnichannel Precision", "Sub-Second Web Tech"],
  imageAlt:
    "Classic white marble government columns standing under high-contrast dark twilight, symbolizing institutional strength and political strategy.",
};

/* ----------------------------------------------------------------------- */
/*  CORE SERVICES — 4 PILLARS                                              */
/* ----------------------------------------------------------------------- */

export const servicesIntro = {
  eyebrow: "What We Do",
  headline: "Four Pillars of a Winning Campaign",
  subtitle:
    "One unified infrastructure across field, media, print, and web — engineered for institutional-grade execution.",
};

export const servicePillars: ServicePillar[] = [
  {
    id: "strategy-sales",
    icon: Target,
    title: "Strategy & Sales",
    description:
      "Data-driven voter targeting, managed canvassing deployment, and real-time field command engineered for ground supremacy.",
    subItems: ["Micro-Targeted Turf Maps", "Voss-Style Canvass Scripts", "Daily Contact Analytics"],
    image: "/images/pillar-1-field-ops.webp",
    imageAlt: "Tactical district map with compass, voter density and turf status legend",
  },
  {
    id: "digital-marketing",
    icon: Megaphone,
    title: "Digital Marketing",
    description:
      "Precision digital ad placement, high-production video, and rapid-response positioning across streaming and social channels.",
    subItems: ["OTT & Connected TV Ads", "Rapid-Response Messaging", "High-Donor Conversion Funnels"],
    image: "/images/pillar-2-media.webp",
    imageAlt: "Cinema camera lens with live data and analytics overlay",
  },
  {
    id: "printing-media",
    icon: Printer,
    title: "Printing & Media Collateral",
    description:
      "Bulk collateral production, variable-data direct mail, and district-wide signage delivered on tight operational schedules.",
    subItems: ["Variable-Data Direct Mail", "QR Code Tracking", "District-Wide Yard Signage"],
    image: "/images/pillar-3-print.webp",
    imageAlt: "Offset printing press running a paper feed",
  },
  {
    id: "web-development",
    icon: Globe,
    title: "Web Development & Digital",
    description:
      "High-speed, mobile-optimized web portals, secure payment/donation funnels, and automated CRM pipeline routing.",
    subItems: ["Sub-Second Load Times", "Stripe & Anedot Payment Processing", "Automated SMS & Email Drip Workflows"],
    image: "/images/pillar-4-web.webp",
    imageAlt: "Laptop displaying campaign strategy code and a donor network dashboard",
  },
];

/* ----------------------------------------------------------------------- */
/*  METRICS / SOCIAL PROOF                                                 */
/* ----------------------------------------------------------------------- */

export const metricsIntro = {
  eyebrow: "Track Record",
  headline: "Proven Impact Across High-Stakes Campaign Districts",
};

export const metrics: Metric[] = [
  { id: "years", value: 14, suffix: "+", prefix: "", label: "Years Experience" },
  { id: "campaigns", value: 50, suffix: "+", prefix: "", label: "Campaigns Served" },
  { id: "raised", value: 10, suffix: "M+", prefix: "$", label: "Raised for Clients" },
  { id: "execution", value: 100, suffix: "%", prefix: "", label: "Execution Rate" },
];

export const logoStripLabel =
  "Trusted by political candidates, PAC directors, and enterprise consulting leaders nationwide.";

export const clientLogos: ClientLogo[] = [
  { id: "logo-1", label: "Congressional Victory PAC" },
  { id: "logo-2", label: "Southeastern Leadership Alliance" },
  { id: "logo-3", label: "Civic Ground Strategy Group" },
  { id: "logo-4", label: "Apex Enterprise Advisory" },
  { id: "logo-5", label: "Statewide Policy Institute" },
  { id: "logo-6", label: "National Voter Initiative" },
];

/* ----------------------------------------------------------------------- */
/*  ABOUT / WHY US                                                         */
/* ----------------------------------------------------------------------- */

export const about = {
  eyebrow: "Why Magnolia Grove",
  headline: "Engineered for the War Room. Built for Victory.",
  body: "Magnolia Grove Consultants bridges the gap between high-level political advisory and boots-on-the-ground operational execution. We eliminate vendor fragmentation by providing a unified, institutional-grade infrastructure across field operations, digital media, print logistics, and custom web engineering. When the stakes are non-negotiable, our frameworks ensure total domain dominance.",
  bullets: [
    "Fully Unified Execution: One point of contact across ground, print, digital, and web operations.",
    "Data-Centric Targeting: Zero wasted spend on non-voters or unvetted lead channels.",
    "Agile Rapid-Response: Real-time message control built to command the news cycle instantly.",
  ],
};

/* ----------------------------------------------------------------------- */
/*  LEAD CAPTURE FORM                                                      */
/* ----------------------------------------------------------------------- */

export const leadForm = {
  eyebrow: "Get Started",
  headline: "Schedule a Private Strategy Session",
  subtitle:
    "Connect directly with our senior advisors to discuss district scope, field logistics, and media timelines.",
  serviceOptions: servicePillars.map((pillar) => pillar.title),
  messagePlaceholder: "Briefly outline your campaign district, target race, or consulting objectives...",
  submitLabel: "Submit Request",
  submittingLabel: "Submitting...",
  successTitle: "Request Received",
  successMessage:
    "Strategy request received. A senior advisor will contact you within 12 hours under strict confidentiality.",
  errorMessage:
    "Transmission failed. Please verify your contact information or reach out directly via contact@magnoliagrovega.com.",
  privacyNote: "All inquiries are bound by strict non-disclosure and client confidentiality standards.",
};

/* ----------------------------------------------------------------------- */
/*  CONTACT DETAILS                                                        */
/* ----------------------------------------------------------------------- */

export const contactDetails: ContactDetail[] = [
  {
    icon: MapPin,
    label: "Address",
    value: "Columbus, GA",
  },
  {
    icon: Phone,
    label: "Phone",
    value: "(706) 555-0199",
    href: "tel:+17065550199",
  },
  {
    icon: Mail,
    label: "Email",
    value: "contact@magnoliagrovega.com",
    href: "mailto:contact@magnoliagrovega.com",
  },
];

/* ----------------------------------------------------------------------- */
/*  FOOTER                                                                  */
/* ----------------------------------------------------------------------- */

export const footer = {
  description:
    "Magnolia Grove Consultants provides institutional strategy, field operations, digital media, and web automation for political campaigns, PACs, and enterprise leaders.",
  legalDisclaimer: "Magnolia Grove Consultants, LLC. All rights reserved.",
  columns: [
    {
      title: "Company",
      links: [
        { label: "About", href: "/about" },
        { label: "Services", href: "/services" },
        { label: "Results", href: "/results" },
        { label: "Contact", href: "/contact" },
      ],
    },
    {
      title: "Services",
      links: servicePillars.map((pillar) => ({
        label: pillar.title,
        href: `/services#${pillar.id}`,
      })),
    },
  ] as FooterColumn[],
  copyrightName: brand.name,
};

export const socialLinks: SocialLink[] = [
  { id: "linkedin", label: "LinkedIn", href: "https://www.linkedin.com/company/magnolia-grove-consultants", icon: Linkedin },
];
