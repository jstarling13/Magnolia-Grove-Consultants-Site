import Image from "next/image";
import Link from "next/link";
import { brand, contactDetails, footer, socialLinks } from "@/config/siteConfig";
import { pillars } from "@/config/pillarsConfig";
import { FOCUS_RING_ON_DARK } from "@/components/global/focusRing";

const LINK = `inline-block rounded py-1.5 text-sm transition-colors hover:text-gold-bright motion-reduce:transition-none ${FOCUS_RING_ON_DARK}`;

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-gold/40 bg-onyx text-muted">
      <div className="container-grove px-6 py-16 sm:px-8 lg:px-12">
        <div className="grid grid-cols-1 items-start gap-10 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-[1.3fr_0.85fr_0.85fr_0.85fr_0.85fr] lg:gap-8">
          <div>
            <Image
              src={brand.logoImage}
              alt={brand.logoImageAlt}
              width={342}
              height={272}
              className="h-10 w-auto"
            />
            <p className="mt-4 max-w-xs text-base leading-relaxed">{footer.description}</p>

            <div className="mt-6 flex gap-2">
              {socialLinks.map((social) => {
                const Icon = social.icon;
                return (
                  <a
                    key={social.id}
                    href={social.href}
                    aria-label={social.label}
                    className={`flex h-11 w-11 items-center justify-center rounded-full border border-gold/30 text-muted transition-colors hover:border-gold-bright hover:text-gold-bright motion-reduce:transition-none ${FOCUS_RING_ON_DARK}`}
                  >
                    <Icon size={16} aria-hidden="true" />
                  </a>
                );
              })}
            </div>
          </div>

          {footer.columns.map((column) => (
            <nav key={column.title} aria-label={column.title}>
              <h2 className="font-heading text-sm font-semibold uppercase tracking-wide text-white">
                {column.title}
              </h2>
              <ul className="mt-3 flex flex-col">
                {column.links.map((link) => (
                  <li key={link.label}>
                    <Link href={link.href} className={LINK}>
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}

          <nav aria-label="4 Pillars">
            <h2 className="font-heading text-sm font-semibold uppercase tracking-wide text-white">
              4 Pillars
            </h2>
            <ul className="mt-3 flex flex-col">
              <li>
                <Link href="/pillars" className={LINK}>
                  All Pillars
                </Link>
              </li>
              {pillars.map((pillar) => (
                <li key={pillar.slug}>
                  <Link href={`/pillars/${pillar.slug}`} className={LINK}>
                    {pillar.navLabel}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div>
            <h2 className="font-heading text-sm font-semibold uppercase tracking-wide text-white">
              Contact
            </h2>
            <ul className="mt-3 flex flex-col gap-1">
              {contactDetails.map((detail) => (
                <li key={detail.label} className="text-base leading-relaxed">
                  {detail.href ? (
                    <a
                      href={detail.href}
                      className={`inline-block rounded py-1 transition-colors hover:text-gold-bright motion-reduce:transition-none ${FOCUS_RING_ON_DARK}`}
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
                  href="/booking"
                  className={`inline-block rounded py-1.5 text-sm font-semibold text-gold-bright transition-colors hover:text-white motion-reduce:transition-none ${FOCUS_RING_ON_DARK}`}
                >
                  Request a Strategy Session <span aria-hidden="true">→</span>
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-14 flex flex-col items-center justify-between gap-4 border-t border-gold/15 pt-8 text-xs text-muted sm:flex-row">
          <p>
            &copy; {year} {footer.copyrightName}. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            <Link
              href="/privacy"
              className={`inline-block rounded py-1.5 transition-colors hover:text-gold-bright ${FOCUS_RING_ON_DARK}`}
            >
              Privacy Policy
            </Link>
            <Link
              href="/terms"
              className={`inline-block rounded py-1.5 transition-colors hover:text-gold-bright ${FOCUS_RING_ON_DARK}`}
            >
              Terms of Service
            </Link>
            <p>{footer.legalDisclaimer}</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
