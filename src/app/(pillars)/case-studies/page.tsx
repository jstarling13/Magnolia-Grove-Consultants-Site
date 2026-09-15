import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ShieldCheck, Quote } from "lucide-react";
import PillarHero from "@/components/noir/PillarHero";
import { caseStudiesPage } from "@/config/pillarsConfig";

export const metadata: Metadata = {
  title: "Track Record | Magnolia Grove Consultants",
  description: caseStudiesPage.heroSubheadline,
};

export default function CaseStudiesPage() {
  return (
    <>
      <PillarHero
        title={caseStudiesPage.heroTitle}
        subheadline={caseStudiesPage.heroSubheadline}
        image={caseStudiesPage.heroImage}
        imageAlt={caseStudiesPage.heroImageAlt}
        priority
      />

      <section className="bg-cream-100 px-6 py-20 sm:px-8 lg:px-12 lg:py-28">
        <div className="mx-auto max-w-8xl">
          <div className="mb-14 flex items-start gap-3 rounded-lg border border-gold/25 bg-cream/85 px-6 py-5 shadow-card">
            <ShieldCheck size={20} className="mt-0.5 shrink-0 text-gold-dark" />
            <p className="text-left text-sm leading-relaxed text-onyx/60">
              {caseStudiesPage.confidentialityNote}
            </p>
          </div>

          <div className="flex flex-col gap-6">
            {caseStudiesPage.studies.map((study) => (
              <div
                key={study.id}
                className="grid grid-cols-1 gap-8 rounded-lg border border-gold/25 bg-cream/85 p-8 shadow-card transition-colors hover:border-gold/60 hover:shadow-card-hover lg:grid-cols-[minmax(0,1fr)_260px] lg:p-10"
              >
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-gold-dark">
                    {study.pillar}
                  </span>
                  <h3 className="mt-3 font-heading text-xl font-semibold text-onyx sm:text-2xl">
                    {study.district}
                  </h3>

                  <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-3">
                    <div>
                      <span className="text-xs font-semibold uppercase tracking-[0.14em] text-onyx/60">
                        The Challenge
                      </span>
                      <p className="mt-2 text-left text-sm leading-relaxed text-onyx/80">
                        {study.challenge}
                      </p>
                    </div>
                    <div>
                      <span className="text-xs font-semibold uppercase tracking-[0.14em] text-onyx/60">
                        What We Executed
                      </span>
                      <p className="mt-2 text-left text-sm leading-relaxed text-onyx/80">
                        {study.execution}
                      </p>
                    </div>
                    <div>
                      <span className="text-xs font-semibold uppercase tracking-[0.14em] text-onyx/60">
                        The Result
                      </span>
                      <p className="mt-2 text-left text-sm leading-relaxed text-onyx/80">
                        {study.result}
                      </p>
                    </div>
                  </div>

                  <blockquote className="mt-8 flex items-start gap-3 border-t border-gold/15 pt-6">
                    <Quote size={20} className="mt-0.5 shrink-0 text-gold/40" />
                    <div>
                      <p className="text-left text-sm italic leading-relaxed text-onyx/80 sm:text-base">
                        &ldquo;{study.quote}&rdquo;
                      </p>
                      <cite className="mt-2 block text-xs uppercase not-italic tracking-wide text-onyx/60">
                        {study.quoteAttribution}
                      </cite>
                    </div>
                  </blockquote>
                </div>

                <div className="flex flex-col items-start justify-center rounded-lg border border-gold/20 bg-cream-200 p-6 shadow-card lg:items-center lg:text-center">
                  <span className="font-heading text-4xl font-bold text-gold-dark sm:text-5xl">
                    {study.metric}
                  </span>
                  <p className="mt-2 text-xs font-semibold uppercase tracking-[0.16em] text-onyx/60">
                    {study.metricLabel}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-16 flex justify-center">
            <Link
              href={caseStudiesPage.ctaHref}
              className="group inline-flex items-center gap-2 rounded-md bg-gold px-7 py-4 text-xs font-semibold uppercase tracking-wider text-onyx transition-all hover:bg-gold-bright"
            >
              {caseStudiesPage.ctaLabel}
              <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
