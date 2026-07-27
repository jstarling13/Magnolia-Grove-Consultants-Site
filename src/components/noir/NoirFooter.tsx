import Link from "next/link";
import Image from "next/image";
import { brand, contactDetails, footer, socialLinks } from "@/config/siteConfig";
import { pillars } from "@/config/pillarsConfig";

export default function NoirFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-gold/15 bg-onyx text-muted">
      <div className="mx-auto max-w-8xl px-6 py-16 sm:px-8 lg:px-12">
        <div className="grid grid-cols-1 gap-12 sm:grid-cols-2 lg:grid-cols-[1.3fr_1fr_1fr]">
          <div>
            <Image
              src={brand.logoImage}
              alt={brand.logoImageAlt}
              width={160}
              height={40}
              className="h-8 w-auto"
            />
            <p className="mt-4 max-w-xs text-sm leading-relaxed">{footer.description}</p>

            <div className="mt-6 flex gap-3">
              {socialLinks.map((social) => {
                const Icon = social.icon;
                return (
                  <a
                    key={social.id}
                    href={social.href}
                    aria-label={social.label}
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-gold/30 text-muted transition-colors hover:border-gold-bright hover:text-gold-bright"
                  >
                    <Icon size={16} />
                  </a>
                );
              })}
            </div>
          </div>

          <div>
            <h4 className="font-heading text-sm font-semibold uppercase tracking-wide text-white">
              4 Pillars
            </h4>
            <ul className="mt-4 flex flex-col gap-3">
              <li>
                <Link href="/pillars" className="text-sm transition-colors hover:text-gold-bright">
                  All Pillars
                </Link>
              </li>
              {pillars.map((pillar) => (
                <li key={pillar.slug}>
                  <Link
                    href={`/pillars/${pillar.slug}`}
                    className="text-sm transition-colors hover:text-gold-bright"
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
              {contactDetails.map((detail) => (
                <li key={detail.label} className="text-sm leading-relaxed">
                  {detail.href ? (
                    <a href={detail.href} className="transition-colors hover:text-gold-bright">
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
                  className="text-sm font-semibold text-gold-bright transition-colors hover:text-white"
                >
                  Request a Strategy Session →
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-14 flex flex-col items-center justify-between gap-4 border-t border-gold/15 pt-8 text-xs text-muted sm:flex-row">
          <p>
            &copy; {year} {footer.copyrightName}. All rights reserved.
          </p>
          <p>{footer.legalDisclaimer}</p>
        </div>
      </div>
    </footer>
  );
}
