import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ShieldCheck } from "lucide-react";
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

      <section className="bg-onyx-100 px-6 py-20 sm:px-8 lg:px-12 lg:py-28">
        <div className="mx-auto max-w-8xl">
          <div className="mb-14 flex items-start gap-3 rounded-lg border border-gold/25 bg-onyx/85 px-6 py-5">
            <ShieldCheck size={20} className="mt-0.5 shrink-0 text-gold-bright" />
            <p className="text-left text-sm leading-relaxed text-muted">
              {caseStudiesPage.confidentialityNote}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {caseStudiesPage.studies.map((study) => (
              <div
                key={study.id}
                className="flex h-full flex-col rounded-lg border border-gold/25 bg-onyx/85 p-8 transition-colors hover:border-gold/60"
              >
                <span className="text-xs font-semibold uppercase tracking-wider text-gold-bright">
                  {study.pillar}
                </span>
                <h3 className="mt-3 font-heading text-lg font-semibold text-white">
                  {study.district}
                </h3>
                <p className="mt-3 flex-1 text-left text-sm leading-relaxed text-muted">
                  {study.summary}
                </p>
                <div className="mt-6 border-t border-gold/15 pt-6">
                  <span className="font-heading text-3xl font-bold text-white">{study.metric}</span>
                  <p className="mt-1 text-xs uppercase tracking-wide text-muted">
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
