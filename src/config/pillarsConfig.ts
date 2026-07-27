/**
 * ============================================================================
 * 4 PILLARS — HUB + SUB-PAGE CONTENT
 * ============================================================================
 * Dark/gold system content for /pillars and its four sub-pages, plus
 * /case-studies and /booking. Copy is exact per brief — edit here only.
 * ============================================================================
 */

import { Target, Megaphone, Printer, Globe } from "lucide-react";
import type { Pillar, StatItem, CaseStudy } from "@/types";

export const pillarsHub = {
  heroTitle: "OUR 4 CORE PILLARS",
  heroSubheadline: "Comprehensive Strategy & Execution for Campaigns & Institutions",
  heroImage: "/images/hero-columns.webp",
  heroImageAlt: "Low-angle view of classical stone columns",
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
    heroSubheadline: "Dominating the turf. Winning the ground war.",
    heroStat: "72-Hour Emergency Deployment",
    image: "/images/pillar-1-field-ops.webp",
    imageAlt: "Tactical district map with compass, voter density and turf status legend",
    cards: [
      {
        index: "01",
        title: "Voter File Micro-Targeting",
        description:
          "We segment the voter file down to the household level, isolating high-value blocks so every door knocked yields maximum ROI.",
      },
      {
        index: "02",
        title: "Turf & Precinct Mapping",
        description:
          "Precinct-level GIS mapping assigns every canvasser a data-optimized route built around density, access, and priority contact windows.",
      },
      {
        index: "03",
        title: "Managed Team Deployment",
        description:
          "Vetted, uniformed canvassing teams are recruited, trained, and deployed directly into target districts with zero operational friction.",
      },
      {
        index: "04",
        title: "Live Command Telemetry",
        description:
          "GPS-verified door-knock data streams into a live command dashboard so leadership can track contact rates in real time.",
      },
    ],
    ctaLabel: "SCHEDULE STRATEGY SESSION",
    ctaHref: "/booking",
    deliverables: [
      "Daily Door-Knock Telemetry Reports",
      "Custom Scripting & Objection Guides",
      "Managed Canvasser Fleet",
      "Precinct Turf Heatmaps",
      "Voter Contact List Exports",
      "Weekly Field Briefings",
    ],
    techStack: ["L2 Voter Data", "TargetSmart", "NGP VAN", "Aristotle", "Custom GPS Dashboards"],
    caseStudy: {
      context: "State Senate District — Competitive Suburb",
      description:
        "Deployed targeted door-to-door turf operations alongside daily variable-data mailers to swing undecided voters in a single-digit race.",
      metric: "+7.4 PTS",
      metricLabel: "Margin Shift",
    },
    engagementScope: [
      { label: "Emergency Turf Deployment", duration: "72 Hours" },
      { label: "Primary Cycle Sprint", duration: "30 Days" },
      { label: "Full Season Flight", duration: "90 Days" },
    ],
    faqs: [
      {
        question: "How quickly can canvassers be deployed to our district?",
        answer:
          "Our managed fleet can mobilize on 72 hours' notice for emergency turf deployment, including scripting and route assignment.",
      },
      {
        question: "How do you verify door knocks were actually performed?",
        answer:
          "Every canvasser is GPS-verified through geo-fencing, with real-time data logs confirming each contact attempt.",
      },
      {
        question: "Do you provide bilingual or multilingual canvassing teams?",
        answer:
          "Yes. Canvasser fleets and scripting can be staffed for target-language precincts on request.",
      },
      {
        question: "What geographic radius do you cover?",
        answer:
          "We deploy statewide, with expedited coverage available for competitive districts across Georgia and neighboring states.",
      },
    ],
    crossSell: [
      { slug: "print-media", blurb: "Pair turf routes with push cards and walk sheets." },
      { slug: "web-development", blurb: "Sync field-collected contacts directly to your CRM." },
    ],
  },
  {
    slug: "digital-marketing",
    navLabel: "Digital Marketing",
    icon: Megaphone,
    heroTitle: "DIGITAL MARKETING & MEDIA STRATEGY",
    heroSubheadline: "Saturating the digital airwaves with surgical precision.",
    heroStat: "Sub-6-Hour Rapid Response",
    image: "/images/pillar-2-media.webp",
    imageAlt: "Cinema camera lens with live data and analytics overlay",
    cards: [
      {
        index: "01",
        title: "Audience Modeling & Micro-Segmentation",
        description:
          "We build precision audience models from voter and consumer data to eliminate wasted spend before a single ad goes live.",
      },
      {
        index: "02",
        title: "High-Impact Media Production",
        description:
          "Cinematic video, motion graphics, and copywriting produced in-house and built to command attention and convey authority.",
      },
      {
        index: "03",
        title: "Multi-Channel Ad Placement",
        description:
          "Coordinated placement across Meta, Google, OTT, and connected TV keeps your message everywhere your audience already is.",
      },
      {
        index: "04",
        title: "Rapid-Response Optimization",
        description:
          "Live performance monitoring and message control let us counter narratives and reallocate spend within hours, not days.",
      },
    ],
    ctaLabel: "SCHEDULE STRATEGY SESSION",
    ctaHref: "/booking",
    deliverables: [
      "HD Video & Audio Ads",
      "Static & Animated Graphic Sets",
      "Multi-Platform Ad Account Setup",
      "Weekly Attribution & Impression Reports",
      "Custom Crisis Response Playbook",
      "Creative A/B Testing Logs",
    ],
    techStack: [
      "Meta Ads Manager",
      "Google Ads & YouTube",
      "OTT / Connected TV",
      "StackAdapt",
      "LiveRamp",
    ],
    caseStudy: {
      context: "Congressional PAC — Multi-County Media Push",
      description:
        "Executed a geotargeted OTT streaming and digital ad campaign with integrated high-conversion donor landing pages.",
      metric: "3.2x ROI",
      metricLabel: "Donor Conversion",
    },
    engagementScope: [
      { label: "Rapid-Response Sprint", duration: "48 Hours" },
      { label: "Primary Cycle Push", duration: "30 Days" },
      { label: "Full Cycle Flight", duration: "90 Days" },
    ],
    faqs: [
      {
        question: "How do you ensure ad budget isn't wasted on non-voters?",
        answer:
          "Every placement uses geo-fencing and IP matching tied directly to verified voter file data, not broad demographic guessing.",
      },
      {
        question: "What is your turnaround time for a rapid-response ad?",
        answer: "Under 6 hours from script approval to live deployment across our ad network.",
      },
      {
        question: "Can you produce content for multiple audience segments?",
        answer:
          "Yes. Our production team builds parallel creative tracks tailored to each distinct audience segment in your model.",
      },
      {
        question: "Do you handle compliant ad disclaimers?",
        answer:
          "Yes. Every placement includes compliant disclosure language reviewed prior to launch.",
      },
    ],
    crossSell: [
      { slug: "web-development", blurb: "Route ad traffic into frictionless donation funnels." },
      { slug: "field-execution", blurb: "Warm turf targets with matching digital ad exposure." },
    ],
  },
  {
    slug: "print-media",
    navLabel: "Print & Logistics",
    icon: Printer,
    heroTitle: "PRINT MEDIA & LOGISTICAL INFRASTRUCTURE",
    heroSubheadline: "Tangible touchpoints. Uncompromising physical scale.",
    heroStat: "250,000+ Units / Day Capacity",
    image: "/images/pillar-3-print.webp",
    imageAlt: "Offset printing press running a paper feed",
    cards: [
      {
        index: "01",
        title: "Variable-Data Voter File Match",
        description:
          "Every mail piece is matched to voter file data, enabling household-level personalization at production scale.",
      },
      {
        index: "02",
        title: "High-Speed Print Production",
        description:
          "Enterprise offset and digital press lines produce collateral, mailers, and signage without sacrificing turnaround time.",
      },
      {
        index: "03",
        title: "Postal Sorting & Clearing",
        description:
          "Full USPS Postal One processing and Intelligent Mail Barcode clearing keep every drop compliant and on schedule.",
      },
      {
        index: "04",
        title: "In-Home Mail Drop Tracking",
        description:
          "Real-time Intelligent Mail Barcode tracking confirms exactly when pieces land in target mailboxes.",
      },
    ],
    ctaLabel: "SCHEDULE STRATEGY SESSION",
    ctaHref: "/booking",
    deliverables: [
      "Micro-Targeted Direct Mailers",
      "Field Push Cards & Walk Sheets",
      "District Yard Signs & Banners",
      "Branded Campaign Apparel",
      "Postage Clearing & Tracking Receipts",
      "Custom QR Analytics Integration",
    ],
    techStack: [
      "Enterprise Offset & Digital Press",
      "USPS Postal One",
      "Intelligent Mail Barcode (IMb)",
      "Variable Data Matrix Engines",
    ],
    caseStudy: {
      context: "County Commission Race — Multi-Precinct Mail Program",
      description:
        "Executed a 12-cycle variable-data direct mail sequence integrated with matching yard sign saturation across target precincts.",
      metric: "+5.1 PTS",
      metricLabel: "Margin Shift via Mail",
    },
    engagementScope: [
      { label: "Emergency Print Run", duration: "24 Hours" },
      { label: "Standard Turnaround", duration: "48 Hours" },
      { label: "Full Mail Program", duration: "90 Days" },
    ],
    faqs: [
      {
        question: "What is your standard turnaround time on direct mail drops?",
        answer:
          "48 hours from proof approval to USPS dock drop, with 24-hour emergency runs available.",
      },
      {
        question: "Can we track when mailers hit voter mailboxes?",
        answer: "Yes, via real-time USPS Intelligent Mail Barcode tracking on every drop.",
      },
      {
        question: "What is your minimum order volume?",
        answer:
          "We scale from targeted single-precinct runs to statewide volume with no minimum order penalty.",
      },
      {
        question: "Do you handle both design and physical production in-house?",
        answer:
          "Yes. Design, proofing, printing, and postal sortation are managed under one unified production line.",
      },
    ],
    crossSell: [
      { slug: "field-execution", blurb: "Arm canvassers with matching walk cards and push cards." },
      { slug: "digital-marketing", blurb: "Retarget QR-code mail respondents with digital ads." },
    ],
  },
  {
    slug: "web-development",
    navLabel: "Web & Automation",
    icon: Globe,
    heroTitle: "WEB DEVELOPMENT & DIGITAL AUTOMATION",
    heroSubheadline: "High-speed digital infrastructure engineered for conversion.",
    heroStat: "<0.8s Load Time · 100/100 Lighthouse",
    image: "/images/pillar-4-web.webp",
    imageAlt: "Laptop displaying campaign strategy code and a donor network dashboard",
    cards: [
      {
        index: "01",
        title: "UX Architecture & Security Audit",
        description:
          "We map your funnel and audit for security gaps before a single line of production code is written.",
      },
      {
        index: "02",
        title: "High-Conversion Funnel Build",
        description:
          "Custom, mobile-optimized pages engineered around a single objective: turning visitors into supporters and donors.",
      },
      {
        index: "03",
        title: "CRM & Payment Gateway Integration",
        description:
          "Direct integration with your donation processor and CRM keeps every entry point synced to a single source of truth.",
      },
      {
        index: "04",
        title: "Stress Testing & Launch",
        description:
          "Load and security testing under simulated traffic spikes before launch, backed by enterprise edge protection.",
      },
    ],
    ctaLabel: "SCHEDULE STRATEGY SESSION",
    ctaHref: "/booking",
    deliverables: [
      "Custom Next.js Mobile-Optimized Website",
      "Frictionless Donation Funnel Integration",
      "Automated SMS & Email Drip Workflows",
      "Centralized CRM Data Pipeline",
      "Web Accessibility & Security Defense Package",
      "Real-Time Analytics Dashboard",
    ],
    techStack: [
      "Next.js / React",
      "Tailwind CSS",
      "Stripe / Anedot",
      "Resend",
      "Cloudflare Turnstile",
      "HubSpot / NGP VAN API",
    ],
    caseStudy: {
      context: "Municipal Ballot Initiative — Urban Center",
      description:
        "Built a sub-second custom web application with automated SMS routing and rapid voter registration funnels.",
      metric: "89% Turnout",
      metricLabel: "Targeted Voter Reach",
    },
    engagementScope: [
      { label: "Rapid Launch", duration: "2 Weeks" },
      { label: "Full Build", duration: "6 Weeks" },
      { label: "Enterprise Integration", duration: "90 Days" },
    ],
    faqs: [
      {
        question: "Which donation processors do you support?",
        answer:
          "Seamless integration with Anedot, WinRed, ActBlue, Stripe, and custom merchant accounts.",
      },
      {
        question: "Is the website protected against traffic spikes or malicious attacks?",
        answer:
          "Yes. Every build is protected by enterprise Cloudflare edge security and DDoS mitigation.",
      },
      {
        question: "Do you provide ongoing maintenance after launch?",
        answer: "Yes. We offer post-launch monitoring, uptime alerts, and content update support.",
      },
      {
        question: "Can the site integrate with our existing voter file or CRM?",
        answer:
          "Yes. We build custom API integrations with NGP VAN, HubSpot, and most standard CRM and voter file platforms.",
      },
    ],
    crossSell: [
      {
        slug: "digital-marketing",
        blurb: "Send paid traffic straight into a built-to-convert landing page.",
      },
      {
        slug: "field-execution",
        blurb: "Sync web-collected leads directly into field canvassing lists.",
      },
    ],
  },
];

export const caseStudiesPage = {
  heroTitle: "TRACK RECORD",
  heroSubheadline:
    "Verifiable performance metrics and district shifting results across competitive races.",
  heroImage: "/images/hero-aerial-map.webp",
  heroImageAlt: "Aerial night map of a district with illuminated roads",
  confidentialityNote:
    "Due to client non-disclosure agreements, specific candidate names and district numbers have been anonymized to protect tactical intelligence. All metric data anonymized to preserve client confidentiality.",
  studies: [
    {
      id: "case-1",
      district: "State Senate District — High-Growth Suburb",
      pillar: "Field Execution & Ground Operations",
      challenge:
        "Trailing by 4.2 points 30 days out, with fragmented, inconsistent voter outreach across the district.",
      execution:
        "Micro-targeted 14,000 undecided households via managed door-to-door canvassing, paired with a daily variable-data mail sequence.",
      result:
        "Turnout in target precincts outpaced the district average by double digits, delivering a decisive swing on election night.",
      metric: "+7.4 PTS",
      metricLabel: "Margin Shift",
      quote: "Magnolia Grove delivered total domain dominance when our ground war was on the line.",
      quoteAttribution: "— Campaign Manager, State Senate Race",
    },
    {
      id: "case-2",
      district: "Congressional PAC — Multi-County Media Push",
      pillar: "Digital Marketing & Media Strategy",
      challenge:
        "Fragmented ad spend across multiple counties was producing low-quality donor leads and inconsistent messaging.",
      execution:
        "Executed a geotargeted OTT streaming and digital ad campaign integrated with high-conversion donor landing pages across the full media mix.",
      result:
        "Donor conversion rates nearly tripled within the first flight cycle, extending the PAC's fundraising runway heading into the final stretch.",
      metric: "3.2x ROI",
      metricLabel: "Donor Conversion",
      quote:
        "Their media buy was more disciplined than agencies twice their size — every dollar had a job.",
      quoteAttribution: "— PAC Director, Multi-County Media Program",
    },
    {
      id: "case-3",
      district: "Municipal Ballot Initiative — Urban Center",
      pillar: "Web Development & Digital Automation",
      challenge:
        "An outdated web presence was losing registration traffic and donor conversions to slow load times and a broken mobile funnel.",
      execution:
        "Built a sub-second custom web application with automated SMS routing and rapid voter registration funnels engineered for mobile-first turnout.",
      result:
        "Targeted voter reach hit turnout levels rarely seen in municipal ballot initiatives, validating the platform rebuild under a hard election-day deadline.",
      metric: "89% Turnout",
      metricLabel: "Targeted Voter Reach",
      quote:
        "We went from an embarrassing website to our single best organizing tool in six weeks.",
      quoteAttribution: "— Campaign Digital Director, Municipal Initiative",
    },
    {
      id: "case-4",
      district: "County Commission Race — Multi-Precinct Mail Program",
      pillar: "Print Media & Logistical Infrastructure",
      challenge:
        "A late entry into a crowded county commission race left no time for a traditional field program to build name ID.",
      execution:
        "Executed a 12-cycle variable-data direct mail sequence integrated with matching yard sign saturation across target precincts.",
      result:
        "Name recognition and favorability climbed steadily through each mail cycle, culminating in a margin shift that outpaced every internal poll.",
      metric: "+5.1 PTS",
      metricLabel: "Margin Shift via Mail",
      quote: "Our mail program did more to move the numbers than anything else on the ballot.",
      quoteAttribution: "— County Commission Candidate",
    },
  ] as CaseStudy[],
  ctaLabel: "REQUEST A STRATEGY SESSION",
  ctaHref: "/booking",
};

export const bookingPage = {
  heroTitle: "STRATEGY SESSION",
  heroSubheadline:
    "Select your project timeline and request a direct intake consultation with our leadership team.",
  heroImage: "/images/hero-columns.webp",
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
    "Transmission failed. Please verify your contact information or reach out directly via ben@magnoliagrovega.com.",
  privacyNote:
    "All consultations and project briefs are held under absolute client-advisor confidentiality.",
  whatHappensNext: {
    eyebrow: "What Happens Next",
    steps: [
      {
        step: "01",
        title: "Immediate NDA & Intel Audit",
        detail:
          "Within 2 hours of submission, our team issues an NDA and begins an initial audit of your race or initiative.",
      },
      {
        step: "02",
        title: "Direct Advisory Call",
        detail:
          "A 30-minute strategy call with senior leadership — not a sales rep — to scope your objectives and timeline.",
      },
      {
        step: "03",
        title: "Custom Execution Deck",
        detail:
          "A tailored district execution deck and proposal delivered directly, outlining scope, timeline, and investment.",
      },
    ],
  },
};
