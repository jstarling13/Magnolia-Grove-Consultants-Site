"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { pillars } from "@/config/pillarsConfig";

export default function PillarTabSwitcher() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [indicator, setIndicator] = useState({ left: 0, width: 0 });
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  useEffect(() => {
    const measure = () => {
      const node = tabRefs.current[activeIndex];
      if (node) {
        setIndicator({ left: node.offsetLeft, width: node.offsetWidth });
      }
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [activeIndex]);

  const activePillar = pillars[activeIndex];
  const Icon = activePillar.icon;

  return (
    <section className="bg-onyx px-6 py-20 sm:px-8 lg:px-12 lg:py-28">
      <div className="mx-auto max-w-8xl">
        <span className="eyebrow">Compare Mode</span>
        <h2 className="mt-3 text-3xl sm:text-4xl">Deep-Dive Process Methodology</h2>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted">
          Toggle between pillars to compare execution steps side by side, without leaving the page.
        </p>

        <div className="relative mt-10 flex flex-wrap gap-x-2 gap-y-3 border-b border-gold/15">
          {pillars.map((pillar, index) => (
            <button
              key={pillar.slug}
              ref={(node) => {
                tabRefs.current[index] = node;
              }}
              type="button"
              onClick={() => setActiveIndex(index)}
              aria-pressed={index === activeIndex}
              className={`px-5 py-3 text-sm font-semibold uppercase tracking-wide transition-colors ${
                index === activeIndex ? "text-gold-bright" : "text-muted hover:text-white"
              }`}
            >
              {pillar.navLabel}
            </button>
          ))}
          <span
            className="absolute bottom-0 h-0.5 bg-gold-bright transition-all duration-300 ease-out"
            style={{ left: indicator.left, width: indicator.width }}
          />
        </div>

        <div
          key={activePillar.slug}
          className="animate-tab-fade mt-10 grid grid-cols-1 gap-8 lg:grid-cols-[auto_1fr] lg:gap-10"
        >
          <div className="flex h-16 w-16 items-center justify-center rounded-md border border-gold/40 bg-gold/10 text-gold-bright">
            <Icon size={28} strokeWidth={1.75} />
          </div>

          <div>
            <h3 className="font-heading text-2xl font-semibold text-white sm:text-3xl">
              {activePillar.heroTitle}
            </h3>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted sm:text-base">
              {activePillar.heroSubheadline}
            </p>

            <ul className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {activePillar.cards.map((card) => (
                <li
                  key={card.index}
                  className="flex items-start gap-3 rounded-md border border-gold/15 bg-onyx-100/60 p-4 text-sm text-muted-light"
                >
                  <span className="font-heading text-xs font-bold text-gold-bright">
                    {card.index}
                  </span>
                  <span>{card.title}</span>
                </li>
              ))}
            </ul>

            <Link
              href={`/pillars/${activePillar.slug}`}
              className="group mt-8 inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-gold-bright transition-colors hover:text-white"
            >
              {activePillar.ctaLabel}
              <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
