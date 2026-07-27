import { bookingPage } from "@/config/pillarsConfig";

export default function WhatHappensNext() {
  const { whatHappensNext } = bookingPage;

  return (
    <aside className="lg:sticky lg:top-28 lg:self-start">
      <div className="rounded-lg border border-gold/25 bg-onyx-200 p-8">
        <span className="eyebrow">{whatHappensNext.eyebrow}</span>

        <ol className="mt-6 flex flex-col gap-6">
          {whatHappensNext.steps.map((item) => (
            <li key={item.step} className="flex gap-4">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-gold/40 font-heading text-xs font-bold text-gold-bright">
                {item.step}
              </span>
              <div>
                <h3 className="font-heading text-sm font-semibold text-white sm:text-base">
                  {item.title}
                </h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted">{item.detail}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </aside>
  );
}
