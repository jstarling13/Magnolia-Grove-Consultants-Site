import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import PillarHero from "@/components/noir/PillarHero";
import PillarCardGrid from "@/components/noir/PillarCardGrid";
import DeliverablesChecklist from "@/components/noir/DeliverablesChecklist";
import TechStackGrid from "@/components/noir/TechStackGrid";
import PillarCaseStudySpotlight from "@/components/noir/PillarCaseStudySpotlight";
import EngagementScope from "@/components/noir/EngagementScope";
import PillarFAQAccordion from "@/components/noir/PillarFAQAccordion";
import CrossSellCallout from "@/components/noir/CrossSellCallout";
import { pillars } from "@/config/pillarsConfig";

interface PillarPageProps {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return pillars.map((pillar) => ({ slug: pillar.slug }));
}

export async function generateMetadata({ params }: PillarPageProps): Promise<Metadata> {
  const { slug } = await params;
  const pillar = pillars.find((item) => item.slug === slug);
  if (!pillar) return {};
  return {
    title: `${pillar.heroTitle} | Magnolia Grove Consultants`,
    description: pillar.heroSubheadline,
  };
}

export default async function PillarPage({ params }: PillarPageProps) {
  const { slug } = await params;
  const pillar = pillars.find((item) => item.slug === slug);
  if (!pillar) notFound();

  const currentIndex = pillars.findIndex((item) => item.slug === pillar.slug);
  const nextPillar = pillars[(currentIndex + 1) % pillars.length];

  return (
    <>
      <PillarHero
        eyebrow={`Pillar 0${currentIndex + 1} of ${pillars.length}`}
        title={pillar.heroTitle}
        subheadline={pillar.heroSubheadline}
        stat={pillar.heroStat}
        image={pillar.image}
        imageAlt={pillar.imageAlt}
        ctaLabel={pillar.ctaLabel}
        ctaHref={pillar.ctaHref}
        pillarTitle={pillar.heroTitle}
        priority
      />

      <DeliverablesChecklist items={pillar.deliverables} />

      <PillarCardGrid eyebrow="Our Process" title="From Intake to Execution" cards={pillar.cards} />

      <TechStackGrid items={pillar.techStack} />

      <PillarCaseStudySpotlight caseStudy={pillar.caseStudy} />

      <EngagementScope options={pillar.engagementScope} />

      <PillarFAQAccordion faqs={pillar.faqs} />

      <CrossSellCallout items={pillar.crossSell} />

      <section className="border-t border-gold/15 bg-onyx px-6 py-16 sm:px-8 lg:px-12">
        <div className="mx-auto flex max-w-8xl flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
          <div>
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
              Next Pillar
            </span>
            <h3 className="mt-2 font-heading text-2xl font-semibold text-white">
              {nextPillar.heroTitle}
            </h3>
          </div>
          <Link
            href={`/pillars/${nextPillar.slug}`}
            className="group inline-flex items-center gap-2 rounded-md border border-gold/40 px-6 py-3 text-xs font-semibold uppercase tracking-wider text-gold-bright transition-all hover:bg-gold hover:text-onyx"
          >
            Continue
            <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
      </section>
    </>
  );
}
