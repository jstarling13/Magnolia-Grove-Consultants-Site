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
    "Campaigns were being forced to manage five separate vendors for field, digital, print, and web work — wasted time, mixed messaging, no one owning the whole picture. Ben Garcia founded Magnolia Grove to give campaigns one unified team instead.",
  milestones: [
    {
      year: "2024",
      title: "Founding",
      description:
        "Ben Garcia founded Magnolia Grove Consultants in Columbus, GA, with a singular focus: one complete operation for high-stakes campaigns, so clients stop managing disconnected vendors.",
    },
    {
      year: "2024",
      title: "First Major Win",
      description:
        "The unified-execution model was validated fast — Magnolia Grove ran the entire digital and social media lifecycle for a competitive district race, delivering cost savings and a decisive win.",
    },
    {
      year: "2025",
      title: "Expanded Capabilities",
      description:
        "The firm formalized its web engineering and print logistics divisions, solidifying the 4 Pillars framework and extending the same discipline to PACs and advocacy organizations.",
    },
    {
      year: "2026",
      title: "Today",
      description:
        "Magnolia Grove operates as a trusted partner for political campaigns and PACs across Georgia and beyond, with a reputation for absolute confidentiality and relentless execution.",
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
        "Before a single ad is placed or a single door is knocked, we define the path to victory. Every action is deliberate and data-informed, in service of the campaign's mission.",
    },
    {
      icon: ShieldCheck,
      title: "Absolute Confidentiality",
      description:
        "Trust is our most valuable currency. We hold client strategy, operations, and proprietary information to the highest standard of confidentiality and data security, always.",
    },
    {
      icon: Zap,
      title: "Relentless Execution",
      description:
        "Victory is won through flawless execution. Our teams move fast, adapt on the fly, and deliver when it matters most — including the final 72 hours of a race.",
    },
    {
      icon: Handshake,
      title: "Partnership, Not Vendorship",
      description:
        "We embed ourselves in our clients' missions and treat their goals as our own — a strategic partner invested in the outcome, not a vendor filling a contract.",
    },
  ] as ValueCard[],
};

export const teamSection = {
  eyebrow: "Leadership",
  headline: "The Team Behind the Strategy",
  intro:
    "Strategy doesn't get handed off to an account manager. Every engagement is led directly by Magnolia Grove's founder, with one team coordinating execution across every channel.",
  members: [
    {
      name: "Ben Garcia",
      role: "Founder & Principal",
      bio: "Ben Garcia founded Magnolia Grove Consultants in 2024 to solve the vendor fragmentation he saw across political consulting. A veteran of high-stakes campaigns, his focus is building operations that get real results — from the campaign headquarters to election night. Under his leadership, the firm has grown into a trusted partner for political campaigns and PACs who want one team handling everything, done well.",
      photo: "/images/ben-garcia-headshot.jpg",
      photoAlt: "Ben Garcia, Founder & Principal of Magnolia Grove Consultants",
    },
  ] as TeamMember[],
};

/**
 * Fixed-price package options for the /payment page selector. This is the
 * only place pricing is shown publicly — intentionally kept off the About
 * page and out of marketing copy. amount is null where there's no single
 * fixed price to prefill.
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
  subtext: "Magnolia Grove provides the institutional framework to win your race.",
  ctaLabel: "REQUEST A STRATEGY SESSION",
  ctaHref: "/booking",
};
