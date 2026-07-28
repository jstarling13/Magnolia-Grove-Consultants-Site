import { ShieldCheck, Phone, FileText } from "lucide-react";
import { bookingPage } from "@/config/pillarsConfig";

const icons = [ShieldCheck, Phone, FileText];

export default function BookingTimeline() {
  const { whatHappensNext } = bookingPage;

  return (
    <section className="border-b border-gold/15 bg-onyx px-6 py-16 sm:px-8 lg:px-12 lg:py-20">
      <div className="mx-auto max-w-6xl">
        <span className="eyebrow">{whatHappensNext.eyebrow}</span>
        <h2 className="mt-3 text-2xl text-white sm:text-3xl">From First Click to Strategy Call</h2>

        <div className="mt-12 hidden items-center sm:flex">
          {whatHappensNext.steps.map((step, index) => {
            const Icon = icons[index] ?? ShieldCheck;
            return (
              <div key={step.step} className="flex flex-1 items-center last:flex-none">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-gold/40 bg-onyx-200 text-gold-bright">
                  <Icon size={22} strokeWidth={1.75} />
                </div>
                {index < whatHappensNext.steps.length - 1 && (
                  <div className="mx-2 h-px flex-1 bg-gold/20" />
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-6 grid grid-cols-1 gap-8 sm:mt-6 sm:grid-cols-3 sm:gap-6">
          {whatHappensNext.steps.map((step, index) => {
            const Icon = icons[index] ?? ShieldCheck;
            return (
              <div key={step.step} className="flex flex-col items-start">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-gold/40 bg-onyx-200 text-gold-bright sm:hidden">
                  <Icon size={22} strokeWidth={1.75} />
                </div>
                <span className="mt-4 font-heading text-xs font-bold tracking-wider text-gold-bright sm:mt-0">
                  {step.step}
                </span>
                <h3 className="mt-2 font-heading text-base font-semibold text-white sm:text-lg">
                  {step.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{step.detail}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
