import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { servicePillars, servicesIntro } from "@/config/siteConfig";
import Reveal from "./Reveal";

export default function Services() {
  return (
    <section id="services" className="section-padding bg-cream">
      <div className="container-grove">
        <Reveal className="mx-auto max-w-2xl text-center">
          <span className="eyebrow">{servicesIntro.eyebrow}</span>
          <h2 className="mt-3 text-3xl sm:text-4xl">{servicesIntro.headline}</h2>
          <p className="mt-4 text-base leading-relaxed text-onyx/60 sm:text-lg">
            {servicesIntro.subtitle}
          </p>
        </Reveal>

        <div className="mt-16 grid grid-cols-1 gap-6 sm:grid-cols-2">
          {servicePillars.map((pillar, index) => {
            const Icon = pillar.icon;
            return (
              <Reveal key={pillar.id} delayMs={index * 100} variant="scale-up">
                <div
                  id={pillar.id}
                  className="group flex h-full flex-col overflow-hidden rounded-lg border border-gold/25 bg-cream-100/85 shadow-card transition-all duration-300 hover:-translate-y-1.5 hover:rotate-[0.3deg] hover:border-gold/60 hover:shadow-[0_16px_40px_-8px_rgba(197,160,89,0.3)]"
                >
                  <div className="relative h-40 w-full overflow-hidden">
                    <Image
                      src={pillar.image}
                      alt={pillar.imageAlt}
                      fill
                      priority={index === 0}
                      sizes="(min-width: 640px) 50vw, 100vw"
                      className="object-cover object-center transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-cream/70" />
                    <div className="absolute inset-0 bg-gradient-to-t from-cream via-cream/10 to-transparent" />
                    <div className="absolute bottom-4 left-4 flex h-12 w-12 items-center justify-center rounded-md border border-gold/50 bg-cream/80 text-gold-dark">
                      <Icon size={22} strokeWidth={1.75} />
                    </div>
                  </div>

                  <div className="flex flex-1 flex-col p-8">
                    <h3 className="text-xl text-onyx">{pillar.title}</h3>
                    <p className="mt-3 text-sm leading-relaxed text-onyx/60">
                      {pillar.description}
                    </p>

                    <ul className="mt-6 flex flex-1 flex-col gap-3 border-t border-gold/15 pt-6">
                      {pillar.subItems.map((item) => (
                        <li key={item} className="flex items-start gap-3 text-sm text-onyx/80">
                          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-gold-bright" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>

                    <Link
                      href={`/pillars/${pillar.pillarSlug}`}
                      className="group/link mt-6 inline-flex items-center gap-2 text-sm font-semibold text-gold-dark transition-colors hover:text-onyx"
                    >
                      View Pillar Details
                      <ArrowRight
                        size={16}
                        className="transition-transform group-hover/link:translate-x-1"
                      />
                    </Link>
                  </div>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
