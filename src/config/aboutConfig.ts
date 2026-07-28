/**
 * ============================================================================
 * ABOUT PAGE — COMPANY STORY, HISTORY, VALUES & LEADERSHIP
 * ============================================================================
 */

import { Compass, ShieldCheck, Zap, Handshake } from "lucide-react";
import type { TimelineMilestone, ValueCard, TeamMember } from "@/types";

export const historySection = {
  eyebrow: "Our Story",
  headline: "Founded to Close the Gap Between Strategy and Execution",
  intro:
    "Magnolia Grove Consultants was founded to solve a common problem: campaigns and organizations were being forced to manage five different vendors for social media, digital, print, and web work, leading to wasted time, mixed messaging, and no cohesive strategy. Ben Garcia started the firm to give clients one unified team instead of five separate vendors — whether they're running a political campaign, a non-profit, or a business.",
  milestones: [
    {
      year: "2024",
      title: "Founding",
      description:
        "Frustrated by the vendor fragmentation that plagued modern campaigns, non-profits, and enterprises, Ben Garcia founded Magnolia Grove Consultants in Columbus, GA. The firm launched with a singular focus: build one complete operation for high-stakes campaigns and organizations, so clients don't have to manage multiple, disconnected vendors.",
    },
    {
      year: "2024",
      title: "First Major Win",
      description:
        "The unified-execution model was quickly validated. In its inaugural year, Magnolia Grove secured its first major victory by managing the entire digital and social media lifecycle for a competitive district race. By consolidating content creation, web development, and digital strategy under one roof, the campaign achieved significant cost savings and a decisive win, proving the power of a fully integrated approach.",
    },
    {
      year: "2025",
      title: "Expanded Capabilities & Enterprise Reach",
      description:
        "Building on its early political success, the firm expanded its capabilities by formalizing its web engineering and print logistics divisions. This evolution solidified the “4 Pillars” framework and attracted non-profit organizations and business clients who recognized the same discipline applied to political campaigns could drive results for their organizations too.",
    },
    {
      year: "2026",
      title: "Today",
      description:
        "Now a trusted partner for political campaigns, non-profit organizations, PACs, and enterprise leaders, Magnolia Grove operates as a premier force across Georgia and beyond. With a reputation for absolute confidentiality and relentless execution, the firm continues to serve a growing roster of clients across sectors who demand a partner, not just a vendor.",
    },
  ] as TimelineMilestone[],
};

export const valuesSection = {
  eyebrow: "What We Stand For",
  headline: "The Principles Behind Every Engagement",
  items: [
    {
      icon: Compass,
      title: "Strategic Clarity",
      description:
        "We believe strategy must drive every tactical decision. Before a single post is published, a single ad is placed, or a single system is deployed, we define the path to victory. Every action is deliberate, data-informed, and designed to serve the overarching mission — whether that mission is electoral, legislative, non-profit advocacy, or commercial.",
    },
    {
      icon: ShieldCheck,
      title: "Absolute Confidentiality",
      description:
        "In the arena of high-stakes campaigns and enterprise initiatives, trust is our most valuable currency. We uphold the highest standards of client confidentiality and data security, ensuring that our clients' strategies, operations, and proprietary information remain protected at all times.",
    },
    {
      icon: Zap,
      title: "Relentless Execution",
      description:
        "Victory is won through flawless execution. We approach every deadline with urgency and every operation with precision. Our teams are built to move fast, adapt on the fly, and deliver results when it matters most — whether in the final 72 hours of a race or the launch window of a major institutional initiative.",
    },
    {
      icon: Handshake,
      title: "Partnership, Not Vendorship",
      description:
        "We reject the transactional nature of typical outside consultants. We embed ourselves in our clients' missions, treating their goals as our own. We are a strategic partner invested in the outcome, not just a vendor fulfilling a contract. Your fight is our fight.",
    },
  ] as ValueCard[],
};

export const teamSection = {
  eyebrow: "Leadership",
  headline: "The Team Behind the Strategy",
  intro:
    "Led by a founder with hands-on experience across high-stakes campaigns and institutional initiatives, Magnolia Grove operates with the rigor of an in-house team and the accountability of a single point of contact.",
  members: [
    {
      name: "Ben Garcia",
      role: "Founder & Principal",
      bio: "Ben Garcia founded Magnolia Grove Consultants in 2024 to solve the fragmentation he witnessed across both the political consulting and enterprise services industries. A veteran of numerous high-stakes campaigns and institutional initiatives, his expertise lies in building operations that get real results — from a campaign headquarters to a boardroom. Under his leadership, the firm has grown into a trusted partner for political campaigns, non-profit organizations, PACs, and businesses who want one team handling everything, done well.",
      photo: "/images/ben-garcia-headshot.jpg",
      photoAlt: "Ben Garcia, Founder & Principal of Magnolia Grove Consultants",
    },
  ] as TeamMember[],
};

export const servicesPricing = {
  eyebrow: "Investment",
  headline: "Our Services at a Glance",
  intro:
    "Magnolia Grove Consultants specializes in digital support for political campaigns and non-profit organizations. We tailor our services around the needs of individual clients. The pricing below is not representative of a full or final list of packages but rather a way to approximate the type of services you will receive for a price range.",
  socialMediaTable: {
    title: "Social Media Content Creation & Management",
    priceRange: "$2,000–$5,000 Monthly",
    rows: ["Posts", "Graphics", "Video Clips", "Photo Posts"],
    tiers: [
      { name: "Base", price: "$2,000/mo.", values: ["8", "3", "3", "2"] },
      { name: "Silver", price: "$3,500/mo.", values: ["15", "5", "5", "5"] },
      { name: "Platinum", price: "$5,000/mo.", values: ["30", "13", "10", "6"] },
    ],
  },
  packages: [
    {
      title: "Social Media Account Setup",
      price: "$2,000",
      priceNote: "One-Time",
      items: [
        "Creation of Facebook, Instagram, and X accounts",
        "Political verification of social media accounts (allows you the option to run ads)",
        "3 graphics",
        "30-minute photoshoot",
      ],
    },
    {
      title: "Website Management",
      price: "$350/mo.",
      items: [
        "Message and notification management",
        "Website updates as required/requested",
        "Web calendar & event management",
      ],
    },
    {
      title: "Website Creation",
      price: "$3,000",
      priceNote: "One-Time",
      items: ["Website revamp/creation (new pictures/updated design)", "45-minute photoshoot"],
    },
    {
      title: "Donation Page Creation",
      price: "$1,000–$2,500",
      priceNote: "One-Time",
      items: ["Generic landing page — $1,000", "Custom donation page — $2,500"],
    },
  ],
};

/**
 * Flattened, fixed-price view of servicesPricing for the /payment page
 * selector. Keep amounts in sync with servicesPricing above if pricing
 * changes. amount is null where there's no single fixed price to prefill.
 */
export const paymentPackageOptions = [
  {
    label: "Social Media Management — Base ($2,000/mo.)",
    amount: 2000,
    memo: "Social Media Management — Base Package",
  },
  {
    label: "Social Media Management — Silver ($3,500/mo.)",
    amount: 3500,
    memo: "Social Media Management — Silver Package",
  },
  {
    label: "Social Media Management — Platinum ($5,000/mo.)",
    amount: 5000,
    memo: "Social Media Management — Platinum Package",
  },
  {
    label: "Social Media Account Setup ($2,000 one-time)",
    amount: 2000,
    memo: "Social Media Account Setup",
  },
  {
    label: "Website Management ($350/mo.)",
    amount: 350,
    memo: "Website Management (Monthly)",
  },
  {
    label: "Website Creation ($3,000 one-time)",
    amount: 3000,
    memo: "Website Creation",
  },
  {
    label: "Donation Page — Generic Landing Page ($1,000 one-time)",
    amount: 1000,
    memo: "Donation Page — Generic Landing Page",
  },
  {
    label: "Donation Page — Custom Donation Page ($2,500 one-time)",
    amount: 2500,
    memo: "Donation Page — Custom Donation Page",
  },
  {
    label: "Other / Custom Invoice",
    amount: null,
    memo: "",
  },
];

export const candidatesSection = {
  eyebrow: "Client Roster",
  headline: "Candidates & Clients We've Worked With",
  note: "Client roster available upon request — ask during your strategy session for references from past campaigns and engagements.",
  clients: [] as string[],
};

export const aboutClosingCta = {
  headline: "Ready to Build a Winning Operation?",
  subtext:
    "Whether you're running a campaign, leading a non-profit, or steering an enterprise initiative, Magnolia Grove provides the institutional framework to win.",
  ctaLabel: "REQUEST A STRATEGY SESSION",
  ctaHref: "/booking",
};
