import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { teamSection } from "@/config/aboutConfig";
import Reveal from "@/components/Reveal";

export default function Leadership() {
  const ben = teamSection.members[0];

  return (
    <section className="section-padding bg-cream-100">
      <div className="container-grove">
        <Reveal className="mx-auto flex max-w-3xl flex-col items-center gap-8 text-center sm:flex-row sm:items-start sm:text-left">
          <div className="relative h-32 w-32 shrink-0 overflow-hidden rounded-full border border-gold/40 sm:h-36 sm:w-36">
            <Image
              src={ben.photo!}
              alt={ben.photoAlt ?? ben.name}
              fill
              sizes="144px"
              className="object-cover"
            />
          </div>
          <div>
            <span className="eyebrow">Leadership</span>
            <h2 className="mt-3 text-3xl sm:text-4xl">Not Handed Off to an Account Manager.</h2>
            <p className="mt-4 text-base leading-relaxed text-onyx/60">
              Every engagement is led directly by founder and principal{" "}
              <span className="font-semibold text-onyx">{ben.name}</span>, with one team
              coordinating strategy and execution across every channel.
            </p>
            <Link
              href="/about"
              className="group mt-6 inline-flex items-center gap-2 text-sm font-semibold text-gold-dark transition-colors hover:text-onyx"
            >
              Meet the Team
              <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
