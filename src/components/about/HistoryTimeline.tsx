import { historySection } from "@/config/aboutConfig";
import Reveal from "@/components/Reveal";

export default function HistoryTimeline() {
  return (
    <section className="bg-cream-100 px-6 py-20 sm:px-8 lg:px-12 lg:py-28">
      <div className="mx-auto max-w-4xl">
        <Reveal className="text-left">
          <span className="eyebrow">{historySection.eyebrow}</span>
          <h2 className="mt-3 text-4xl sm:text-5xl">{historySection.headline}</h2>
          <p className="mt-5 text-base leading-relaxed text-onyx/80 sm:text-lg">
            {historySection.intro}
          </p>
        </Reveal>

        <div className="mt-16 flex flex-col gap-10 border-l border-gold/25 pl-8 sm:pl-10">
          {historySection.milestones.map((milestone, index) => (
            <Reveal key={`${milestone.year}-${index}`} delayMs={index * 100} className="relative">
              <span className="absolute -left-[calc(2rem+5px)] top-1 h-2.5 w-2.5 rounded-full bg-gold-bright sm:-left-[calc(2.5rem+5px)]" />
              <span className="font-heading text-sm font-bold tracking-wider text-gold-dark">
                {milestone.year}
              </span>
              <h3 className="mt-2 font-heading text-xl font-semibold text-onyx">
                {milestone.title}
              </h3>
              <p className="mt-2 text-base leading-relaxed text-onyx/60 sm:text-base">
                {milestone.description}
              </p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
