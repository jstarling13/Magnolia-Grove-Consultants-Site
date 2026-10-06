"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { FocusTrap } from "focus-trap-react";
import { Menu, X, User } from "lucide-react";
import { brand, nav, navLinks } from "@/config/siteConfig";
import { FOCUS_RING_ON_DARK } from "@/components/global/focusRing";

const MOBILE_MENU_ID = "mobile-menu";

/** Moves focus to <main> (the in-page jump does not move it in every browser). */
function skipToContent(event: React.MouseEvent<HTMLAnchorElement>) {
  const main = document.getElementById("main-content") ?? document.querySelector("main");
  if (!main) return;
  event.preventDefault();
  if (!main.hasAttribute("tabindex")) main.setAttribute("tabindex", "-1");
  main.focus({ preventScroll: false });
}

export default function Header() {
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const pathname = usePathname();
  const isCurrent = (href: string) =>
    href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 8);
    handleScroll();
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  return (
    <>
      <a
        href="#main-content"
        onClick={skipToContent}
        className="fixed left-4 top-4 z-[60] -translate-y-24 rounded-md bg-gold px-5 py-3 font-heading text-sm font-semibold text-onyx focus:translate-y-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
      >
        Skip to main content
      </a>
      <header
        className={`sticky top-0 z-50 w-full border-b transition-all duration-300 motion-reduce:transition-none ${
          isScrolled ? "border-gold/20 bg-onyx" : "border-transparent bg-onyx"
        }`}
      >
        <div className="container-grove flex items-center justify-between px-6 py-4 sm:px-8 lg:px-12">
          <Link href="/" className={`flex items-center rounded-md ${FOCUS_RING_ON_DARK}`}>
            <Image
              src={brand.logoImage}
              alt={brand.logoImageAlt}
              width={342}
              height={272}
              priority
              className="h-16 w-auto sm:h-20"
            />
          </Link>

          <nav aria-label="Primary" className="hidden items-center gap-2 md:flex lg:gap-3">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                aria-current={isCurrent(link.href) ? "page" : undefined}
                className={`inline-flex min-h-11 items-center rounded-md px-2 font-heading text-base font-medium text-muted-light transition-colors hover:text-gold-bright aria-[current=page]:text-gold-bright motion-reduce:transition-none lg:px-2.5 ${FOCUS_RING_ON_DARK}`}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="hidden items-center gap-3 md:flex">
            <Link
              href="/login"
              aria-label="Log In"
              className={`inline-flex h-11 w-11 items-center justify-center rounded-md text-muted-light transition-colors hover:text-gold-bright motion-reduce:transition-none ${FOCUS_RING_ON_DARK}`}
            >
              <User size={20} aria-hidden="true" />
            </Link>
            <Link
              href="/payment"
              className={`inline-flex min-h-11 items-center rounded-md border border-gold/40 px-4 py-2.5 font-heading text-sm font-semibold text-gold-bright transition-all hover:bg-gold/10 motion-reduce:transition-none lg:px-5 lg:py-3 ${FOCUS_RING_ON_DARK}`}
            >
              Pay an Invoice
            </Link>
            <Link
              href={nav.primaryCtaHref}
              className={`inline-flex min-h-11 items-center rounded-md bg-gold px-5 py-2.5 font-heading text-sm font-semibold text-onyx transition-all hover:bg-gold-bright motion-reduce:transition-none lg:px-6 lg:py-3 ${FOCUS_RING_ON_DARK}`}
            >
              {nav.primaryCta}
            </Link>
          </div>

          <button
            ref={menuButtonRef}
            type="button"
            aria-label="Toggle menu"
            aria-expanded={isOpen}
            aria-controls={MOBILE_MENU_ID}
            className={`inline-flex h-11 w-11 items-center justify-center rounded-md text-white md:hidden ${FOCUS_RING_ON_DARK}`}
            onClick={() => setIsOpen((prev) => !prev)}
          >
            {isOpen ? <X size={26} aria-hidden="true" /> : <Menu size={26} aria-hidden="true" />}
          </button>
        </div>

        <FocusTrap
          active={isOpen}
          focusTrapOptions={{
            onDeactivate: () => setIsOpen(false),
            clickOutsideDeactivates: true,
            escapeDeactivates: true,
            allowOutsideClick: true,
            initialFocus: false,
          }}
        >
          <div
            id={MOBILE_MENU_ID}
            className={`border-t border-gold/20 bg-onyx px-6 pb-8 pt-4 md:hidden ${
              isOpen ? "block" : "hidden"
            }`}
          >
            <nav aria-label="Mobile" className="flex flex-col gap-1">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setIsOpen(false)}
                  aria-current={isCurrent(link.href) ? "page" : undefined}
                  className={`min-h-11 rounded-md px-3 py-3 font-heading text-base font-medium text-muted-light transition-colors hover:bg-white/5 hover:text-gold-bright aria-[current=page]:text-gold-bright motion-reduce:transition-none ${FOCUS_RING_ON_DARK}`}
                >
                  {link.label}
                </Link>
              ))}
              <Link
                href="/login"
                onClick={() => setIsOpen(false)}
                className={`min-h-11 rounded-md px-3 py-3 text-base font-medium text-muted-light transition-colors hover:bg-white/5 hover:text-gold-bright motion-reduce:transition-none ${FOCUS_RING_ON_DARK}`}
              >
                Log In
              </Link>
              <Link
                href="/payment"
                onClick={() => setIsOpen(false)}
                className={`mt-3 inline-flex min-h-11 items-center justify-center rounded-md border border-gold/40 px-6 py-3 font-heading text-sm font-semibold text-gold-bright ${FOCUS_RING_ON_DARK}`}
              >
                Pay an Invoice
              </Link>
              <Link
                href={nav.primaryCtaHref}
                onClick={() => setIsOpen(false)}
                className={`mt-3 inline-flex min-h-11 items-center justify-center rounded-md bg-gold px-6 py-3 font-heading text-sm font-semibold text-onyx ${FOCUS_RING_ON_DARK}`}
              >
                {nav.primaryCta}
              </Link>
            </nav>
          </div>
        </FocusTrap>
      </header>
    </>
  );
}
