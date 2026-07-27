import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { pillars } from "@/config/pillarsConfig";

export default function HubPillarGrid() {
  return (
    <section className="bg-onyx-100 px-6 py-20 sm:px-8 lg:px-12 lg:py-28">
      <div className="mx-auto grid max-w-8xl grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        {pillars.map((pillar) => {
          const Icon = pillar.icon;
          return (
            <Link
              key={pillar.slug}
              href={`/pillars/${pillar.slug}`}
              className="group flex h-full flex-col rounded-lg border border-gold/25 bg-onyx/85 p-8 transition-all hover:border-gold/70 hover:bg-onyx"
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-md border border-gold/40 bg-gold/10 text-gold-bright transition-colors group-hover:bg-gold group-hover:text-onyx">
                <Icon size={24} strokeWidth={1.75} />
              </div>

              <h2 className="mt-6 font-heading text-lg font-semibold leading-snug text-white">
                {pillar.heroTitle}
              </h2>
              <p className="mt-3 flex-1 text-left text-sm leading-relaxed text-muted">
                {pillar.heroSubheadline}
              </p>

              <span className="mt-6 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-gold-bright">
                {pillar.ctaLabel}
                <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
