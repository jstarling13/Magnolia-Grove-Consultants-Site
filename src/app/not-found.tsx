import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-cream px-6 text-center">
      <span className="eyebrow">404 // Page Not Found</span>
      <h1 className="mt-4 max-w-2xl text-4xl font-semibold text-onyx sm:text-5xl">
        This page has left the war room.
      </h1>
      <p className="mt-4 max-w-md text-sm text-onyx/80">
        The page you&apos;re looking for doesn&apos;t exist or has moved. Let&apos;s get you back on
        strategy.
      </p>
      <Link
        href="/"
        className="mt-10 inline-flex items-center gap-2 rounded-full bg-gold px-8 py-3 text-sm font-semibold uppercase tracking-wide text-onyx transition hover:bg-gold-bright"
      >
        Return to War Room →
      </Link>
    </main>
  );
}
