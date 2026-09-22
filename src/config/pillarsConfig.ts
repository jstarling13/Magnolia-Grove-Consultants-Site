/**
 * ============================================================================
 * 4 PILLARS — HUB + SUB-PAGE CONTENT
 * ============================================================================
 * Dark/gold system content for /pillars and its four sub-pages, plus
 * /case-studies and /booking. Written in plain English — avoid re-adding
 * industry jargon or acronyms a first-time visitor wouldn't recognize.
 * ============================================================================
 */

import { Target, Megaphone, Printer, Globe } from "lucide-react";
import type { Pillar, StatItem, CaseStudy } from "@/types";

export const pillarsHub = {
  heroTitle: "OUR 4 CORE PILLARS",
  heroSubheadline: "Complete Strategy and Execution for Campaigns and Organizations",
  heroImage: "/images/hero-columns.webp",
  heroImageAlt: "Low-angle view of classical stone columns",
};

export const statStrip: StatItem[] = [
  { id: "coverage", value: 100, suffix: "%", label: "Voter Coverage" },
  { id: "load-time", raw: "Under 1 Second", label: "Website Load Times" },
  { id: "analytics", raw: "24/7", label: "Real-Time Reporting" },
  { id: "friction", value: 0, label: "Extra Vendors to Manage" },
];

export const pillars: Pillar[] = [
  {
    slug: "field-execution",
    navLabel: "Field Execution",
    icon: Target,
    heroTitle: "FIELD EXECUTION & GROUND OPERATIONS",
    heroSubheadline: "Reaching voters where they live, one door at a time.",
    heroStat: "Canvassers on the Ground Within 72 Hours",
    image: "/images/pillar-1-field-ops.webp",
    imageAlt: "Tactical district map with compass, voter density and turf status legend",
    cards: [
      {
        index: "01",
        title: "Finding the Right Voters",
        description:
          "We use voter data to figure out exactly which households are worth visiting, so every door we knock on counts.",
      },
      {
        index: "02",
        title: "Mapping Out Routes",
        description:
          "We map out the most efficient route for each canvasser, based on where voters live and when they're most likely to be home.",
      },
      {
        index: "03",
        title: "A Canvassing Team You Don't Have to Manage",
        description:
          "We recruit, train, and send a background-checked, uniformed canvassing team straight to your district — you don't have to manage a thing.",
      },
      {
        index: "04",
        title: "Daily Progress You Can See",
        description:
          "Every door knock is GPS-verified and shows up on a live dashboard, so you can see exactly how outreach is going, in real time.",
      },
    ],
    ctaLabel: "SCHEDULE STRATEGY SESSION",
    ctaHref: "/booking",
    deliverables: [
      "Daily Door-Knock Reports",
      "Custom Talking Points & Answers to Tough Questions",
      "A Fully Managed Canvassing Team",
      "Maps Showing Where We've Knocked",
      "Exportable Voter Contact Lists",
      "Weekly Progress Updates",
    ],
    techStack: ["L2 Voter Data", "TargetSmart", "NGP VAN", "Aristotle", "Custom GPS Tracking"],
    caseStudy: {
      context: "State Senate District — Competitive Suburb",
      description:
        "Ran targeted door-to-door canvassing alongside daily personalized mailers to win over undecided voters in a close race.",
      metric: "+7.4 PTS",
      metricLabel: "Margin Shift",
    },
    engagementScope: [
      { label: "Emergency Canvassing", duration: "72 Hours" },
      { label: "Primary Season Push", duration: "30 Days" },
      { label: "Full Campaign Season", duration: "90 Days" },
    ],
    faqs: [
      {
        question: "How quickly can canvassers be deployed to our district?",
        answer:
          "We can have a canvassing team in your district within 72 hours, fully briefed with talking points and routes.",
      },
      {
        question: "How do you verify door knocks were actually performed?",
        answer:
          "Every canvasser's location is GPS-tracked, so we can confirm each door was actually knocked on.",
      },
      {
        question: "Do you provide bilingual or multilingual canvassing teams?",
        answer:
          "Yes — we can staff canvassing teams and prepare materials in the languages your voters speak.",
      },
      {
        question: "What geographic radius do you cover?",
        answer:
          "We work statewide, with faster turnaround for competitive districts across Georgia and neighboring states.",
      },
    ],
    crossSell: [
      {
        slug: "print-media",
        blurb: "Pair your canvassing routes with push cards and walk sheets.",
      },
      {
        slug: "web-development",
        blurb: "Send the contacts your canvassers collect straight into your contact list.",
      },
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
        description:
          "We use voter and consumer data to figure out exactly who to target, so your budget isn't wasted before an ad even goes live.",
      },
      {
        index: "02",
        title: "Professional Video & Design",
        description:
          "We produce professional video, graphics, and copy in-house — built to grab attention and build trust.",
      },
      {
        index: "03",
        title: "Ads Everywhere Your Audience Is",
        description:
          "We place your ads across Facebook, Instagram, Google, and streaming TV, so your message shows up everywhere your audience already spends time.",
      },
      {
        index: "04",
        title: "Fast Adjustments When Things Change",
        description:
          "We watch how your ads are performing in real time, so we can respond to the news, shift your message, or move budget within hours — not days.",
      },
    ],
    ctaLabel: "SCHEDULE STRATEGY SESSION",
    ctaHref: "/booking",
    deliverables: [
      "Professional Video & Audio Ads",
      "Custom Graphics & Animations",
      "Ad Accounts Set Up on Every Platform You Need",
      "Weekly Performance Reports",
      "A Plan for Handling Bad News Fast",
      "Test Results Showing What's Working",
    ],
    techStack: [
      "Meta Ads Manager",
      "Google Ads & YouTube",
      "Streaming & Smart TV Ads",
      "StackAdapt",
      "LiveRamp",
    ],
    caseStudy: {
      context: "Congressional PAC — Multi-County Media Push",
      description:
        "Ran a location-targeted streaming and digital ad campaign paired with donor pages built to turn visitors into givers.",
      metric: "3.2x ROI",
      metricLabel: "Donor Conversion",
    },
    engagementScope: [
      { label: "Rapid Response", duration: "48 Hours" },
      { label: "Primary Season Push", duration: "30 Days" },
      { label: "Full Campaign Season", duration: "90 Days" },
    ],
    faqs: [
      {
        question: "How do you ensure ad budget isn't wasted on non-voters?",
        answer:
          "Every ad is targeted using verified voter data, not broad guesswork — so your budget reaches real, confirmed voters.",
      },
      {
        question: "What is your turnaround time for a rapid-response ad?",
        answer: "Under 6 hours from an approved script to a live ad.",
      },
      {
        question: "Can you produce content for multiple audience segments?",
        answer:
          "Yes — we build different versions of your ads tailored to each audience group you're trying to reach.",
      },
      {
        question: "Do you handle compliant ad disclaimers?",
        answer: "Yes — every ad includes the required disclaimers, reviewed before it goes live.",
      },
    ],
    crossSell: [
      {
        slug: "web-development",
        blurb: "Send ad clicks straight to an easy, high-converting donation page.",
      },
      {
        slug: "field-execution",
        blurb: "Reach the same voters your canvassers are visiting with matching digital ads.",
      },
    ],
  },
  {
    slug: "print-media",
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
        title: "Personalized to Every Household",
        description:
          "Every mail piece can be personalized to the household it's going to — at full production scale.",
      },
      {
        index: "02",
        title: "Fast, High-Volume Printing",
        description:
          "Our print lines produce mailers, signage, and campaign materials quickly, without sacrificing quality.",
      },
      {
        index: "03",
        title: "Getting It Into the Mail",
        description:
          "We handle all the USPS paperwork and sorting so your mail goes out on time and by the book.",
      },
      {
        index: "04",
        title: "Tracking When It Arrives",
        description: "We can tell you exactly when your mail lands in voters' mailboxes.",
      },
    ],
    ctaLabel: "SCHEDULE STRATEGY SESSION",
    ctaHref: "/booking",
    deliverables: [
      "Personalized Direct Mail",
      "Push Cards & Walk Sheets for Canvassers",
      "Yard Signs & Banners",
      "Branded Campaign Merchandise",
      "Postage Handling & Delivery Tracking",
      "Trackable QR Codes on Your Mail",
    ],
    techStack: [
      "High-Volume Printing Equipment",
      "USPS Mail Processing",
      "Delivery Tracking",
      "Personalized Printing at Scale",
    ],
    caseStudy: {
      context: "County Commission Race — Multi-Precinct Mail Program",
      description:
        "Sent 12 rounds of personalized direct mail alongside a matching yard sign campaign across key precincts.",
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
          "48 hours from an approved proof to being handed off to USPS, with 24-hour rush jobs available.",
      },
      {
        question: "Can we track when mailers hit voter mailboxes?",
        answer:
          "Yes — every mail piece is trackable, so we can tell you when it lands in mailboxes.",
      },
      {
        question: "What is your minimum order volume?",
        answer:
          "We scale from a single targeted precinct to statewide volume, with no minimum order penalty.",
      },
      {
        question: "Do you handle both design and physical production in-house?",
        answer:
          "Yes. Design, proofing, printing, and mailing are all handled in-house, start to finish.",
      },
    ],
    crossSell: [
      {
        slug: "field-execution",
        blurb: "Give your canvassers matching walk cards and push cards.",
      },
      {
        slug: "digital-marketing",
        blurb: "Follow up with digital ads for anyone who scans a QR code on your mail.",
      },
    ],
  },
  {
    slug: "web-development",
    navLabel: "Web & Automation",
    icon: Globe,
    heroTitle: "WEB DEVELOPMENT & DIGITAL AUTOMATION",
    heroSubheadline: "A fast, reliable website that turns visitors into supporters.",
    heroStat: "Loads in Under 1 Second",
    image: "/images/pillar-4-web.webp",
    imageAlt: "Laptop displaying campaign strategy code and a donor network dashboard",
    cards: [
      {
        index: "01",
        title: "Planning & Security Check",
        description:
          "Before we write any code, we map out the visitor's experience and check for security gaps.",
      },
      {
        index: "02",
        title: "A Site Built to Convert Visitors",
        description:
          "We build custom, mobile-friendly pages with one goal: turning visitors into supporters and donors.",
      },
      {
        index: "03",
        title: "Connected to Your Contact List & Payments",
        description:
          "We connect your website directly to your donation processor and contact list, so every signup and gift is captured in one place.",
      },
      {
        index: "04",
        title: "Testing Before We Launch",
        description:
          "We test the site under heavy traffic and check for security issues before launch, backed by strong protection against attacks.",
      },
    ],
    ctaLabel: "SCHEDULE STRATEGY SESSION",
    ctaHref: "/booking",
    deliverables: [
      "A Custom, Mobile-Friendly Website",
      "A Simple, Secure Donation Page",
      "Automatic Text & Email Follow-Ups",
      "Everything Synced to One Contact List",
      "Accessibility & Security Built In",
      "A Live Dashboard Showing Visitor Activity",
    ],
    techStack: [
      "Next.js / React",
      "Tailwind CSS",
      "Stripe / Anedot",
      "Resend",
      "Cloudflare Turnstile",
      "HubSpot / NGP VAN",
    ],
    caseStudy: {
      context: "Municipal Ballot Initiative — Urban Center",
      description:
        "Built a fast, custom website with automatic text messaging and a quick, simple voter registration process.",
      metric: "89% Turnout",
      metricLabel: "Targeted Voter Reach",
    },
    engagementScope: [
      { label: "Rapid Launch", duration: "2 Weeks" },
      { label: "Full Build", duration: "6 Weeks" },
      { label: "Full System Integration", duration: "90 Days" },
    ],
    faqs: [
      {
        question: "Which donation processors do you support?",
        answer:
          "Seamless setup with Anedot, WinRed, ActBlue, Stripe, and custom merchant accounts.",
      },
      {
        question: "Is the website protected against traffic spikes or malicious attacks?",
        answer:
          "Yes. Every site we build includes strong protection against attacks and traffic spikes.",
      },
      {
        question: "Do you provide ongoing maintenance after launch?",
        answer: "Yes. We offer post-launch monitoring, uptime alerts, and content update support.",
      },
      {
        question: "Can the site integrate with our existing voter file or CRM?",
        answer:
          "Yes. We can connect your site to NGP VAN, HubSpot, and most standard contact-list or voter-file systems.",
      },
    ],
    crossSell: [
      {
        slug: "digital-marketing",
        blurb: "Send ad traffic straight to a page built to turn visitors into supporters.",
      },
      {
        slug: "field-execution",
        blurb: "Send new signups from your website straight into your canvassing lists.",
      },
    ],
  },
];

export const caseStudiesPage = {
  heroTitle: "TRACK RECORD",
  heroSubheadline: "Real results from competitive races, with numbers you can verify.",
  heroImage: "/images/hero-aerial-map.webp",
  heroImageAlt: "Aerial night map of a district with illuminated roads",
  confidentialityNote:
    "To protect our clients' privacy, we've removed specific names and district numbers from these examples. All figures are real — just not tied to a specific race.",
  studies: [
    {
      id: "case-1",
      district: "State Senate District — High-Growth Suburb",
      pillar: "Field Execution & Ground Operations",
      challenge:
        "Trailing by 4.2 points 30 days out, with inconsistent voter outreach across the district.",
      execution:
        "Reached 14,000 undecided households through door-to-door canvassing, paired with daily personalized mail.",
      result:
        "Turnout in target precincts outpaced the district average by double digits, delivering a meaningful swing on election night.",
      metric: "+7.4 PTS",
      metricLabel: "Margin Shift",
      quote: "Magnolia Grove came through when it mattered most in our ground game.",
      quoteAttribution: "— Campaign Manager, State Senate Race",
    },
    {
      id: "case-2",
      district: "Congressional PAC — Multi-County Media Push",
      pillar: "Digital Marketing & Media Strategy",
      challenge:
        "Ad spend spread across multiple counties was producing low-quality donor leads and inconsistent messaging.",
      execution:
        "Ran a location-targeted streaming and digital ad campaign, paired with donor pages built to convert visitors into givers.",
      result:
        "Donor conversion rates nearly tripled within the first month, extending the PAC's fundraising runway heading into the final stretch.",
      metric: "3.2x ROI",
      metricLabel: "Donor Conversion",
      quote:
        "Their ad spend was more disciplined than the larger agencies we'd worked with before — every dollar had a job.",
      quoteAttribution: "— PAC Director, Multi-County Media Program",
    },
    {
      id: "case-3",
      district: "Municipal Ballot Initiative — Urban Center",
      pillar: "Web Development & Digital Automation",
      challenge:
        "An outdated website was losing registration traffic and donor conversions to slow load times and a broken mobile experience.",
      execution:
        "Built a fast, custom website with automatic text messaging and a simple, mobile-friendly voter registration process.",
      result:
        "Targeted voter reach hit turnout levels rarely seen in municipal ballot initiatives, validating the rebuild ahead of a hard election-day deadline.",
      metric: "89% Turnout",
      metricLabel: "Targeted Voter Reach",
      quote:
        "We went from an outdated website to one of our most effective organizing tools in six weeks.",
      quoteAttribution: "— Campaign Digital Director, Municipal Initiative",
    },
    {
      id: "case-4",
      district: "County Commission Race — Multi-Precinct Mail Program",
      pillar: "Print Media & Logistical Infrastructure",
      challenge:
        "A late entry into a crowded county commission race left no time for a traditional canvassing program to build name recognition.",
      execution:
        "Sent 12 rounds of personalized direct mail alongside a matching yard sign campaign across target precincts.",
      result:
        "Name recognition and favorability climbed steadily through each mail cycle, culminating in a margin shift that outpaced internal polling.",
      metric: "+5.1 PTS",
      metricLabel: "Margin Shift via Mail",
      quote: "Our mail program was one of the biggest factors in moving the numbers.",
      quoteAttribution: "— County Commission Candidate",
    },
  ] as CaseStudy[],
  ctaLabel: "REQUEST A STRATEGY SESSION",
  ctaHref: "/booking",
};

export const bookingPage = {
  heroTitle: "STRATEGY SESSION",
  heroSubheadline:
    "Pick your timeline and request a consultation directly with our leadership team.",
  heroImage: "/images/hero-columns.webp",
  heroImageAlt: "Low-angle view of classical stone columns",
  formIntro:
    "Fill out the form below to reserve time with our team for your upcoming campaign or initiative.",
  serviceOptions: pillars.map((pillar) => pillar.heroTitle),
  fields: {
    orgName: "Organization / Campaign Name",
    contactName: "Full Name",
    role: "Title / Role",
    email: "Email Address",
    phone: "Phone Number",
    pillar: "Primary Area of Interest",
    budget: "Estimated Budget Range",
    timeline: "Timeline",
    message: "Tell Us About Your Race or Initiative",
  },
  budgetOptions: ["Under $10K", "$10K – $25K", "$25K – $50K", "$50K – $100K", "$100K+"],
  timelineOptions: [
    "Immediate (Under 30 Days)",
    "Next Quarter / Primary Cycle",
    "General Election / Long-Term",
  ],
  messagePlaceholder:
    "Tell us about your district, where things currently stand, and what you're hoping to achieve...",
  submitLabel: "REQUEST STRATEGY SESSION",
  submittingLabel: "SUBMITTING...",
  successTitle: "REQUEST RECEIVED",
  successMessage:
    "Consultation booked. You'll receive a calendar invite with meeting details shortly.",
  errorMessage:
    "Something went wrong. Please double-check your contact information or reach out directly via ben@magnoliagrovega.com.",
  privacyNote: "Everything you share with us stays confidential.",
  whatHappensNext: {
    eyebrow: "What Happens Next",
    steps: [
      {
        step: "01",
        title: "We Review Your Situation",
        detail:
          "Within 2 hours, we send over a confidentiality agreement and start reviewing your race or project.",
      },
      {
        step: "02",
        title: "Direct Advisory Call",
        detail:
          "A 30-minute strategy call with senior leadership — not a sales rep — to talk through your goals and timeline.",
      },
      {
        step: "03",
        title: "A Custom Plan & Proposal",
        detail: "We put together a tailored plan and proposal covering scope, timeline, and cost.",
      },
    ],
  },
  faqs: [
    {
      question: "Is there a minimum engagement or contract length?",
      answer:
        "No set minimum — most engagements are scoped around your election cycle or campaign timeline, whether that's a 30-day sprint or a full season.",
    },
    {
      question: "How do you handle confidentiality?",
      answer:
        "Every engagement is confidential from the first conversation. We never disclose who we're working with or share campaign details without your written consent.",
    },
    {
      question: "What's a typical project timeline?",
      answer:
        "It depends on scope — some services launch within days (emergency canvassing, rapid-response ads), others take a few weeks to build (a new website). You'll get a real timeline on your strategy call, not a guess.",
    },
    {
      question: "What areas do you serve?",
      answer:
        "We're based in Columbus, Georgia and work statewide, with the ability to support campaigns and organizations nationwide.",
    },
    {
      question: "How does pricing work?",
      answer:
        "Pricing depends on scope, timeline, and which pillars you need. We'll walk through real numbers on your strategy call rather than quote blind.",
    },
    {
      question: "What if we need to pause or change scope mid-engagement?",
      answer:
        "Just tell us. We build change orders into every agreement so scope can flex without starting over.",
    },
  ],
};
