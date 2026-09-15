import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { CaseStudySpotlight } from "@/types";

interface PillarCaseStudySpotlightProps {
  caseStudy: CaseStudySpotlight;
}

export default function PillarCaseStudySpotlight({ caseStudy }: PillarCaseStudySpotlightProps) {
  return (
    <section className="border-t border-gold/15 bg-cream px-6 py-16 sm:px-8 lg:px-12 lg:py-20">
      <div className="mx-auto max-w-8xl">
        <span className="eyebrow">Case Study Spotlight</span>
        <h2 className="mt-3 text-2xl text-onyx sm:text-3xl">Proven in the Field</h2>

        <div className="mt-10 flex flex-col items-start gap-8 rounded-lg border border-gold/25 bg-cream-200 p-8 shadow-card sm:p-10 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-onyx/60">
              {caseStudy.context}
            </span>
            <p className="mt-4 text-base leading-relaxed text-onyx/80 sm:text-lg">
              {caseStudy.description}
            </p>
            <p className="mt-4 text-xs text-onyx/60">
              Metric anonymized to preserve client confidentiality.
            </p>
          </div>

          <div className="flex shrink-0 flex-col items-start gap-2 border-t border-gold/20 pt-6 lg:items-end lg:border-l lg:border-t-0 lg:pl-10 lg:pt-0">
            <span className="font-heading text-4xl font-bold text-gold-dark sm:text-5xl">
              {caseStudy.metric}
            </span>
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-onyx/60">
              {caseStudy.metricLabel}
            </span>
          </div>
        </div>

        <Link
          href="/case-studies"
          className="group mt-6 inline-flex items-center gap-2 text-sm font-semibold text-gold-dark transition-colors hover:text-onyx"
        >
          View Full Track Record
          <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
        </Link>
      </div>
    </section>
  );
}
