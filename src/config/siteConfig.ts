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
  eyebrow: "STRATEGY AND EXECUTION FOR CAMPAIGNS & ORGANIZATIONS",
  headline: "Comprehensive Strategy & Execution for High-Stakes Victories.",
  subtitle:
    "We handle canvassing, advertising, printed materials, and your website — all in one place, for campaigns and organizations alike.",
  primaryCta: "Schedule Strategy Call",
  primaryCtaHref: "/booking",
  secondaryCta: "View All Services",
  secondaryCtaHref: "/services",
  proofPoints: [
    "Boots-on-the-Ground Canvassing",
    "Ads That Reach the Right People",
    "Fast, Reliable Websites",
  ],
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
    "One team handling canvassing, media, print, and your website — so nothing falls through the cracks.",
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

export const trustBadgesLabel = "Trusted By";

export const trustBadges = [
  { id: "campaigns", label: "Political Campaigns" },
  { id: "pacs", label: "PACs" },
  { id: "nonprofits", label: "Non-Profits" },
  { id: "enterprise", label: "Enterprise Leaders" },
];

/* ----------------------------------------------------------------------- */
/*  METRICS / SOCIAL PROOF                                                 */
/* ----------------------------------------------------------------------- */

export const metricsIntro = {
  eyebrow: "Track Record",
  headline: "A Track Record You Can Count On",
};

export const metrics: Metric[] = [
  { id: "years", value: 14, suffix: "+", prefix: "", label: "Years Experience" },
  { id: "campaigns", value: 50, suffix: "+", prefix: "", label: "Campaigns Served" },
  { id: "raised", value: 10, suffix: "M+", prefix: "$", label: "Raised for Clients" },
  { id: "execution", value: 100, suffix: "%", prefix: "", label: "Execution Rate" },
];

export const logoStripLabel =
  "Trusted by political candidates, non-profit leaders, and businesses nationwide.";

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
  body: "Magnolia Grove Consultants brings strategy and hands-on execution together under one roof. Whether you're running a political campaign, a PAC, a non-profit, or a business, we handle social media, digital marketing, print, and your website — so you're not juggling five different vendors. When it matters most, we make sure everything works together.",
  bullets: [
    "One Team, Every Channel: A single point of contact for canvassing, print, digital, and your website.",
    "Smart Targeting: We focus your budget on the people most likely to respond — not wasted on the wrong audience.",
    "Fast Response: When something happens in the news, we help you respond quickly and clearly.",
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
    "Magnolia Grove Consultants provides strategy, canvassing, digital media, and website support for political campaigns, PACs, non-profit organizations, and businesses.",
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
  {
    id: "instagram",
    label: "Instagram",
    href: "https://www.instagram.com/magnoliagrovega",
    icon: Instagram,
  },
];
