import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { businessAbout, businessNav } from "@/config/businessConfig";
import Reveal from "@/components/Reveal";

export const metadata: Metadata = {
  title: "About | Magnolia Grove Consultants",
  description: businessAbout.body,
};

const values = [
  {
    title: "Strategic Clarity",
    description:
      "Before a single ad is placed or a single call is made, we define a clear strategic path. Every action is deliberate and data-informed, in service of your goals.",
  },
  {
    title: "Absolute Confidentiality",
    description:
      "Trust is our most valuable currency. We hold client strategy, operations, and proprietary information to the highest standard of confidentiality and data security, always.",
  },
  {
    title: "Relentless Execution",
    description:
      "Execution is what separates a plan from a result. Our teams move fast, adapt on the fly, and deliver when it matters most.",
  },
  {
    title: "Partnership, Not Vendorship",
    description:
      "We embed ourselves in our clients' goals and treat them as our own — a strategic partner invested in the outcome, not a vendor filling a contract.",
  },
];

export default function BusinessAboutPage() {
  return (
    <>
      <section className="bg-cream-100 px-6 py-20 sm:px-8 lg:px-12 lg:py-28">
        <div className="mx-auto max-w-3xl text-center">
          <Reveal>
            <span className="eyebrow">{businessAbout.eyebrow}</span>
            <h1 className="mt-3 text-3xl sm:text-4xl">{businessAbout.headline}</h1>
            <p className="mt-5 text-base leading-relaxed text-onyx/80 sm:text-lg">
              {businessAbout.body}
            </p>
          </Reveal>
        </div>
      </section>

      <section className="bg-cream px-6 py-20 sm:px-8 lg:px-12 lg:py-28">
        <div className="mx-auto max-w-6xl">
          <Reveal className="mx-auto max-w-2xl text-center">
            <span className="eyebrow">What We Stand For</span>
            <h2 className="mt-3 text-3xl sm:text-4xl">The Principles Behind Every Engagement</h2>
          </Reveal>

          <div className="mt-14 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {values.map((item, index) => (
              <Reveal key={item.title} delayMs={index * 100}>
                <div className="group h-full rounded-lg border border-gold/25 bg-cream-100/70 p-8 shadow-card backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:border-gold/50 hover:shadow-[0_16px_40px_-12px_rgba(197,160,89,0.35)]">
                  <span className="font-heading text-3xl font-bold text-gold-dark">
                    0{index + 1}
                  </span>
                  <h3 className="mt-5 font-heading text-lg font-semibold text-onyx">
                    {item.title}
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-onyx/60">{item.description}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-cream-100 px-6 py-20 sm:px-8 lg:px-12 lg:py-28">
        <div className="mx-auto max-w-6xl">
          <Reveal className="mx-auto max-w-2xl text-center">
            <span className="eyebrow">Leadership</span>
            <h2 className="mt-3 text-3xl sm:text-4xl">The Team Behind the Strategy</h2>
            <p className="mt-4 text-base leading-relaxed text-onyx/60 sm:text-lg">
              Strategy doesn&apos;t get handed off to an account manager. Every engagement is led
              directly by Magnolia Grove&apos;s founder, with one team coordinating execution
              across every channel.
            </p>
          </Reveal>

          <Reveal className="mx-auto mt-14 max-w-3xl">
            <div className="flex flex-col items-center gap-6 rounded-lg border border-gold/25 bg-cream/70 p-8 text-center backdrop-blur-sm sm:flex-row sm:items-start sm:text-left">
              <div className="flex h-28 w-28 shrink-0 items-center justify-center rounded-full border border-gold/40 bg-cream font-heading text-3xl font-bold text-gold-dark sm:h-32 sm:w-32">
                BG
              </div>
              <div>
                <h3 className="font-heading text-xl font-semibold text-onyx">Ben Garcia</h3>
                <span className="mt-1 block text-xs font-semibold uppercase tracking-[0.16em] text-gold-dark">
                  Founder & Principal
                </span>
                <p className="mt-4 text-sm leading-relaxed text-onyx/60 sm:text-base">
                  Ben Garcia founded Magnolia Grove Consultants in 2024 to solve the vendor
                  fragmentation he saw across marketing and outreach work — clients juggling a
                  field team, an ad agency, a print shop, and a web developer, with no one owning
                  the whole picture. His focus is building operations that get real results.
                  Under his leadership, the firm has grown into a trusted partner for
                  organizations who want one team handling everything, done well.
                </p>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="bg-onyx px-6 py-24 text-center sm:px-8 lg:px-12">
        <div className="mx-auto max-w-2xl">
          <h2 className="text-3xl text-white sm:text-4xl">Ready to Get Started?</h2>
          <p className="mt-4 text-base leading-relaxed text-muted-light sm:text-lg">
            Magnolia Grove provides the strategic and operational framework growing organizations
            rely on.
          </p>
          <Link
            href={businessNav.primaryCtaHref}
            className="group mt-8 inline-flex items-center gap-2 rounded-md bg-gold px-8 py-4 text-sm font-semibold text-onyx shadow-card transition-all hover:bg-gold-bright hover:shadow-card-hover"
          >
            {businessNav.primaryCta}
            <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
      </section>
    </>
  );
}
