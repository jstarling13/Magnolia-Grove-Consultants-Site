import Link from "next/link";
import { ArrowRight, Quote } from "lucide-react";
import { caseStudiesPage } from "@/config/pillarsConfig";
import Reveal from "@/components/Reveal";

export default function FeaturedCaseStudy() {
  const study = caseStudiesPage.studies[0];

  return (
    <section className="section-padding bg-onyx">
      <div className="container-grove">
        <Reveal className="mx-auto max-w-2xl text-center">
          <span className="eyebrow">Featured Race</span>
          <h2 className="mt-3 text-3xl sm:text-4xl">What One Team Looks Like in Practice</h2>
        </Reveal>

        <Reveal delayMs={100} className="mt-14">
          <div className="grid grid-cols-1 gap-10 rounded-lg border border-gold/25 bg-onyx-100/70 p-8 lg:grid-cols-[1fr_280px] lg:p-12">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-gold-bright">
                {study.pillar}
              </span>
              <h3 className="mt-3 font-heading text-2xl font-semibold text-white sm:text-3xl">
                {study.district}
              </h3>
              <p className="mt-5 text-base leading-relaxed text-muted-light">{study.execution}</p>

              <blockquote className="mt-8 flex items-start gap-3 border-t border-gold/15 pt-6">
                <Quote size={20} className="mt-0.5 shrink-0 text-gold/40" />
                <div>
                  <p className="text-sm italic leading-relaxed text-muted-light sm:text-base">
                    &ldquo;{study.quote}&rdquo;
                  </p>
                  <cite className="mt-2 block text-xs uppercase not-italic tracking-wide text-muted">
                    {study.quoteAttribution}
                  </cite>
                </div>
              </blockquote>

              <Link
                href="/case-studies"
                className="group mt-8 inline-flex items-center gap-2 text-sm font-semibold text-gold-bright transition-colors hover:text-white"
              >
                See Every Result
                <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
              </Link>
            </div>

            <div className="flex flex-col items-center justify-center rounded-lg border border-gold/30 bg-onyx p-8 text-center">
              <span className="font-heading text-5xl font-bold text-gold-bright sm:text-6xl">
                {study.metric}
              </span>
              <p className="mt-3 text-xs font-semibold uppercase tracking-[0.16em] text-muted">
                {study.metricLabel}
              </p>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
