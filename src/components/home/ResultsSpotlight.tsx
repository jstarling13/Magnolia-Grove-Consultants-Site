import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { caseStudiesPage } from "@/config/pillarsConfig";
import Reveal from "@/components/Reveal";

export default function ResultsSpotlight() {
  const stats = caseStudiesPage.studies.map((study) => ({
    id: study.id,
    metric: study.metric,
    metricLabel: study.metricLabel,
    district: study.district,
  }));

  return (
    <section className="section-padding border-y border-gold/15 bg-onyx-100">
      <div className="container-grove">
        <Reveal className="mx-auto max-w-2xl text-center">
          <span className="eyebrow">Results Under Pressure</span>
          <h2 className="mt-3 text-3xl sm:text-4xl">Real Races. Real Numbers.</h2>
          <p className="mt-4 text-base leading-relaxed text-muted sm:text-lg">
            Names and district numbers are withheld for client confidentiality — every figure below
            is real.
          </p>
        </Reveal>

        <div className="mt-14 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat, index) => (
            <Reveal key={stat.id} delayMs={index * 100}>
              <div className="flex h-full flex-col items-center rounded-lg border border-gold/25 bg-onyx/70 px-6 py-10 text-center backdrop-blur-sm">
                <span className="font-heading text-4xl font-bold text-gold-bright sm:text-5xl">
                  {stat.metric}
                </span>
                <span className="mt-3 text-sm font-medium uppercase tracking-wide text-muted">
                  {stat.metricLabel}
                </span>
                <span className="mt-4 text-xs leading-relaxed text-muted/80">{stat.district}</span>
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal delayMs={300} className="mt-12 flex justify-center">
          <Link
            href="/case-studies"
            className="group inline-flex items-center gap-2 text-sm font-semibold text-gold-bright transition-colors hover:text-white"
          >
            View the Full Track Record
            <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
          </Link>
        </Reveal>
      </div>
    </section>
  );
}
