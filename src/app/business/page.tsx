import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Landmark, HeartHandshake, Building2, Users } from "lucide-react";
import {
  businessHero,
  businessServicesIntro,
  businessServicePillars,
  businessTrustBadges,
  businessTrustBadgesLabel,
  businessAbout,
  businessNav,
} from "@/config/businessConfig";
import Reveal from "@/components/Reveal";

export const metadata: Metadata = {
  title: "Marketing & Growth Execution | Magnolia Grove Consultants",
  description: businessHero.subtitle,
};

const trustIcons = [Landmark, HeartHandshake, Building2, Users];

export default function BusinessHome() {
  return (
    <>
      <section className="relative overflow-hidden bg-onyx">
        <Image
          src="/images/hero-columns.webp"
          alt="Classic white marble government columns standing under high-contrast dark twilight"
          fill
          priority
          sizes="100vw"
          className="object-cover object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-onyx/70 via-onyx/80 to-onyx" />
        <div className="absolute inset-0 bg-onyx/40" />

        <div className="container-grove relative px-6 pb-20 pt-16 sm:px-8 sm:pb-28 sm:pt-20 lg:px-12 lg:pb-36 lg:pt-24">
          <div className="mx-auto flex max-w-4xl flex-col items-center text-center">
            <span className="eyebrow mb-6">{businessHero.eyebrow}</span>

            <h1 className="text-5xl uppercase leading-[0.95] text-white sm:text-6xl lg:text-7xl lg:leading-[0.95]">
              {businessHero.headline}
            </h1>

            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted-light sm:text-xl">
              {businessHero.subtitle}
            </p>

            <div className="mt-10 flex w-full flex-col items-center gap-4 sm:w-auto sm:flex-row">
              <Link
                href={businessHero.primaryCtaHref}
                className="group inline-flex w-full items-center justify-center gap-2 rounded-md bg-gold px-8 py-4 text-sm font-semibold text-onyx shadow-card transition-all hover:bg-gold-bright hover:shadow-card-hover sm:w-auto"
              >
                {businessHero.primaryCta}
                <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
              </Link>
              <Link
                href={businessHero.secondaryCtaHref}
                className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-gold/40 px-8 py-4 text-sm font-semibold text-white transition-all hover:bg-white/5 sm:w-auto"
              >
                {businessHero.secondaryCta}
              </Link>
            </div>

            <div className="mt-14 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 border-t border-gold/15 pt-8">
              {businessHero.proofPoints.map((point) => (
                <div
                  key={point}
                  className="flex items-center gap-2 text-sm font-medium text-muted-light"
                >
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-gold-bright" />
                  {point}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-gold/15 bg-cream-200 px-6 py-8 sm:px-8 lg:px-12">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-center gap-5 sm:flex-row sm:justify-between">
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-onyx/60">
            {businessTrustBadgesLabel}
          </span>
          <div className="flex flex-wrap items-center justify-center gap-3">
            {businessTrustBadges.map((badge, index) => {
              const Icon = trustIcons[index] ?? Building2;
              return (
                <span
                  key={badge.id}
                  className="inline-flex items-center gap-2 rounded-full border border-gold/25 bg-cream px-4 py-2 text-xs font-semibold uppercase tracking-wide text-onyx/80"
                >
                  <Icon size={14} className="text-gold-dark" />
                  {badge.label}
                </span>
              );
            })}
          </div>
        </div>
      </section>

      <section className="bg-cream px-6 py-20 sm:px-8 lg:px-12 lg:py-28">
        <div className="mx-auto max-w-8xl">
          <Reveal className="max-w-2xl">
            <span className="eyebrow">{businessServicesIntro.eyebrow}</span>
            <h2 className="mt-3 text-3xl sm:text-4xl">{businessServicesIntro.headline}</h2>
            <p className="mt-4 text-base leading-relaxed text-onyx/60">
              {businessServicesIntro.subtitle}
            </p>
          </Reveal>

          <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
            {businessServicePillars.map((pillar) => {
              const Icon = pillar.icon;
              return (
                <Link
                  key={pillar.id}
                  href={`/business/pillars/${pillar.pillarSlug}`}
                  className="group flex h-full flex-col rounded-lg border border-gold/25 bg-cream-200/70 p-8 shadow-card transition-all hover:border-gold/70 hover:bg-cream-200 hover:shadow-card-hover"
                >
                  <div className="flex h-14 w-14 items-center justify-center rounded-md border border-gold/40 bg-gold/10 text-gold-dark transition-colors group-hover:bg-gold group-hover:text-onyx">
                    <Icon size={24} strokeWidth={1.75} />
                  </div>
                  <h3 className="mt-6 text-xl text-onyx">{pillar.title}</h3>
                  <p className="mt-3 flex-1 text-sm leading-relaxed text-onyx/60">
                    {pillar.description}
                  </p>
                  <ul className="mt-5 flex flex-col gap-2">
                    {pillar.subItems.map((item) => (
                      <li key={item} className="flex items-start gap-2 text-xs text-onyx/60">
                        <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-gold-bright" />
                        {item}
                      </li>
                    ))}
                  </ul>
                  <span className="mt-6 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-gold-dark">
                    View Pillar Details
                    <ArrowRight
                      size={14}
                      className="transition-transform group-hover:translate-x-1"
                    />
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden bg-cream-100 py-24 sm:py-32">
        <div className="container-grove relative px-6 sm:px-8 lg:px-12">
          <Reveal className="mx-auto max-w-2xl text-left">
            <span className="eyebrow">{businessAbout.eyebrow}</span>
            <h2 className="mt-3 text-3xl sm:text-4xl">{businessAbout.headline}</h2>
            <p className="mt-5 text-base leading-relaxed text-onyx/80 sm:text-lg">
              {businessAbout.body}
            </p>

            <ul className="mt-8 flex flex-col gap-4">
              {businessAbout.bullets.map((bullet) => (
                <li key={bullet} className="flex items-start gap-3 text-sm text-onyx sm:text-base">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-gold-bright" />
                  <span>{bullet}</span>
                </li>
              ))}
            </ul>

            <Link
              href="/business/about"
              className="group mt-8 inline-flex items-center gap-2 text-sm font-semibold text-gold-dark transition-colors hover:text-onyx"
            >
              Meet the Team
              <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
            </Link>
          </Reveal>
        </div>
      </section>

      <section className="bg-onyx px-6 py-24 text-center sm:px-8 lg:px-12">
        <div className="mx-auto max-w-2xl">
          <h2 className="text-3xl text-white sm:text-4xl">Let&apos;s Talk About Your Growth.</h2>
          <p className="mt-4 text-base leading-relaxed text-muted-light sm:text-lg">
            Tell us where things stand. We&apos;ll tell you what it takes to move forward.
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
