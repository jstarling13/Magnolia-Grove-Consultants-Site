import { valuesSection } from "@/config/aboutConfig";
import Reveal from "@/components/Reveal";

export default function CoreValues() {
  return (
    <section className="bg-onyx px-6 py-20 sm:px-8 lg:px-12 lg:py-28">
      <div className="mx-auto max-w-6xl">
        <Reveal className="mx-auto max-w-2xl text-center">
          <span className="eyebrow">{valuesSection.eyebrow}</span>
          <h2 className="mt-3 text-3xl sm:text-4xl">{valuesSection.headline}</h2>
        </Reveal>

        <div className="mt-14 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {valuesSection.items.map((item, index) => {
            const Icon = item.icon;
            return (
              <Reveal key={item.title} delayMs={index * 100}>
                <div className="group h-full rounded-lg border border-gold/25 bg-onyx-100/70 p-8 backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:border-gold/50 hover:shadow-[0_16px_40px_-12px_rgba(197,160,89,0.35)]">
                  <div className="flex h-12 w-12 items-center justify-center rounded-md border border-gold/50 bg-onyx text-gold-bright">
                    <Icon size={22} strokeWidth={1.75} />
                  </div>
                  <h3 className="mt-5 font-heading text-lg font-semibold text-white">
                    {item.title}
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-muted">{item.description}</p>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
