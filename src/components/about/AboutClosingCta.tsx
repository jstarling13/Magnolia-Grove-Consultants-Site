import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { aboutClosingCta } from "@/config/aboutConfig";
import Reveal from "@/components/Reveal";

export default function AboutClosingCta() {
  return (
    <section className="border-t border-gold/15 bg-onyx px-6 py-20 text-center sm:px-8 lg:px-12 lg:py-28">
      <Reveal className="mx-auto max-w-2xl">
        <h2 className="text-3xl sm:text-4xl">{aboutClosingCta.headline}</h2>
        <p className="mt-4 text-base leading-relaxed text-muted sm:text-lg">
          {aboutClosingCta.subtext}
        </p>
        <Link
          href={aboutClosingCta.ctaHref}
          className="group mt-8 inline-flex items-center gap-2 rounded-md bg-gold px-8 py-4 text-sm font-semibold uppercase tracking-wider text-onyx transition-all hover:bg-gold-bright"
        >
          {aboutClosingCta.ctaLabel}
          <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
        </Link>
      </Reveal>
    </section>
  );
}
