import { valuesSection } from "@/config/aboutConfig";
import Reveal from "@/components/Reveal";

export default function CoreValues() {
  return (
    <section className="bg-cream px-6 py-20 sm:px-8 lg:px-12 lg:py-28">
      <div className="mx-auto max-w-6xl">
        <Reveal className="mx-auto max-w-2xl text-center">
          <span className="eyebrow">{valuesSection.eyebrow}</span>
          <h2 className="mt-3 text-4xl sm:text-5xl">{valuesSection.headline}</h2>
        </Reveal>

        <div className="mt-14 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {valuesSection.items.map((item, index) => (
            <Reveal key={item.title} delayMs={index * 100}>
              <div className="group h-full rounded-lg border border-gold/25 bg-cream-100/70 p-8 shadow-card backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:border-gold/50 hover:shadow-[0_16px_40px_-12px_rgba(197,160,89,0.35)]">
                <span className="font-heading text-3xl font-bold text-gold-dark">
                  0{index + 1}
                </span>
                <h3 className="mt-5 font-heading text-xl font-semibold text-onyx">
                  {item.title}
                </h3>
                <p className="mt-3 text-base leading-relaxed text-onyx/60">{item.description}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
