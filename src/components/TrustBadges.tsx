import { Landmark, Users, HeartHandshake, Building2 } from "lucide-react";
import { trustBadges, trustBadgesLabel } from "@/config/siteConfig";

const icons = {
  campaigns: Landmark,
  pacs: Users,
  nonprofits: HeartHandshake,
  enterprise: Building2,
} as const;

export default function TrustBadges() {
  return (
    <section className="border-y border-gold/15 bg-onyx-200 px-6 py-8 sm:px-8 lg:px-12">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-center gap-5 sm:flex-row sm:justify-between">
        <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
          {trustBadgesLabel}
        </span>
        <div className="flex flex-wrap items-center justify-center gap-3">
          {trustBadges.map((badge) => {
            const Icon = icons[badge.id as keyof typeof icons];
            return (
              <span
                key={badge.id}
                className="inline-flex items-center gap-2 rounded-full border border-gold/25 bg-onyx px-4 py-2 text-xs font-semibold uppercase tracking-wide text-muted-light"
              >
                <Icon size={14} className="text-gold-bright" />
                {badge.label}
              </span>
            );
          })}
        </div>
      </div>
    </section>
  );
}
