import { clientLogos, logoStripLabel, metrics, metricsIntro } from "@/config/siteConfig";
import Reveal from "./Reveal";
import Counter from "./Counter";

export default function Metrics() {
  return (
    <section id="results" className="section-padding relative overflow-hidden bg-onyx">
      {/* Deep forest-green tint under an 80% black overlay */}
      <div className="absolute inset-0 bg-forest-900/50" />
      <div className="absolute inset-0 bg-onyx/80" />

      <div className="container-grove relative">
        <Reveal className="mx-auto max-w-2xl text-center">
          <span className="eyebrow">{metricsIntro.eyebrow}</span>
          <h2 className="mt-3 text-3xl text-white sm:text-4xl">{metricsIntro.headline}</h2>
        </Reveal>

        <div className="mt-14 grid grid-cols-2 gap-6 md:grid-cols-4">
          {metrics.map((metric, index) => (
            <Reveal key={metric.id} delayMs={index * 100}>
              <div className="flex h-full flex-col items-center rounded-lg border border-gold/25 bg-onyx-100/60 px-6 py-10 text-center backdrop-blur-sm">
                <span className="text-4xl font-semibold text-white sm:text-5xl">
                  <Counter value={metric.value} prefix={metric.prefix} suffix={metric.suffix} />
                </span>
                <span className="mt-3 text-sm font-medium uppercase tracking-wide text-muted">
                  {metric.label}
                </span>
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal delayMs={200} className="mt-20">
          <p className="text-center text-xs font-semibold uppercase tracking-[0.18em] text-muted">
            {logoStripLabel}
          </p>
          <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-6">
            {clientLogos.map((logo) => (
              <div
                key={logo.id}
                className="flex h-16 items-center justify-center rounded-md border border-gold/20 bg-onyx-100/60 text-xs font-medium text-muted"
              >
                {logo.label}
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
