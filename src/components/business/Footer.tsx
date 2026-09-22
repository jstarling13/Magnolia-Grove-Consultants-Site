import Image from "next/image";
import Link from "next/link";
import { businessBrand, businessContactDetails, businessFooter } from "@/config/businessConfig";
import { businessPillars } from "@/config/businessPillarsConfig";

export default function BusinessFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-gold/40 bg-onyx text-muted">
      <div className="container-grove px-6 py-16 sm:px-8 lg:px-12">
        <div className="grid grid-cols-1 items-start gap-10 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-[1.3fr_0.85fr_0.85fr] lg:gap-8">
          <div>
            <Image
              src={businessBrand.logoImage}
              alt={businessBrand.logoImageAlt}
              width={342}
              height={272}
              className="h-10 w-auto"
            />
            <p className="mt-4 max-w-xs text-sm leading-relaxed">{businessFooter.description}</p>
          </div>

          {businessFooter.columns.map((column) => (
            <div key={column.title}>
              <h4 className="font-heading text-sm font-semibold uppercase tracking-wide text-white">
                {column.title}
              </h4>
              <ul className="mt-4 flex flex-col gap-3">
                {column.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm transition-colors hover:text-gold-bright motion-reduce:transition-none"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <div>
            <h4 className="font-heading text-sm font-semibold uppercase tracking-wide text-white">
              4 Pillars
            </h4>
            <ul className="mt-4 flex flex-col gap-3">
              <li>
                <Link
                  href="/business/pillars"
                  className="text-sm transition-colors hover:text-gold-bright motion-reduce:transition-none"
                >
                  All Pillars
                </Link>
              </li>
              {businessPillars.map((pillar) => (
                <li key={pillar.slug}>
                  <Link
                    href={`/business/pillars/${pillar.slug}`}
                    className="text-sm transition-colors hover:text-gold-bright motion-reduce:transition-none"
                  >
                    {pillar.navLabel}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-heading text-sm font-semibold uppercase tracking-wide text-white">
              Contact
            </h4>
            <ul className="mt-4 flex flex-col gap-3">
              {businessContactDetails.map((detail) => (
                <li key={detail.label} className="text-sm leading-relaxed">
                  {detail.href ? (
                    <a
                      href={detail.href}
                      className="transition-colors hover:text-gold-bright motion-reduce:transition-none"
                    >
                      {detail.value}
                    </a>
                  ) : (
                    detail.value
                  )}
                </li>
              ))}
              <li>
                <Link
                  href="/business/contact"
                  className="text-sm font-semibold text-gold-bright transition-colors hover:text-white motion-reduce:transition-none"
                >
                  Schedule a Consultation →
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-14 flex flex-col items-center justify-between gap-4 border-t border-gold/15 pt-8 text-xs text-muted sm:flex-row">
          <p>
            &copy; {year} {businessFooter.copyrightName}. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            <Link href="/privacy" className="transition-colors hover:text-gold-bright">
              Privacy Policy
            </Link>
            <Link href="/terms" className="transition-colors hover:text-gold-bright">
              Terms of Service
            </Link>
            <p>{businessFooter.legalDisclaimer}</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
