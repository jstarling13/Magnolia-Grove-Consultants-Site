import { trustBadges, trustBadgesLabel } from "@/config/siteConfig";

export default function TrustBadges() {
  return (
    <section className="border-y border-gold/15 bg-cream-200 px-6 py-8 sm:px-8 lg:px-12">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-center gap-5 sm:flex-row sm:justify-between">
        <span className="text-xs font-semibold uppercase tracking-[0.16em] text-onyx/60">
          {trustBadgesLabel}
        </span>
        <div className="flex flex-wrap items-center justify-center gap-3">
          {trustBadges.map((badge) => (
            <span
              key={badge.id}
              className="inline-flex items-center rounded-full border border-gold/25 bg-cream px-4 py-2 text-xs font-semibold uppercase tracking-wide text-onyx/80"
            >
              {badge.label}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
