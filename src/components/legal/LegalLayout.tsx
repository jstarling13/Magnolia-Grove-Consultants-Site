import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export interface LegalSection {
  id: string;
  label: string;
}

interface LegalLayoutProps {
  title: string;
  lastUpdated: string;
  sections: LegalSection[];
  children: React.ReactNode;
}

export default function LegalLayout({ title, lastUpdated, sections, children }: LegalLayoutProps) {
  return (
    <main className="bg-cream px-6 py-16 sm:px-8 lg:px-12 lg:py-20">
      <div className="mx-auto max-w-6xl">
        <Link
          href="/"
          className="group inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-gold-dark transition-colors hover:text-onyx"
        >
          <ArrowLeft size={14} className="transition-transform group-hover:-translate-x-1" />
          Return to Home
        </Link>

        <div className="mt-8">
          <span className="eyebrow">Legal</span>
          <h1 className="mt-3 text-3xl sm:text-4xl">{title}</h1>
          <p className="mt-3 text-sm text-onyx/60">Last updated: {lastUpdated}</p>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-10 lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-16">
          <nav
            aria-label="Table of contents"
            className="hidden lg:sticky lg:top-28 lg:block lg:self-start"
          >
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-onyx/60">
              On This Page
            </span>
            <ul className="mt-4 flex flex-col gap-3 border-l border-gold/20 pl-4">
              {sections.map((section) => (
                <li key={section.id}>
                  <a
                    href={`#${section.id}`}
                    className="text-sm text-onyx/80 transition-colors hover:text-gold-dark"
                  >
                    {section.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <div className="min-w-0 max-w-3xl rounded-lg border border-gold/15 bg-cream-200 p-8 sm:p-10">
            {children}
          </div>
        </div>
      </div>
    </main>
  );
}
