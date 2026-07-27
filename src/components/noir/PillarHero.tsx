"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Zap } from "lucide-react";
import { openConsultationDrawer } from "@/lib/consultationDrawer";

interface PillarHeroProps {
  eyebrow?: string;
  title: string;
  subheadline: string;
  stat?: string;
  image: string;
  imageAlt: string;
  ctaLabel?: string;
  ctaHref?: string;
  /** When set, the CTA opens the consultation drawer prefilled to this pillar instead of navigating. */
  pillarTitle?: string;
  priority?: boolean;
}

export default function PillarHero({
  eyebrow,
  title,
  subheadline,
  stat,
  image,
  imageAlt,
  ctaLabel,
  ctaHref,
  pillarTitle,
  priority = false,
}: PillarHeroProps) {
  return (
    <section className="relative flex min-h-[70vh] items-end overflow-hidden bg-onyx-200">
      <Image
        src={image}
        alt={imageAlt}
        fill
        priority={priority}
        sizes="100vw"
        className="object-cover object-center"
      />
      {/* 80-85% black overlay per brand system */}
      <div className="absolute inset-0 bg-onyx/80" />
      <div className="absolute inset-0 bg-gradient-to-t from-onyx via-onyx/40 to-transparent" />

      <div className="relative mx-auto w-full max-w-8xl px-6 pb-16 pt-32 sm:px-8 lg:px-12 lg:pb-24">
        {eyebrow && <span className="eyebrow mb-5 block">{eyebrow}</span>}
        <h1 className="max-w-4xl font-heading text-4xl font-bold leading-tight text-white sm:text-5xl lg:text-6xl">
          {title}
        </h1>
        <p className="mt-6 max-w-2xl text-left text-base leading-relaxed text-muted-light sm:text-lg">
          {subheadline}
        </p>

        {ctaLabel &&
          (pillarTitle ? (
            <button
              type="button"
              onClick={() => openConsultationDrawer(pillarTitle)}
              className="group mt-10 inline-flex items-center gap-2 rounded-md bg-gold px-7 py-4 text-xs font-semibold uppercase tracking-wider text-onyx transition-all hover:bg-gold-bright"
            >
              {ctaLabel}
              <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
            </button>
          ) : (
            ctaHref && (
              <Link
                href={ctaHref}
                className="group mt-10 inline-flex items-center gap-2 rounded-md bg-gold px-7 py-4 text-xs font-semibold uppercase tracking-wider text-onyx transition-all hover:bg-gold-bright"
              >
                {ctaLabel}
                <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
              </Link>
            )
          ))}

        {stat && (
          <div className="mt-6 inline-flex items-center gap-2 rounded-md border border-gold/40 bg-onyx/80 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-gold-bright">
            <Zap size={14} strokeWidth={2.5} />
            {stat}
          </div>
        )}
      </div>
    </section>
  );
}
