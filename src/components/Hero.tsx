import Image from "next/image";
import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { hero } from "@/config/siteConfig";

export default function Hero() {
  return (
    <section id="top" className="relative overflow-hidden bg-onyx">
      <Image
        src="/images/hero-columns.webp"
        alt={hero.imageAlt}
        fill
        priority
        sizes="100vw"
        className="object-cover object-center"
      />
      {/* 70% dark gradient overlay for text legibility */}
      <div className="absolute inset-0 bg-gradient-to-b from-onyx/70 via-onyx/80 to-onyx" />
      <div className="absolute inset-0 bg-onyx/40" />

      <div className="container-grove relative px-6 pb-20 pt-16 sm:px-8 sm:pb-28 sm:pt-20 lg:px-12 lg:pb-36 lg:pt-24">
        <div className="mx-auto flex max-w-4xl flex-col items-center text-center">
          <span className="mb-6 inline-flex items-center rounded-md border border-gold/40 bg-gold/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-gold-bright">
            {hero.eyebrow}
          </span>

          <h1 className="text-4xl font-semibold leading-tight text-white sm:text-5xl lg:text-6xl lg:leading-tight">
            {hero.headline}
          </h1>

          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted-light sm:text-xl">
            {hero.subtitle}
          </p>

          <div className="mt-10 flex w-full flex-col items-center gap-4 sm:w-auto sm:flex-row">
            <Link
              href={hero.primaryCtaHref}
              className="group inline-flex w-full items-center justify-center gap-2 rounded-md bg-gold px-8 py-4 text-sm font-semibold text-onyx shadow-card transition-all hover:bg-gold-bright hover:shadow-card-hover sm:w-auto"
            >
              {hero.primaryCta}
              <ArrowRight
                size={18}
                className="transition-transform group-hover:translate-x-1"
              />
            </Link>
            <Link
              href={hero.secondaryCtaHref}
              className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-gold/40 px-8 py-4 text-sm font-semibold text-white transition-all hover:bg-white/5 sm:w-auto"
            >
              {hero.secondaryCta}
            </Link>
          </div>

          <div className="mt-14 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 border-t border-gold/15 pt-8">
            {hero.proofPoints.map((point) => (
              <div
                key={point}
                className="flex items-center gap-2 text-sm font-medium text-muted-light"
              >
                <CheckCircle2 size={16} className="text-gold-bright" />
                {point}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
