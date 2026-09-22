import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Merchandise | Magnolia Grove Consultants",
  description: "Magnolia Grove Consultants merchandise — coming soon.",
};

export default function MerchandisePage() {
  return (
    <section className="flex min-h-[70vh] flex-col items-center justify-center bg-onyx px-6 text-center">
      <span className="eyebrow">Merchandise</span>
      <h1 className="mt-3 text-5xl uppercase text-white sm:text-6xl">Coming Soon</h1>
      <p className="mt-5 max-w-md text-base leading-relaxed text-muted-light">
        Our merchandise store is on its way. Check back shortly.
      </p>
    </section>
  );
}
