import type { StatItem } from "@/types";
import Counter from "../Counter";

interface NoirStatStripProps {
  stats: StatItem[];
}

export default function NoirStatStrip({ stats }: NoirStatStripProps) {
  return (
    <section className="border-y border-gold/15 bg-onyx-100">
      <div className="mx-auto grid max-w-8xl grid-cols-2 divide-y divide-gold/15 sm:grid-cols-4 sm:divide-x sm:divide-y-0">
        {stats.map((stat) => (
          <div
            key={stat.id}
            className="flex flex-col items-center justify-center gap-2 px-6 py-10 text-center"
          >
            <span className="font-heading text-3xl font-bold text-white sm:text-4xl">
              {stat.raw ?? (
                <Counter
                  value={stat.value ?? 0}
                  prefix={stat.prefix ?? ""}
                  suffix={stat.suffix ?? ""}
                />
              )}
            </span>
            <span className="text-xs font-medium uppercase tracking-wide text-muted">
              {stat.label}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
