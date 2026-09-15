"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import type { PillarFAQItem } from "@/types";

interface PillarFAQAccordionProps {
  faqs: PillarFAQItem[];
}

export default function PillarFAQAccordion({ faqs }: PillarFAQAccordionProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section className="border-t border-gold/15 bg-cream px-6 py-16 sm:px-8 lg:px-12 lg:py-20">
      <div className="mx-auto max-w-4xl">
        <span className="eyebrow">Frequently Asked</span>
        <h2 className="mt-3 text-2xl text-onyx sm:text-3xl">Common Questions</h2>

        <div className="mt-10 flex flex-col gap-3">
          {faqs.map((faq, index) => {
            const isOpen = openIndex === index;
            return (
              <div
                key={faq.question}
                className="rounded-lg border border-gold/20 bg-cream-200 shadow-card transition-colors hover:border-gold/40"
              >
                <button
                  type="button"
                  onClick={() => setOpenIndex(isOpen ? null : index)}
                  aria-expanded={isOpen}
                  className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left"
                >
                  <span className="text-base font-semibold text-onyx sm:text-lg">
                    {faq.question}
                  </span>
                  <ChevronDown
                    size={20}
                    className={`shrink-0 text-gold-dark transition-transform duration-300 ${
                      isOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>
                {isOpen && (
                  <p className="px-6 pb-5 text-sm leading-relaxed text-onyx/80 sm:text-base">
                    {faq.answer}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
