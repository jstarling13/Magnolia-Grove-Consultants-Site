import type { Metadata } from "next";
import PillarHero from "@/components/noir/PillarHero";
import StrategySessionForm from "@/components/noir/StrategySessionForm";
import BookingTimeline from "@/components/noir/BookingTimeline";
import PillarFAQAccordion from "@/components/noir/PillarFAQAccordion";
import { bookingPage } from "@/config/pillarsConfig";

export const metadata: Metadata = {
  title: "Strategy Session | Magnolia Grove Consultants",
  description: bookingPage.heroSubheadline,
};

export default function BookingPage() {
  return (
    <>
      <PillarHero
        title={bookingPage.heroTitle}
        subheadline={bookingPage.heroSubheadline}
        image={bookingPage.heroImage}
        imageAlt={bookingPage.heroImageAlt}
        priority
      />

      <BookingTimeline />

      <section className="bg-onyx-100 px-6 py-20 sm:px-8 lg:px-12 lg:py-28">
        <div className="mx-auto max-w-3xl">
          <p className="mb-10 text-left text-sm leading-relaxed text-muted">
            {bookingPage.formIntro}
          </p>
          <StrategySessionForm />
        </div>
      </section>

      <PillarFAQAccordion faqs={bookingPage.faqs} />
    </>
  );
}
