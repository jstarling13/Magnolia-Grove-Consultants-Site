"use client";

import { useEffect, useRef, useState } from "react";
import type { PillarCard } from "@/types";

interface PillarCardGridProps {
  cards: PillarCard[];
  eyebrow?: string;
  title?: string;
}

export default function PillarCardGrid({ cards, eyebrow, title }: PillarCardGridProps) {
  const [litCount, setLitCount] = useState(0);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const cardRefs = useRef<Array<HTMLDivElement | null>>([]);

  useEffect(() => {
    const observers: IntersectionObserver[] = [];

    cardRefs.current.forEach((node, index) => {
      if (!node) return;
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setLitCount((prev) => Math.max(prev, index + 1));
          }
        },
        { threshold: 0.4 }
      );
      observer.observe(node);
      observers.push(observer);
    });

    return () => observers.forEach((observer) => observer.disconnect());
  }, []);

  const activeCount = hoverIndex !== null ? hoverIndex + 1 : litCount;

  return (
    <section className="bg-cream-100 px-6 py-20 sm:px-8 lg:px-12 lg:py-28">
      <div className="mx-auto max-w-8xl">
        {(eyebrow || title) && (
          <div className="mb-10">
            {eyebrow && <span className="eyebrow">{eyebrow}</span>}
            {title && <h2 className="mt-3 text-2xl text-onyx sm:text-3xl">{title}</h2>}
          </div>
        )}
        {/* Horizontal step-indicator connector — lights up gold as cards enter view */}
        <div className="mb-10 hidden items-center lg:flex">
          {cards.map((card, index) => (
            <div key={card.index} className="flex flex-1 items-center last:flex-none">
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border font-heading text-xs font-bold transition-colors duration-500 ${
                  index < activeCount
                    ? "border-gold-bright bg-gold text-onyx"
                    : "border-gold/25 bg-cream text-onyx/60"
                }`}
              >
                {card.index}
              </div>
              {index < cards.length - 1 && (
                <div
                  className={`mx-2 h-px flex-1 transition-colors duration-700 ${
                    index < activeCount - 1 ? "bg-gold-bright" : "bg-gold/20"
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          {cards.map((card, index) => (
            <div
              key={card.index}
              ref={(node) => {
                cardRefs.current[index] = node;
              }}
              onMouseEnter={() => setHoverIndex(index)}
              onMouseLeave={() => setHoverIndex(null)}
              className="group rounded-lg border border-gold/25 bg-cream/70 p-8 shadow-card backdrop-blur-sm transition-all duration-300 will-change-transform hover:-translate-y-1 hover:border-gold/50 hover:shadow-[0_16px_40px_-12px_rgba(197,160,89,0.35)]"
            >
              <span className="font-heading text-sm font-bold tracking-wider text-gold-dark">
                {card.index}
              </span>
              <h3 className="mt-3 font-heading text-xl font-semibold text-onyx">{card.title}</h3>
              <p className="mt-3 text-left text-base leading-relaxed text-onyx/60">
                {card.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
