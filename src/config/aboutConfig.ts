/**
 * ============================================================================
 * ABOUT PAGE — COMPANY STORY, HISTORY, VALUES & LEADERSHIP
 * ============================================================================
 * Placeholder copy is marked with [PLACEHOLDER]. Replace with real content —
 * do not delete a section for lack of data; swap the copy in place instead.
 * ============================================================================
 */

import { Compass, ShieldCheck, Zap, Handshake } from "lucide-react";
import type { TimelineMilestone, ValueCard, TeamMember } from "@/types";

export const historySection = {
  eyebrow: "Our Story",
  headline: "[PLACEHOLDER] Founded to Close the Gap Between Strategy and Execution",
  intro:
    "[PLACEHOLDER] Replace with 2-3 sentences on why Magnolia Grove was founded, the problem in the market it was built to solve, and who founded it. Example angle: frustration with fragmented vendors across field, media, print, and web forcing campaigns to manage five relationships instead of one.",
  milestones: [
    {
      year: "[PLACEHOLDER YEAR]",
      title: "[PLACEHOLDER] Founding",
      description:
        "[PLACEHOLDER] Describe the founding moment — who started the firm, where, and the first engagement or race that proved the model.",
    },
    {
      year: "[PLACEHOLDER YEAR]",
      title: "[PLACEHOLDER] First Major Win",
      description:
        "[PLACEHOLDER] Describe an early flagship win or client that validated the unified-execution approach.",
    },
    {
      year: "[PLACEHOLDER YEAR]",
      title: "[PLACEHOLDER] Expanded Capabilities",
      description:
        "[PLACEHOLDER] Describe when print/web/digital pillars were added, or when the team scaled beyond its original footprint.",
    },
    {
      year: "[PLACEHOLDER YEAR]",
      title: "[PLACEHOLDER] Today",
      description:
        "[PLACEHOLDER] Describe where the firm stands now — geographic reach, race types served, or scale of operations.",
    },
  ] satisfies TimelineMilestone[],
};

export const valuesSection = {
  eyebrow: "What We Stand For",
  headline: "[PLACEHOLDER] The Principles Behind Every Engagement",
  items: [
    {
      icon: Compass,
      title: "[PLACEHOLDER] Strategic Clarity",
      description:
        "[PLACEHOLDER] Replace with the firm's actual point of view on how strategy should drive every tactical decision.",
    },
    {
      icon: ShieldCheck,
      title: "[PLACEHOLDER] Absolute Confidentiality",
      description:
        "[PLACEHOLDER] Replace with the firm's stance on client confidentiality and data handling.",
    },
    {
      icon: Zap,
      title: "[PLACEHOLDER] Relentless Execution",
      description:
        "[PLACEHOLDER] Replace with how the firm approaches speed, deadlines, and operational reliability.",
    },
    {
      icon: Handshake,
      title: "[PLACEHOLDER] Partnership, Not Vendorship",
      description:
        "[PLACEHOLDER] Replace with how the firm positions itself relative to typical outside vendors or consultants.",
    },
  ] satisfies ValueCard[],
};

export const teamSection = {
  eyebrow: "Leadership",
  headline: "[PLACEHOLDER] The Team Behind the Strategy",
  intro:
    "[PLACEHOLDER] One or two sentences introducing the leadership team's collective background (campaigns run, industries served, years of combined experience).",
  members: [
    {
      name: "[PLACEHOLDER NAME]",
      role: "[PLACEHOLDER TITLE]",
      bio: "[PLACEHOLDER] 2-3 sentence bio covering background, notable campaigns or clients, and area of expertise.",
    },
    {
      name: "[PLACEHOLDER NAME]",
      role: "[PLACEHOLDER TITLE]",
      bio: "[PLACEHOLDER] 2-3 sentence bio covering background, notable campaigns or clients, and area of expertise.",
    },
    {
      name: "[PLACEHOLDER NAME]",
      role: "[PLACEHOLDER TITLE]",
      bio: "[PLACEHOLDER] 2-3 sentence bio covering background, notable campaigns or clients, and area of expertise.",
    },
  ] as TeamMember[],
};

export const aboutClosingCta = {
  headline: "[PLACEHOLDER] Ready to Build a Winning Operation?",
  subtext:
    "[PLACEHOLDER] One sentence inviting the visitor to book a strategy session, matching the tone of other CTA sections on the site.",
  ctaLabel: "REQUEST A STRATEGY SESSION",
  ctaHref: "/booking",
};
