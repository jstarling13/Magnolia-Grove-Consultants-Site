import type { Metadata } from "next";
import { ShieldCheck } from "lucide-react";
import PaymentForm from "@/components/PaymentForm";
import Reveal from "@/components/Reveal";

export const metadata: Metadata = {
  title: "Pay an Invoice | Magnolia Grove Consultants",
  description: "Securely pay an invoice or make a payment to Magnolia Grove Consultants.",
  robots: { index: false, follow: false },
};

export default function PaymentPage() {
  return (
    <section className="section-padding bg-cream-100">
      <div className="container-grove grid grid-cols-1 gap-14 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-20">
        <Reveal>
          <span className="eyebrow">Client Payments</span>
          <h1 className="mt-3 text-4xl sm:text-5xl">Pay an Invoice</h1>
          <p className="mt-4 max-w-md text-base leading-relaxed text-onyx/60">
            Existing clients can settle an invoice or make a payment directly below. Enter the
            amount and a note referencing your invoice, and you&apos;ll be taken to a secure
            checkout page to complete payment.
          </p>

          <div className="mt-10 flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-gold/40 bg-gold/10 text-gold-dark">
              <ShieldCheck size={18} />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-onyx/60">
                Secure Checkout
              </p>
              <p className="mt-1 max-w-sm text-sm text-onyx">
                Payments are processed by Square. Card details are entered on Square&apos;s secure
                checkout page and never pass through our servers.
              </p>
            </div>
          </div>
        </Reveal>

        <Reveal delayMs={100}>
          <PaymentForm />
        </Reveal>
      </div>
    </section>
  );
}
