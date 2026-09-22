"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { businessPillars } from "@/config/businessPillarsConfig";
import { trackEvent } from "@/lib/gtag";
import type { CrossSellItem } from "@/types";

interface BusinessCrossSellCalloutProps {
  items: CrossSellItem[];
}

export default function BusinessCrossSellCallout({ items }: BusinessCrossSellCalloutProps) {
  const resolved = items
    .map((item) => {
      const pillar = businessPillars.find((candidate) => candidate.slug === item.slug);
      return pillar ? { ...item, pillar } : null;
    })
    .filter(
      (item): item is CrossSellItem & { pillar: (typeof businessPillars)[number] } =>
        item !== null
    );

  if (resolved.length === 0) return null;

  return (
    <section className="border-t border-gold/15 bg-cream-200 px-6 py-16 sm:px-8 lg:px-12 lg:py-20">
      <div className="mx-auto max-w-8xl">
        <span className="eyebrow">Pairs Well With</span>
        <h2 className="mt-3 text-2xl text-onyx sm:text-3xl">Bundle for Maximum Impact</h2>

        <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2">
          {resolved.map(({ pillar, blurb }) => (
            <Link
              key={pillar.slug}
              href={`/business/pillars/${pillar.slug}`}
              onClick={() =>
                trackEvent("pillar_cross_sell_click", { target_pillar: `business-${pillar.slug}` })
              }
              className="group flex flex-col justify-between rounded-lg border border-gold/25 bg-cream p-8 transition-all duration-300 hover:-translate-y-1 hover:border-gold/50 hover:shadow-[0_16px_40px_-12px_rgba(197,160,89,0.35)]"
            >
              <div>
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-gold-dark">
                  {pillar.navLabel}
                </span>
                <p className="mt-3 text-base leading-relaxed text-onyx/80 sm:text-base">{blurb}</p>
              </div>
              <span className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-onyx transition-colors group-hover:text-gold-dark">
                Explore Pillar
                <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
