import Image from "next/image";
import { teamSection } from "@/config/aboutConfig";
import Reveal from "@/components/Reveal";

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function MemberAvatar({ member }: { member: (typeof teamSection.members)[number] }) {
  if (member.photo) {
    return (
      <div className="relative h-28 w-28 shrink-0 overflow-hidden rounded-full border border-gold/40 sm:h-32 sm:w-32">
        <Image
          src={member.photo}
          alt={member.photoAlt ?? member.name}
          fill
          sizes="128px"
          className="object-cover"
        />
      </div>
    );
  }
  return (
    <div className="flex h-28 w-28 shrink-0 items-center justify-center rounded-full border border-gold/40 bg-cream font-heading text-3xl font-bold text-gold-dark sm:h-32 sm:w-32">
      {getInitials(member.name)}
    </div>
  );
}

export default function LeadershipTeam() {
  const isSingle = teamSection.members.length === 1;

  return (
    <section className="bg-cream-100 px-6 py-20 sm:px-8 lg:px-12 lg:py-28">
      <div className="mx-auto max-w-6xl">
        <Reveal className="mx-auto max-w-2xl text-center">
          <span className="eyebrow">{teamSection.eyebrow}</span>
          <h2 className="mt-3 text-4xl sm:text-5xl">{teamSection.headline}</h2>
          <p className="mt-4 text-base leading-relaxed text-onyx/60 sm:text-lg">
            {teamSection.intro}
          </p>
        </Reveal>

        {isSingle ? (
          <Reveal className="mx-auto mt-14 max-w-3xl">
            {teamSection.members.map((member) => (
              <div
                key={member.name}
                className="flex flex-col items-center gap-6 rounded-lg border border-gold/25 bg-cream/70 p-8 text-center backdrop-blur-sm sm:flex-row sm:items-start sm:text-left"
              >
                <MemberAvatar member={member} />
                <div>
                  <h3 className="font-heading text-xl font-semibold text-onyx">{member.name}</h3>
                  <span className="mt-1 block text-xs font-semibold uppercase tracking-[0.16em] text-gold-dark">
                    {member.role}
                  </span>
                  <p className="mt-4 text-base leading-relaxed text-onyx/60 sm:text-base">
                    {member.bio}
                  </p>
                </div>
              </div>
            ))}
          </Reveal>
        ) : (
          <div className="mt-14 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {teamSection.members.map((member, index) => (
              <Reveal key={member.name} delayMs={index * 100}>
                <div className="flex h-full flex-col items-center rounded-lg border border-gold/25 bg-cream/70 p-8 text-center shadow-card backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:border-gold/50 hover:shadow-[0_16px_40px_-12px_rgba(197,160,89,0.35)]">
                  <MemberAvatar member={member} />
                  <h3 className="mt-5 font-heading text-xl font-semibold text-onyx">
                    {member.name}
                  </h3>
                  <span className="mt-1 text-xs font-semibold uppercase tracking-[0.16em] text-gold-dark">
                    {member.role}
                  </span>
                  <p className="mt-4 text-base leading-relaxed text-onyx/60">{member.bio}</p>
                </div>
              </Reveal>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
