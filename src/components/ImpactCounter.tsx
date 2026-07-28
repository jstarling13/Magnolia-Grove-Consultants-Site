import { metrics } from "@/config/siteConfig";
import Reveal from "./Reveal";
import Counter from "./Counter";

export default function ImpactCounter() {
  return (
    <section className="border-y border-gold/15 bg-onyx-200 px-6 py-14 sm:px-8 lg:px-12">
      <div className="container-grove">
        <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
          {metrics.map((metric, index) => (
            <Reveal key={metric.id} delayMs={index * 100}>
              <div className="flex flex-col items-center text-center">
                <span className="text-3xl font-semibold text-white sm:text-4xl">
                  <Counter value={metric.value} prefix={metric.prefix} suffix={metric.suffix} />
                </span>
                <span className="mt-2 text-xs font-medium uppercase tracking-wide text-muted sm:text-sm">
                  {metric.label}
                </span>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
