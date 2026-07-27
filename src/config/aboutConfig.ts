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
    "Magnolia Grove Consultants was founded to solve a critical problem in the high-stakes arena: the fragmentation of campaign and institutional services. Organizations were being forced to manage five different vendors for field, digital, print, and web operations, leading to inefficiency, mixed messaging, and a lack of cohesive strategy. Ben Garcia established the firm to provide a unified command structure — an institutional-grade backbone that delivers total operational dominance across both the political and commercial landscapes.",
  milestones: [
    {
      year: "2024",
      title: "Founding",
      description:
        "Frustrated by the vendor fragmentation that plagued modern campaigns and enterprises, Ben Garcia founded Magnolia Grove Consultants in Columbus, GA. The firm launched with a singular focus: to engineer an end-to-end operational infrastructure for high-stakes environments, eliminating the need for clients to manage multiple, disconnected vendors.",
    },
    {
      year: "2024",
      title: "First Major Win",
      description:
        "The unified-execution model was quickly validated. In its inaugural year, Magnolia Grove secured its first major victory by managing the entire operational lifecycle for a competitive district race. By consolidating field, digital, and print logistics under one roof, the campaign achieved significant cost savings and a decisive win, proving the power of a fully integrated approach.",
    },
    {
      year: "2025",
      title: "Expanded Capabilities & Enterprise Reach",
      description:
        "Building on its early political success, the firm expanded its capabilities by formalizing its internal web engineering and print logistics divisions. This evolution solidified the “4 Pillars” framework and attracted enterprise clients — including PACs, advocacy groups, and business leaders — who recognized the same operational rigor applied to political campaigns could drive results in commercial and institutional initiatives.",
    },
    {
      year: "2026",
      title: "Today",
      description:
        "Now a trusted partner for political campaigns, PACs, and enterprise leaders, Magnolia Grove operates as a premier force across Georgia and beyond. With a reputation for absolute confidentiality and relentless execution, the firm continues to serve a growing roster of clients across sectors who demand a partner, not just a vendor.",
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
        "We believe strategy must drive every tactical decision. Before a single door is knocked, a single ad is placed, or a single system is deployed, we define the path to victory. Every action is deliberate, data-informed, and designed to serve the overarching mission — whether that mission is electoral, legislative, or commercial.",
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
      bio: "Ben Garcia founded Magnolia Grove Consultants in 2024 to solve the fragmentation he witnessed across both the political consulting and enterprise services industries. A veteran of numerous high-stakes campaigns and institutional initiatives, his expertise lies in building institutional-grade operational frameworks that deliver total domain dominance — from the war room to the boardroom. Under his leadership, the firm has grown into a premier force for political campaigns, PACs, and enterprise leaders who demand unified, results-driven execution.",
    },
  ] as TeamMember[],
};

export const aboutClosingCta = {
  headline: "Ready to Build a Winning Operation?",
  subtext:
    "Whether you're running a campaign, leading a PAC, or steering an enterprise initiative, Magnolia Grove provides the institutional framework to win.",
  ctaLabel: "REQUEST A STRATEGY SESSION",
  ctaHref: "/booking",
};
