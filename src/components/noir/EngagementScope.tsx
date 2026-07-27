import { Clock } from "lucide-react";
import type { EngagementOption } from "@/types";

interface EngagementScopeProps {
  options: EngagementOption[];
}

export default function EngagementScope({ options }: EngagementScopeProps) {
  return (
    <section className="border-t border-gold/15 bg-onyx-200 px-6 py-16 sm:px-8 lg:px-12 lg:py-20">
      <div className="mx-auto max-w-8xl">
        <span className="eyebrow">Timeline & Engagement Scope</span>
        <h2 className="mt-3 text-2xl text-white sm:text-3xl">Typical Flight Lengths</h2>

        <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {options.map((option) => (
            <div
              key={option.label}
              className="flex flex-col items-start gap-3 rounded-lg border border-gold/25 bg-onyx p-6"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-md border border-gold/40 text-gold-bright">
                <Clock size={18} strokeWidth={1.75} />
              </div>
              <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
                {option.label}
              </span>
              <span className="font-heading text-2xl font-bold text-white">{option.duration}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
