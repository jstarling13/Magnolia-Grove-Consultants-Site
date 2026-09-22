import Reveal from "./Reveal";

const oldWayVendors = ["Field Team", "Ad Agency", "Print Shop", "Web Developer", "PR Firm"];
const pillars = ["Field", "Digital", "Print", "Web"];

export default function VendorComparison() {
  return (
    <section className="border-t border-gold/15 bg-cream-100 px-6 py-20 sm:px-8 lg:px-12 lg:py-28">
      <div className="container-grove">
        <Reveal className="mx-auto max-w-2xl text-center">
          <span className="eyebrow">The Difference</span>
          <h2 className="mt-3 text-4xl sm:text-5xl">One Team Instead of Five</h2>
        </Reveal>

        <div className="mt-14 grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-6">
          <Reveal>
            <div className="flex h-full flex-col rounded-lg border border-onyx/10 bg-cream/40 p-8">
              <span className="text-xs font-semibold uppercase tracking-[0.16em] text-onyx/60">
                The Old Way
              </span>
              <div className="mt-6 flex flex-1 flex-col">
                {oldWayVendors.map((vendor) => (
                  <div
                    key={vendor}
                    className="flex items-center justify-between border-b border-dashed border-onyx/15 py-3 first:pt-0 last:border-b-0"
                  >
                    <span className="text-sm text-onyx/80">{vendor}</span>
                    <span className="text-xs uppercase tracking-wide text-onyx/70">
                      Separate Invoice
                    </span>
                  </div>
                ))}
              </div>
              <p className="mt-6 text-base leading-relaxed text-onyx/60">
                5 vendors. 5 invoices. 5 points of failure — and nobody owns the whole picture.
              </p>
            </div>
          </Reveal>

          <Reveal delayMs={100}>
            <div className="flex h-full flex-col rounded-lg border border-gold/40 bg-cream/70 p-8 shadow-[0_16px_40px_-12px_rgba(197,160,89,0.25)]">
              <span className="text-xs font-semibold uppercase tracking-[0.16em] text-gold-dark">
                The Magnolia Grove Way
              </span>
              <div className="mt-6 flex flex-1 flex-col items-center justify-center rounded-lg border border-gold/30 bg-cream px-6 py-10 text-center">
                <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2">
                  {pillars.map((pillar, index) => (
                    <span key={pillar} className="flex items-center gap-3">
                      <span className="text-lg font-semibold text-onyx sm:text-xl">{pillar}</span>
                      {index < pillars.length - 1 && (
                        <span className="text-lg text-gold-dark">+</span>
                      )}
                    </span>
                  ))}
                </div>
                <span className="mt-4 text-xs font-semibold uppercase tracking-[0.16em] text-gold-dark">
                  One Invoice. One Team.
                </span>
              </div>
              <p className="mt-6 text-base leading-relaxed text-onyx">
                1 team. 1 point of contact. Everything connected — so nothing falls through the
                cracks.
              </p>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
