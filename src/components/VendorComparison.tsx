import { Users, Megaphone, Printer, Code, MessageSquare, Target, Globe } from "lucide-react";
import Reveal from "./Reveal";

const oldWayVendors = [
  { icon: Users, label: "Field Team" },
  { icon: Megaphone, label: "Ad Agency" },
  { icon: Printer, label: "Print Shop" },
  { icon: Code, label: "Web Developer" },
  { icon: MessageSquare, label: "PR Firm" },
];

const pillars = [
  { icon: Target, label: "Field" },
  { icon: Megaphone, label: "Digital" },
  { icon: Printer, label: "Print" },
  { icon: Globe, label: "Web" },
];

export default function VendorComparison() {
  return (
    <section className="border-t border-gold/15 bg-onyx-100 px-6 py-20 sm:px-8 lg:px-12 lg:py-28">
      <div className="container-grove">
        <Reveal className="mx-auto max-w-2xl text-center">
          <span className="eyebrow">The Difference</span>
          <h2 className="mt-3 text-3xl sm:text-4xl">One Team Instead of Five</h2>
        </Reveal>

        <div className="mt-14 grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-6">
          <Reveal>
            <div className="flex h-full flex-col rounded-lg border border-white/10 bg-onyx/40 p-8">
              <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
                The Old Way
              </span>
              <div className="mt-6 grid flex-1 grid-cols-2 gap-3 sm:grid-cols-3">
                {oldWayVendors.map((vendor, index) => {
                  const Icon = vendor.icon;
                  return (
                    <div
                      key={vendor.label}
                      className={`flex flex-col items-center gap-2 rounded-lg border border-dashed border-white/15 bg-onyx/50 p-4 text-center opacity-70 ${
                        index === 4 ? "col-span-2 sm:col-span-1" : ""
                      }`}
                    >
                      <Icon size={20} strokeWidth={1.5} className="text-muted" />
                      <span className="text-xs text-muted-light">{vendor.label}</span>
                    </div>
                  );
                })}
              </div>
              <p className="mt-6 text-sm leading-relaxed text-muted">
                5 vendors. 5 invoices. 5 points of failure — and nobody owns the whole picture.
              </p>
            </div>
          </Reveal>

          <Reveal delayMs={100}>
            <div className="flex h-full flex-col rounded-lg border border-gold/40 bg-onyx/70 p-8 shadow-[0_16px_40px_-12px_rgba(197,160,89,0.25)]">
              <span className="text-xs font-semibold uppercase tracking-[0.16em] text-gold-bright">
                The Magnolia Grove Way
              </span>
              <div className="mt-6 flex flex-1 items-center justify-center rounded-lg border border-gold/30 bg-onyx p-6">
                <div className="grid grid-cols-4 gap-4">
                  {pillars.map((pillar) => {
                    const Icon = pillar.icon;
                    return (
                      <div key={pillar.label} className="flex flex-col items-center gap-2">
                        <div className="flex h-11 w-11 items-center justify-center rounded-md border border-gold/40 bg-onyx-200 text-gold-bright">
                          <Icon size={18} strokeWidth={1.75} />
                        </div>
                        <span className="text-xs text-muted-light">{pillar.label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
              <p className="mt-6 text-sm leading-relaxed text-white">
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
