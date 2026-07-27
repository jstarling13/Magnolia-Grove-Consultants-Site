import Image from "next/image";
import { teamSection } from "@/config/aboutConfig";
import Reveal from "@/components/Reveal";

function getInitials(name: string) {
  return name
    .replace(/[[\]]/g, "")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export default function LeadershipTeam() {
  return (
    <section className="bg-onyx-100 px-6 py-20 sm:px-8 lg:px-12 lg:py-28">
      <div className="mx-auto max-w-6xl">
        <Reveal className="mx-auto max-w-2xl text-center">
          <span className="eyebrow">{teamSection.eyebrow}</span>
          <h2 className="mt-3 text-3xl sm:text-4xl">{teamSection.headline}</h2>
          <p className="mt-4 text-base leading-relaxed text-muted sm:text-lg">
            {teamSection.intro}
          </p>
        </Reveal>

        <div className="mt-14 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {teamSection.members.map((member, index) => (
            <Reveal key={member.name} delayMs={index * 100}>
              <div className="flex h-full flex-col items-center rounded-lg border border-gold/25 bg-onyx/70 p-8 text-center backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:border-gold/50 hover:shadow-[0_16px_40px_-12px_rgba(197,160,89,0.35)]">
                {member.photo ? (
                  <div className="relative h-24 w-24 overflow-hidden rounded-full border border-gold/40">
                    <Image
                      src={member.photo}
                      alt={member.photoAlt ?? member.name}
                      fill
                      sizes="96px"
                      className="object-cover"
                    />
                  </div>
                ) : (
                  <div className="flex h-24 w-24 items-center justify-center rounded-full border border-gold/40 bg-onyx font-heading text-2xl font-bold text-gold-bright">
                    {getInitials(member.name)}
                  </div>
                )}
                <h3 className="mt-5 font-heading text-lg font-semibold text-white">
                  {member.name}
                </h3>
                <span className="mt-1 text-xs font-semibold uppercase tracking-[0.16em] text-gold-bright">
                  {member.role}
                </span>
                <p className="mt-4 text-sm leading-relaxed text-muted">{member.bio}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
