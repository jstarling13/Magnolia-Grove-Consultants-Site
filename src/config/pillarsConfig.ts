/**
 * ============================================================================
 * 4 PILLARS — HUB + SUB-PAGE CONTENT
 * ============================================================================
 * Dark/gold system content for /pillars and its four sub-pages, plus
 * /case-studies and /booking. Copy is exact per brief — edit here only.
 * ============================================================================
 */

import { Target, Megaphone, Printer, Globe } from "lucide-react";
import type { Pillar, StatItem } from "@/types";

export const pillarsHub = {
  heroTitle: "OUR 4 CORE PILLARS",
  heroSubheadline: "Comprehensive Strategy & Execution for Campaigns & Institutions",
  heroImage: "/images/hero-columns.png",
  heroImageAlt: "Low-angle view of classical stone columns",
  secondaryImage: "/images/hero-aerial-map.png",
  secondaryImageAlt: "Aerial night map of a district with illuminated roads",
};

export const statStrip: StatItem[] = [
  { id: "coverage", value: 100, suffix: "%", label: "Turf Coverage" },
  { id: "load-time", raw: "Sub-Second", label: "Load Times" },
  { id: "analytics", raw: "24/7", label: "Command Analytics" },
  { id: "friction", value: 0, label: "Operational Friction" },
];

export const pillars: Pillar[] = [
  {
    slug: "field-execution",
    navLabel: "Field Execution",
    icon: Target,
    heroTitle: "FIELD EXECUTION & GROUND OPERATIONS",
    heroSubheadline:
      "Data-driven turf strategy, managed deployment, and live field intelligence.",
    image: "/images/pillar-1-field-ops.png",
    imageAlt: "Tactical district map with compass, voter density and turf status legend",
    cards: [
      {
        index: "01",
        title: "Precision Voter Targeting",
        description:
          "We map high-density voter blocks and buyer demographics so every door knocked yields maximum ROI.",
      },
      {
        index: "02",
        title: "High-Conversion Messaging",
        description:
          "Custom outreach messaging engineered to handle objections, build immediate trust, and win undecided voters.",
      },
      {
        index: "03",
        title: "Managed Field Deployment",
        description:
          "Fully managed canvassing operations and ground teams deployed directly to target districts with zero operational friction.",
      },
      {
        index: "04",
        title: "Live Command & Intelligence",
        description:
          "Daily reporting and transparent analytics so campaign leadership can monitor voter contact rates and turf progress live.",
      },
    ],
    ctaLabel: "EXPLORE FIELD STRATEGY",
    ctaHref: "/booking",
  },
  {
    slug: "digital-marketing",
    navLabel: "Digital Marketing",
    icon: Megaphone,
    heroTitle: "DIGITAL MARKETING & MEDIA STRATEGY",
    heroSubheadline:
      "Precision ad targeting, high-impact media production, and rapid-response positioning.",
    image: "/images/pillar-2-media.png",
    imageAlt: "Cinema camera lens with live data and analytics overlay",
    cards: [
      {
        index: "01",
        title: "Geo-Targeted Ad Placement",
        description:
          "Data-driven digital ad placements across Meta, Google, OTT, and connected TV to reach key voter blocks with minimal waste.",
      },
      {
        index: "02",
        title: "High-Impact Media Production",
        description:
          "Cinematic video production, strategic graphic design, and copywriting built to command attention and convey authority.",
      },
      {
        index: "03",
        title: "Rapid-Response & Brand Protection",
        description:
          "Agile message control to counter opponent narratives, manage crisis communications, and dominate the media cycle.",
      },
      {
        index: "04",
        title: "Conversion & Donor Funnels",
        description:
          "Custom digital landing pages and friction-free payment paths designed to turn visitors into active supporters.",
      },
    ],
    ctaLabel: "EXPLORE MEDIA SOLUTIONS",
    ctaHref: "/booking",
  },
  {
    slug: "print-media",
    navLabel: "Print & Logistics",
    icon: Printer,
    heroTitle: "PRINT MEDIA & LOGISTICAL INFRASTRUCTURE",
    heroSubheadline:
      "Precision collateral production, variable-data mail, and rapid physical distribution.",
    image: "/images/pillar-3-print.png",
    imageAlt: "Offset printing press running a paper feed",
    cards: [
      {
        index: "01",
        title: "High-Impact Campaign Collateral",
        description:
          "Turnkey design and bulk production of push cards, walk sheets, event signage, and door hangers.",
      },
      {
        index: "02",
        title: "Variable-Data Targeted Direct Mail",
        description:
          "Micro-targeted direct mail campaigns integrated with voter file data and unique trackable QR codes.",
      },
      {
        index: "03",
        title: "District-Wide Signage & Merchandising",
        description:
          "High-visibility yard signs, large-format banners, and branded apparel deployed at scale across target districts.",
      },
      {
        index: "04",
        title: "Turnkey Logistics & Mail Fulfillment",
        description:
          "Complete postal clearing, inventory routing, and direct delivery management without operational delay.",
      },
    ],
    ctaLabel: "EXPLORE PRINT PACKAGES",
    ctaHref: "/booking",
  },
  {
    slug: "web-development",
    navLabel: "Web & Automation",
    icon: Globe,
    heroTitle: "WEB DEVELOPMENT & DIGITAL AUTOMATION",
    heroSubheadline:
      "High-speed web architecture, frictionless payment funnels, and automated CRM integration.",
    image: "/images/pillar-4-web.png",
    imageAlt: "Laptop displaying campaign strategy code and a donor network dashboard",
    cards: [
      {
        index: "01",
        title: "Modern Campaign Web Architecture",
        description:
          "Custom, mobile-optimized landing pages and web portals engineered for sub-second load speeds and security.",
      },
      {
        index: "02",
        title: "Frictionless Payment & Donation Funnels",
        description:
          "Secure payment processor integration optimized to maximize donor conversion rates and recurring contributions.",
      },
      {
        index: "03",
        title: "Automated Communication Workflows",
        description:
          "Smart SMS routing, multi-tier email drip sequences, and automated follow-ups triggered by user engagement.",
      },
      {
        index: "04",
        title: "Centralized CRM & Data Integration",
        description:
          "Seamless synchronization between web entry points and core databases for real-time supporter list hygiene.",
      },
    ],
    ctaLabel: "EXPLORE DIGITAL SYSTEMS",
    ctaHref: "/booking",
  },
];

export const caseStudiesPage = {
  heroTitle: "TRACK RECORD",
  heroSubheadline: "Verifiable performance metrics and district shifting results across competitive races.",
  heroImage: "/images/hero-aerial-map.png",
  heroImageAlt: "Aerial night map of a district with illuminated roads",
  confidentialityNote:
    "Due to client non-disclosure agreements, specific candidate names and district numbers have been anonymized to protect tactical intelligence.",
  studies: [
    {
      id: "case-1",
      district: "State Senate District — Competitive Suburb",
      pillar: "Field Execution & Ground Operations",
      summary:
        "Deployed targeted door-to-door turf operations alongside daily variable-data mailers to swing undecided voters.",
      metric: "+7.4 pts",
      metricLabel: "Margin Shift",
    },
    {
      id: "case-2",
      district: "Congressional PAC — Multi-County Media Push",
      pillar: "Digital Marketing & Media Strategy",
      summary:
        "Executed a geotargeted OTT streaming and digital ad campaign with integrated high-friction donor landing pages.",
      metric: "3.2x ROI",
      metricLabel: "Donor Conversion",
    },
    {
      id: "case-3",
      district: "Municipal Ballot Initiative — Urban Center",
      pillar: "Web Development & Digital Automation",
      summary:
        "Built a sub-second custom web application with automated Twilio SMS routing and rapid voter registration funnels.",
      metric: "89% Turnout",
      metricLabel: "Targeted Voter Reach",
    },
  ],
  ctaLabel: "REQUEST A STRATEGY SESSION",
  ctaHref: "/booking",
};

export const bookingPage = {
  heroTitle: "STRATEGY SESSION",
  heroSubheadline:
    "Select your project timeline and request a direct intake consultation with our leadership team.",
  heroImage: "/images/hero-columns.png",
  heroImageAlt: "Low-angle view of classical stone columns",
  formIntro:
    "Complete the form below to lock in strategy availability for your upcoming election cycle or corporate push.",
  serviceOptions: pillars.map((pillar) => pillar.heroTitle),
  fields: {
    orgName: "Organization / Campaign Name",
    contactName: "Full Name",
    role: "Title / Role",
    email: "Email Address",
    phone: "Phone Number",
    pillar: "Primary Area of Interest",
    budget: "Estimated Budget Range",
    timeline: "Engagement Timeline",
    message: "Tell Us About Your Race or Initiative",
  },
  budgetOptions: ["Under $10K", "$10K – $25K", "$25K – $50K", "$50K – $100K", "$100K+"],
  timelineOptions: [
    "Immediate (Under 30 Days)",
    "Next Quarter / Primary Cycle",
    "General Election / Long-Term",
  ],
  messagePlaceholder:
    "Outline your district, current polling position, and key strategic objectives for this engagement...",
  submitLabel: "REQUEST STRATEGY SESSION",
  submittingLabel: "SUBMITTING...",
  successTitle: "REQUEST RECEIVED",
  successMessage:
    "Consultation booked. You will receive an invitation with encrypted meeting details shortly.",
  errorMessage:
    "Transmission failed. Please verify your contact information or reach out directly via contact@magnoliagrovega.com.",
  privacyNote:
    "All consultations and project briefs are held under absolute client-advisor confidentiality.",
};
