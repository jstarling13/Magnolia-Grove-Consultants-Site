/**
 * ============================================================================
 * MAGNOLIA GROVE CONSULTANTS — SITE CONFIG
 * ============================================================================
 * This is the single source of truth for every piece of copy, stat, link,
 * and label rendered on the site. Update the values below — no component
 * code needs to change.
 * ============================================================================
 */

import { Target, Megaphone, Printer, Globe, MapPin, Phone, Mail, Instagram } from "lucide-react";
import type {
  NavLink,
  ServicePillar,
  Metric,
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
  tagline: "Political Campaign Consulting Built to Execute | Magnolia Grove",
  logoText: "Magnolia Grove",
  logoImage: "/images/logo-magnolia-grove-white.png",
  logoImageAlt: "Magnolia Grove Consultants",
};

/* ----------------------------------------------------------------------- */
/*  PRIMARY NAVIGATION                                                     */
/* ----------------------------------------------------------------------- */

export const navLinks: NavLink[] = [
  { label: "Home", href: "/" },
  { label: "Services / 4 Pillars", href: "/pillars" },
  { label: "About", href: "/about" },
  { label: "Results / Track Record", href: "/case-studies" },
  { label: "Contact / Booking", href: "/booking" },
];

export const nav = {
  primaryCta: "Schedule Strategy Call",
  primaryCtaHref: "/booking",
};

/* ----------------------------------------------------------------------- */
/*  HERO SECTION                                                           */
/* ----------------------------------------------------------------------- */

export const hero = {
  eyebrow: "CAMPAIGN STRATEGY & EXECUTION",
  headline: "One Team. Every Part of the Campaign.",
  subtitle:
    "Field, digital, print, and web — coordinated under one roof for campaigns and political organizations who can't afford a dropped ball.",
  primaryCta: "Request a Strategy Session",
  primaryCtaHref: "/booking",
  secondaryCta: "See Our Track Record",
  secondaryCtaHref: "/case-studies",
  proofPoints: ["Field", "Digital", "Print", "Web"],
  imageAlt:
    "Classic white marble government columns standing under high-contrast dark twilight, symbolizing institutional strength and political strategy.",
};

/* ----------------------------------------------------------------------- */
/*  CORE SERVICES — 4 PILLARS                                              */
/* ----------------------------------------------------------------------- */

export const servicesIntro = {
  eyebrow: "What We Do",
  headline: "Four Pillars. One Team.",
  subtitle: "Field, digital, print, and web — run by one team instead of five vendors.",
};

export const servicePillars: ServicePillar[] = [
  {
    id: "strategy-sales",
    icon: Target,
    title: "Strategy & Sales",
    description:
      "We identify the right voters, manage a canvassing team to knock on doors, and track progress every day.",
    subItems: [
      "Targeted Door-Knocking Routes",
      "Proven Conversation Scripts",
      "Daily Progress Reports",
    ],
    image: "/images/pillar-1-field-ops.webp",
    imageAlt: "Tactical district map with compass, voter density and turf status legend",
    pillarSlug: "field-execution",
  },
  {
    id: "digital-marketing",
    icon: Megaphone,
    title: "Digital Marketing",
    description:
      "We place ads where your audience is actually watching, produce professional video, and respond fast when the conversation shifts.",
    subItems: [
      "Streaming & TV Ads",
      "Fast-Turnaround Messaging",
      "Pages Built to Turn Visitors into Donors",
    ],
    image: "/images/pillar-2-media.webp",
    imageAlt: "Cinema camera lens with live data and analytics overlay",
    pillarSlug: "digital-marketing",
  },
  {
    id: "printing-media",
    icon: Printer,
    title: "Printing & Media Collateral",
    description:
      "We design and print mailers, yard signs, and campaign materials — personalized where it counts, delivered on time.",
    subItems: ["Personalized Direct Mail", "Trackable QR Codes", "Yard Signs & Banners"],
    image: "/images/pillar-3-print.webp",
    imageAlt: "Offset printing press running a paper feed",
    pillarSlug: "print-media",
  },
  {
    id: "web-development",
    icon: Globe,
    title: "Web Development & Digital",
    description:
      "We build fast, mobile-friendly websites with secure donation pages, and connect everything to your contact list automatically.",
    subItems: [
      "Fast-Loading Pages",
      "Secure Online Donations",
      "Automatic Text & Email Follow-Ups",
    ],
    image: "/images/pillar-4-web.webp",
    imageAlt: "Laptop displaying campaign strategy code and a donor network dashboard",
    pillarSlug: "web-development",
  },
];

/* ----------------------------------------------------------------------- */
/*  TRUST BADGES                                                           */
/* ----------------------------------------------------------------------- */

export const trustBadgesLabel = "Built For";

export const trustBadges = [
  { id: "campaigns", label: "Campaigns & Candidates" },
  { id: "pacs", label: "PACs & Political Organizations" },
  { id: "nonprofits", label: "Advocacy & Nonprofits" },
  { id: "enterprise", label: "Organizations & Enterprise" },
];

/* ----------------------------------------------------------------------- */
/*  METRICS / SOCIAL PROOF                                                 */
/* ----------------------------------------------------------------------- */

export const metrics: Metric[] = [
  { id: "years", value: 14, suffix: "+", prefix: "", label: "Years Experience" },
  { id: "campaigns", value: 5, suffix: "+", prefix: "", label: "Campaigns Served" },
  { id: "raised", value: 500, suffix: "K+", prefix: "$", label: "Raised for Clients" },
  { id: "execution", value: 100, suffix: "%", prefix: "", label: "Execution Rate" },
];

/* ----------------------------------------------------------------------- */
/*  ABOUT / WHY US                                                         */
/* ----------------------------------------------------------------------- */

export const about = {
  eyebrow: "Why Magnolia Grove",
  headline: "Engineered for the War Room. Built for Victory.",
  body: "Magnolia Grove Consultants brings strategy and hands-on execution together under one roof for campaigns, PACs, and political organizations — so you're not juggling five vendors when it matters most.",
  bullets: [
    "One Team, Every Channel: A single point of contact for field, print, digital, and your website.",
    "Smart Targeting: Budget goes toward the voters most likely to respond, not wasted reach.",
    "Fast Response: When the news cycle turns, we help you respond within hours, not days.",
  ],
};

/* ----------------------------------------------------------------------- */
/*  LEAD CAPTURE FORM                                                      */
/* ----------------------------------------------------------------------- */

export const leadForm = {
  eyebrow: "Get Started",
  headline: "Schedule a Private Strategy Session",
  subtitle:
    "Connect directly with our senior advisors to talk through your goals, timeline, and budget.",
  serviceOptions: servicePillars.map((pillar) => pillar.title),
  messagePlaceholder: "Briefly tell us about your campaign, race, or project...",
  submitLabel: "Submit Request",
  submittingLabel: "Submitting...",
  successTitle: "Request Received",
  successMessage:
    "Request received. A senior advisor will reach out within 12 hours — everything you share stays confidential.",
  errorMessage:
    "Something went wrong. Please double-check your contact information or reach out directly via ben@magnoliagrovega.com.",
  privacyNote: "Everything you share with us is kept strictly confidential.",
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
    value: "(706) 573-1719",
    href: "tel:+17065731719",
  },
  {
    icon: Mail,
    label: "Email",
    value: "ben@magnoliagrovega.com",
    href: "mailto:ben@magnoliagrovega.com",
  },
];

/* ----------------------------------------------------------------------- */
/*  FOOTER                                                                  */
/* ----------------------------------------------------------------------- */

export const footer = {
  description:
    "Magnolia Grove Consultants provides field, digital, print, and web strategy for political campaigns and PACs — with capacity for advocacy organizations and enterprise clients.",
  legalDisclaimer: "Magnolia Grove Consultants, LLC. All rights reserved.",
  columns: [
    {
      title: "Company",
      links: [
        { label: "About", href: "/about" },
        { label: "Services", href: "/services" },
        { label: "Track Record", href: "/case-studies" },
        { label: "Contact", href: "/contact" },
        { label: "Pay an Invoice", href: "/payment" },
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
  {
    id: "instagram",
    label: "Instagram",
    href: "https://www.instagram.com/magnoliagrovega",
    icon: Instagram,
  },
];
