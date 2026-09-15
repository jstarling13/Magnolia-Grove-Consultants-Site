import { bookingPage } from "@/config/pillarsConfig";
import Reveal from "@/components/Reveal";

export default function HowItWorks() {
  const { steps } = bookingPage.whatHappensNext;

  return (
    <section className="section-padding bg-cream">
      <div className="container-grove">
        <Reveal className="mx-auto max-w-2xl text-center">
          <span className="eyebrow">{bookingPage.whatHappensNext.eyebrow}</span>
          <h2 className="mt-3 text-3xl sm:text-4xl">How an Engagement Works</h2>
        </Reveal>

        <div className="mt-14 grid grid-cols-1 gap-6 sm:grid-cols-3">
          {steps.map((step, index) => (
            <Reveal key={step.step} delayMs={index * 100}>
              <div className="h-full rounded-lg border border-gold/25 bg-cream-100/70 p-8 shadow-card">
                <span className="font-heading text-3xl font-bold text-gold-dark">{step.step}</span>
                <h3 className="mt-4 font-heading text-lg font-semibold text-onyx">{step.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-onyx/60">{step.detail}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
