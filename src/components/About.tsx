import Image from "next/image";
import { Check } from "lucide-react";
import { about } from "@/config/siteConfig";
import Reveal from "./Reveal";

export default function About() {
  return (
    <section id="about" className="relative overflow-hidden bg-onyx py-24 sm:py-32">
      <Image
        src="/images/hero-aerial-map.webp"
        alt="High-contrast aerial night map of a district with illuminated roads"
        fill
        sizes="100vw"
        className="object-cover object-center"
      />
      {/* 80% dark overlay for seamless readability */}
      <div className="absolute inset-0 bg-onyx/80" />
      <div className="absolute inset-0 bg-gradient-to-r from-onyx via-onyx/70 to-onyx/40" />

      <div className="container-grove relative px-6 sm:px-8 lg:px-12">
        <Reveal className="max-w-2xl text-left">
          <span className="eyebrow">{about.eyebrow}</span>
          <h2 className="mt-3 text-3xl sm:text-4xl">{about.headline}</h2>
          <p className="mt-5 text-base leading-relaxed text-muted-light sm:text-lg">
            {about.body}
          </p>

          <ul className="mt-8 flex flex-col gap-4">
            {about.bullets.map((bullet) => (
              <li key={bullet} className="flex items-start gap-3 text-sm text-white sm:text-base">
                <Check size={18} strokeWidth={2.5} className="mt-0.5 shrink-0 text-gold-bright" />
                <span>{bullet}</span>
              </li>
            ))}
          </ul>
        </Reveal>
      </div>
    </section>
  );
}
