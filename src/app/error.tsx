"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-cream px-6 text-center">
      <span className="eyebrow">Error // Something Went Wrong</span>
      <h1 className="mt-4 max-w-2xl text-4xl font-semibold text-onyx sm:text-5xl">
        We hit an unexpected snag.
      </h1>
      <p className="mt-4 max-w-md text-sm text-onyx/80">
        Our team has been notified. Try again, or head back to the homepage.
      </p>
      <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
        <button
          onClick={reset}
          className="inline-flex items-center gap-2 rounded-full bg-gold px-8 py-3 text-sm font-semibold uppercase tracking-wide text-onyx transition hover:bg-gold-bright"
        >
          Try Again
        </button>
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-full border border-gold px-8 py-3 text-sm font-semibold uppercase tracking-wide text-gold-dark transition hover:bg-gold hover:text-onyx"
        >
          Return Home
        </Link>
      </div>
    </main>
  );
}
