/**
 * ============================================================================
 * BUSINESS VERTICAL — 4 PILLARS HUB + SUB-PAGE CONTENT
 * ============================================================================
 * Same real methodology as pillarsConfig.ts, reframed for a business
 * audience. No invented metrics or case studies here — deliverables and
 * tech stack reflect capabilities we can actually stand behind on either
 * side of the business; where a tool was political-specific (voter files,
 * NGP VAN, etc.) it's replaced with a plain capability description rather
 * than a made-up brand name.
 * ============================================================================
 */

import { Target, Megaphone, Printer, Globe } from "lucide-react";
import type { Pillar, StatItem } from "@/types";

export const businessPillarsHub = {
  heroTitle: "OUR 4 CORE PILLARS",
  heroSubheadline: "Complete Strategy and Execution for Businesses and Organizations",
  heroImage: "/images/hero-columns.webp",
  heroImageAlt: "Low-angle view of classical stone columns",
};

export const businessStatStrip: StatItem[] = [
  { id: "load-time", raw: "Under 1 Second", label: "Website Load Times" },
  { id: "analytics", raw: "24/7", label: "Real-Time Reporting" },
  { id: "friction", value: 0, label: "Extra Vendors to Manage" },
  { id: "team", raw: "1 Team", label: "Every Channel Coordinated" },
];

export const businessPillars: Pillar[] = [
  {
    slug: "sales-outreach",
    navLabel: "Sales & Outreach",
    icon: Target,
    heroTitle: "SALES & OUTREACH EXECUTION",
    heroSubheadline: "Reaching the right prospects, one conversation at a time.",
    heroStat: "Outreach Team Deployed Within 72 Hours",
    image: "/images/pillar-1-field-ops.webp",
    imageAlt: "Tactical map with compass and territory legend",
    cards: [
      {
        index: "01",
        title: "Finding the Right Prospects",
        description:
          "We use available data to figure out exactly which prospects are worth contacting, so every outreach touch counts.",
      },
      {
        index: "02",
        title: "Mapping Out the Approach",
        description:
          "We map out the most efficient outreach plan, based on where your prospects are and when they're most reachable.",
      },
      {
        index: "03",
        title: "An Outreach Team You Don't Have to Manage",
        description:
          "We recruit, train, and send a trained outreach team to represent you — you don't have to manage a thing.",
      },
      {
        index: "04",
        title: "Daily Progress You Can See",
        description:
          "Every contact attempt is logged and shows up on a live dashboard, so you can see exactly how outreach is going, in real time.",
      },
    ],
    ctaLabel: "SCHEDULE A CONSULTATION",
    ctaHref: "/business/contact",
    deliverables: [
      "Daily Outreach Reports",
      "Custom Talking Points & Answers to Tough Questions",
      "A Fully Managed Outreach Team",
      "Maps Showing Territory Covered",
      "Exportable Contact Lists",
      "Weekly Progress Updates",
    ],
    techStack: [
      "Prospect Data & List Building",
      "Route & Territory Mapping",
      "Custom GPS Tracking",
      "CRM Sync for Every Contact",
    ],
    caseStudy: {
      context: "One Team, Every Channel",
      description:
        "The same field-tested outreach process we've run for competitive races — recruiting, training, and managing a team so you don't have to.",
      metric: "One Team",
      metricLabel: "Coordinating Every Channel",
    },
    engagementScope: [
      { label: "Rapid Deployment", duration: "72 Hours" },
      { label: "Quarterly Push", duration: "30 Days" },
      { label: "Full Season", duration: "90 Days" },
    ],
    faqs: [
      {
        question: "How quickly can an outreach team be deployed?",
        answer: "We can have a trained outreach team ready within 72 hours, fully briefed with talking points and territory maps.",
      },
      {
        question: "How do you verify outreach was actually performed?",
        answer: "Every outreach attempt is logged and time-stamped, so we can confirm what happened and when.",
      },
      {
        question: "Do you provide bilingual or multilingual outreach teams?",
        answer: "Yes — we can staff outreach teams and prepare materials in the languages your customers speak.",
      },
      {
        question: "What geographic radius do you cover?",
        answer: "We work statewide, with faster turnaround across Georgia and neighboring states.",
      },
    ],
    crossSell: [
      { slug: "print-collateral", blurb: "Pair your outreach routes with printed collateral your team can hand out." },
      { slug: "web-development", blurb: "Send the contacts your outreach team collects straight into your contact list." },
    ],
  },
  {
    slug: "digital-marketing",
    navLabel: "Digital Marketing",
    icon: Megaphone,
    heroTitle: "DIGITAL MARKETING & MEDIA STRATEGY",
    heroSubheadline: "Getting your message in front of the right people, fast.",
    heroStat: "Live Ads in Under 6 Hours",
    image: "/images/pillar-2-media.webp",
    imageAlt: "Cinema camera lens with live data and analytics overlay",
    cards: [
      {
        index: "01",
        title: "Finding Your Audience",
        description: "We use available data to figure out exactly who to target, so your budget isn't wasted before an ad even goes live.",
      },
      {
        index: "02",
        title: "Professional Video & Design",
        description: "We produce professional video, graphics, and copy in-house — built to grab attention and build trust.",
      },
      {
        index: "03",
        title: "Ads Everywhere Your Audience Is",
        description: "We place your ads across Facebook, Instagram, Google, and streaming TV, so your message shows up everywhere your audience already spends time.",
      },
      {
        index: "04",
        title: "Fast Adjustments When Things Change",
        description: "We watch how your ads are performing in real time, so we can respond to the market, shift your message, or move budget within hours — not days.",
      },
    ],
    ctaLabel: "SCHEDULE A CONSULTATION",
    ctaHref: "/business/contact",
    deliverables: [
      "Professional Video & Audio Ads",
      "Custom Graphics & Animations",
      "Ad Accounts Set Up on Every Platform You Need",
      "Weekly Performance Reports",
      "A Plan for Handling Bad News Fast",
      "Test Results Showing What's Working",
    ],
    techStack: ["Meta Ads Manager", "Google Ads & YouTube", "Streaming & Smart TV Ads"],
    caseStudy: {
      context: "One Team, Every Channel",
      description:
        "The same location-targeted, real-time-adjusted media strategy we've run for competitive campaigns — built for a business audience instead.",
      metric: "One Team",
      metricLabel: "Coordinating Every Channel",
    },
    engagementScope: [
      { label: "Rapid Response", duration: "48 Hours" },
      { label: "Quarterly Push", duration: "30 Days" },
      { label: "Full Season", duration: "90 Days" },
    ],
    faqs: [
      {
        question: "How do you ensure ad budget isn't wasted?",
        answer: "Every ad is targeted using available data, not broad guesswork — so your budget reaches real, likely customers.",
      },
      {
        question: "What is your turnaround time for a rapid-response ad?",
        answer: "Under 6 hours from an approved script to a live ad.",
      },
      {
        question: "Can you produce content for multiple audience segments?",
        answer: "Yes — we build different versions of your ads tailored to each audience group you're trying to reach.",
      },
      {
        question: "Do you handle compliant ad disclaimers where required?",
        answer: "Yes — any required disclaimers are included and reviewed before an ad goes live.",
      },
    ],
    crossSell: [
      { slug: "web-development", blurb: "Send ad clicks straight to an easy, high-converting landing page." },
      { slug: "sales-outreach", blurb: "Reach the same prospects your outreach team is contacting with matching digital ads." },
    ],
  },
  {
    slug: "print-collateral",
    navLabel: "Print & Logistics",
    icon: Printer,
    heroTitle: "PRINT MEDIA & LOGISTICAL INFRASTRUCTURE",
    heroSubheadline: "Materials people can hold, delivered at scale.",
    heroStat: "Able to Print 250,000+ Pieces a Day",
    image: "/images/pillar-3-print.webp",
    imageAlt: "Offset printing press running a paper feed",
    cards: [
      {
        index: "01",
        title: "Personalized to Every Recipient",
        description: "Every mail piece can be personalized to the person or business it's going to — at full production scale.",
      },
      {
        index: "02",
        title: "Fast, High-Volume Printing",
        description: "Our print lines produce mailers, signage, and marketing materials quickly, without sacrificing quality.",
      },
      {
        index: "03",
        title: "Getting It Into the Mail",
        description: "We handle all the USPS paperwork and sorting so your mail goes out on time and by the book.",
      },
      {
        index: "04",
        title: "Tracking When It Arrives",
        description: "We can tell you exactly when your mail lands in your recipients' mailboxes.",
      },
    ],
    ctaLabel: "SCHEDULE A CONSULTATION",
    ctaHref: "/business/contact",
    deliverables: [
      "Personalized Direct Mail",
      "Handouts & Sales Collateral",
      "Signage & Banners",
      "Branded Merchandise",
      "Postage Handling & Delivery Tracking",
      "Trackable QR Codes on Your Mail",
    ],
    techStack: ["High-Volume Printing Equipment", "USPS Mail Processing", "Delivery Tracking", "Personalized Printing at Scale"],
    caseStudy: {
      context: "One Team, Every Channel",
      description:
        "The same personalized, tracked direct-mail infrastructure we've run for multi-precinct campaigns — applied to business marketing.",
      metric: "One Team",
      metricLabel: "Coordinating Every Channel",
    },
    engagementScope: [
      { label: "Emergency Print Run", duration: "24 Hours" },
      { label: "Standard Turnaround", duration: "48 Hours" },
      { label: "Full Mail Program", duration: "90 Days" },
    ],
    faqs: [
      {
        question: "What is your standard turnaround time on direct mail drops?",
        answer: "48 hours from an approved proof to being handed off to USPS, with 24-hour rush jobs available.",
      },
      {
        question: "Can we track when mailers arrive?",
        answer: "Yes — every mail piece is trackable, so we can tell you when it lands.",
      },
      {
        question: "What is your minimum order volume?",
        answer: "We scale from a single targeted run to high volume, with no minimum order penalty.",
      },
      {
        question: "Do you handle both design and physical production in-house?",
        answer: "Yes. Design, proofing, printing, and mailing are all handled in-house, start to finish.",
      },
    ],
    crossSell: [
      { slug: "sales-outreach", blurb: "Give your outreach team matching printed materials to hand out." },
      { slug: "digital-marketing", blurb: "Follow up with digital ads for anyone who scans a QR code on your mail." },
    ],
  },
  {
    slug: "web-development",
    navLabel: "Web & Automation",
    icon: Globe,
    heroTitle: "WEB DEVELOPMENT & DIGITAL AUTOMATION",
    heroSubheadline: "A fast, reliable website that turns visitors into customers.",
    heroStat: "Loads in Under 1 Second",
    image: "/images/pillar-4-web.webp",
    imageAlt: "Laptop displaying a marketing dashboard",
    cards: [
      {
        index: "01",
        title: "Planning & Security Check",
        description: "Before we write any code, we map out the visitor's experience and check for security gaps.",
      },
      {
        index: "02",
        title: "A Site Built to Convert Visitors",
        description: "We build custom, mobile-friendly pages with one goal: turning visitors into customers.",
      },
      {
        index: "03",
        title: "Connected to Your Contact List & Payments",
        description: "We connect your website directly to your payment processor and contact list, so every signup and sale is captured in one place.",
      },
      {
        index: "04",
        title: "Testing Before We Launch",
        description: "We test the site under heavy traffic and check for security issues before launch, backed by strong protection against attacks.",
      },
    ],
    ctaLabel: "SCHEDULE A CONSULTATION",
    ctaHref: "/business/contact",
    deliverables: [
      "A Custom, Mobile-Friendly Website",
      "A Simple, Secure Payment Page",
      "Automatic Text & Email Follow-Ups",
      "Everything Synced to One Contact List",
      "Accessibility & Security Built In",
      "A Live Dashboard Showing Visitor Activity",
    ],
    techStack: ["Next.js / React", "Tailwind CSS", "Stripe", "Resend", "Cloudflare Turnstile"],
    caseStudy: {
      context: "One Team, Every Channel",
      description:
        "The same fast, secure, automation-connected website build we've delivered for time-critical campaign launches — applied to your business.",
      metric: "One Team",
      metricLabel: "Coordinating Every Channel",
    },
    engagementScope: [
      { label: "Rapid Launch", duration: "2 Weeks" },
      { label: "Full Build", duration: "6 Weeks" },
      { label: "Full System Integration", duration: "90 Days" },
    ],
    faqs: [
      {
        question: "Which payment processors do you support?",
        answer: "Seamless setup with Stripe and other standard merchant processors.",
      },
      {
        question: "Is the website protected against traffic spikes or malicious attacks?",
        answer: "Yes. Every site we build includes strong protection against attacks and traffic spikes.",
      },
      {
        question: "Do you provide ongoing maintenance after launch?",
        answer: "Yes. We offer post-launch monitoring, uptime alerts, and content update support.",
      },
      {
        question: "Can the site integrate with our existing CRM?",
        answer: "In most cases, yes — reach out with what you're running and we'll confirm compatibility.",
      },
    ],
    crossSell: [
      { slug: "digital-marketing", blurb: "Send ad traffic straight to a page built to turn visitors into customers." },
      { slug: "sales-outreach", blurb: "Send new signups from your website straight into your outreach team's lists." },
    ],
  },
];

export const businessContactPage = {
  heroTitle: "GET STARTED",
  heroSubheadline: "Pick your timeline and request a consultation directly with our leadership team.",
  heroImage: "/images/hero-columns.webp",
  heroImageAlt: "Low-angle view of classical stone columns",
};
