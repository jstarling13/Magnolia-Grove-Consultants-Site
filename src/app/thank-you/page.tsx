import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, CalendarClock, ArrowRight } from "lucide-react";
import { leadForm } from "@/config/siteConfig";
import { bookingPage } from "@/config/pillarsConfig";
import CreateAccountPrompt from "@/components/CreateAccountPrompt";

export const metadata: Metadata = {
  title: "Thank You | Magnolia Grove Consultants",
  robots: { index: false, follow: true },
};

interface ThankYouPageProps {
  searchParams: Promise<{ source?: string; email?: string }>;
}

const copyBySource = {
  lead: {
    eyebrow: leadForm.successTitle,
    headline: "Your Message Is in the War Room.",
    message: leadForm.successMessage,
  },
  strategy: {
    eyebrow: bookingPage.successTitle,
    headline: "Your Strategy Session Is Locked In.",
    message: bookingPage.successMessage,
  },
  default: {
    eyebrow: "Submission Received",
    headline: "Thank You.",
    message: "Your submission has been received. Our team will follow up shortly.",
  },
} as const;

export default async function ThankYouPage({ searchParams }: ThankYouPageProps) {
  const { source, email } = await searchParams;
  const copy =
    source === "lead" || source === "strategy" ? copyBySource[source] : copyBySource.default;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-cream px-6 py-24 text-center">
      <CheckCircle2 size={48} strokeWidth={1.5} className="text-gold-dark" />
      <span className="eyebrow mt-6">{copy.eyebrow}</span>
      <h1 className="mt-4 max-w-2xl text-4xl font-semibold text-onyx sm:text-5xl">
        {copy.headline}
      </h1>
      <p className="mt-4 max-w-md text-base leading-relaxed text-onyx/80 sm:text-base">
        {copy.message}
      </p>

      <div className="mt-8 flex max-w-md items-start gap-3 rounded-lg border border-gold/20 bg-cream-200 px-5 py-4 text-left shadow-card">
        <CalendarClock size={18} className="mt-0.5 shrink-0 text-gold-dark" />
        <p className="text-xs leading-relaxed text-onyx/60">
          A calendar invite with your advisory call details will arrive in your inbox shortly.
        </p>
      </div>

      <CreateAccountPrompt email={email} />

      <div className="mt-10 flex flex-col gap-4 sm:flex-row">
        <Link
          href="/case-studies"
          className="group inline-flex items-center justify-center gap-2 rounded-full bg-gold px-8 py-3 text-sm font-semibold uppercase tracking-wide text-onyx transition hover:bg-gold-bright"
        >
          View Our Track Record
          <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
        </Link>
        <Link
          href="/"
          className="inline-flex items-center justify-center gap-2 rounded-full border border-gold/40 px-8 py-3 text-sm font-semibold uppercase tracking-wide text-gold-dark transition hover:bg-gold hover:text-onyx"
        >
          Return to War Room
        </Link>
      </div>
    </main>
  );
}
