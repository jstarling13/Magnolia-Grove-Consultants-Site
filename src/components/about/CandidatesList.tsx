import { candidatesSection } from "@/config/aboutConfig";
import Reveal from "@/components/Reveal";

export default function CandidatesList() {
  const { clients } = candidatesSection;

  return (
    <section className="border-t border-gold/15 bg-onyx-100 px-6 py-20 sm:px-8 lg:px-12 lg:py-28">
      <div className="mx-auto max-w-4xl text-center">
        <Reveal>
          <span className="eyebrow">{candidatesSection.eyebrow}</span>
          <h2 className="mt-3 text-3xl sm:text-4xl">{candidatesSection.headline}</h2>

          {clients.length > 0 ? (
            <div className="mt-10 flex flex-wrap items-center justify-center gap-x-8 gap-y-4">
              {clients.map((client) => (
                <span
                  key={client}
                  className="text-sm font-semibold uppercase tracking-[0.14em] text-muted-light"
                >
                  {client}
                </span>
              ))}
            </div>
          ) : (
            <p className="mx-auto mt-6 max-w-lg rounded-lg border border-dashed border-gold/25 px-6 py-5 text-sm leading-relaxed text-muted">
              {candidatesSection.note}
            </p>
          )}
        </Reveal>
      </div>
    </section>
  );
}
