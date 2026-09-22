import Image from "next/image";
import { about } from "@/config/siteConfig";
import Reveal from "./Reveal";

export default function About() {
  return (
    <section id="about" className="relative overflow-hidden bg-cream py-24 sm:py-32">
      <Image
        src="/images/hero-aerial-map.webp"
        alt="High-contrast aerial night map of a district with illuminated roads"
        fill
        sizes="100vw"
        className="object-cover object-center"
      />
      {/* 80% dark overlay for seamless readability */}
      <div className="absolute inset-0 bg-cream/80" />
      <div className="absolute inset-0 bg-gradient-to-r from-cream via-cream/70 to-cream/40" />

      <div className="container-grove relative px-6 sm:px-8 lg:px-12">
        <Reveal className="max-w-2xl text-left">
          <span className="eyebrow">{about.eyebrow}</span>
          <h2 className="mt-3 text-4xl sm:text-5xl">{about.headline}</h2>
          <p className="mt-5 text-base leading-relaxed text-onyx/80 sm:text-lg">{about.body}</p>

          <ul className="mt-8 flex flex-col gap-4">
            {about.bullets.map((bullet) => (
              <li key={bullet} className="flex items-start gap-3 text-sm text-onyx sm:text-base">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-gold-bright" />
                <span>{bullet}</span>
              </li>
            ))}
          </ul>
        </Reveal>
      </div>
    </section>
  );
}
