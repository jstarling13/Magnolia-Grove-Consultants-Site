"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { FocusTrap } from "focus-trap-react";
import { Menu, X, User } from "lucide-react";
import { brand, nav, navLinks } from "@/config/siteConfig";

export default function Header() {
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

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
    <header
      className={`sticky top-0 z-50 w-full border-b transition-all duration-300 motion-reduce:transition-none ${
        isScrolled
          ? "border-gold/20 bg-onyx/95 backdrop-blur-sm"
          : "border-transparent bg-onyx/70 backdrop-blur-sm"
      }`}
    >
      <div className="container-grove flex items-center justify-between px-6 py-4 sm:px-8 lg:px-12">
        <Link href="/" className="flex items-center">
          <Image
            src={brand.logoImage}
            alt={brand.logoImageAlt}
            width={342}
            height={272}
            priority
            className="h-16 w-auto sm:h-20"
          />
        </Link>

        <nav className="hidden items-center gap-6 md:flex lg:gap-8">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="font-heading text-base font-medium text-muted-light transition-colors hover:text-gold-bright motion-reduce:transition-none"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <Link
            href="/login"
            aria-label="Log In"
            className="inline-flex items-center justify-center rounded-md p-2.5 text-muted-light transition-colors hover:text-gold-bright motion-reduce:transition-none"
          >
            <User size={20} />
          </Link>
          <Link
            href="/payment"
            className="inline-flex items-center rounded-md border border-gold/40 px-4 py-2.5 font-heading text-sm font-semibold text-gold-bright transition-all hover:bg-gold/10 motion-reduce:transition-none lg:px-5 lg:py-3"
          >
            Pay an Invoice
          </Link>
          <Link
            href={nav.primaryCtaHref}
            className="inline-flex items-center rounded-md bg-gold px-5 py-2.5 font-heading text-sm font-semibold text-onyx transition-all hover:bg-gold-bright motion-reduce:transition-none lg:px-6 lg:py-3"
          >
            {nav.primaryCta}
          </Link>
        </div>

        <button
          ref={menuButtonRef}
          type="button"
          aria-label="Toggle menu"
          aria-expanded={isOpen}
          className="inline-flex items-center justify-center rounded-md p-2 text-white md:hidden"
          onClick={() => setIsOpen((prev) => !prev)}
        >
          {isOpen ? <X size={26} /> : <Menu size={26} />}
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
          className={`border-t border-gold/20 bg-onyx px-6 pb-8 pt-4 md:hidden ${
            isOpen ? "block" : "hidden"
          }`}
        >
          <nav className="flex flex-col gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setIsOpen(false)}
                className="rounded-md px-3 py-3 font-heading text-base font-medium text-muted-light transition-colors hover:bg-white/5 hover:text-gold-bright motion-reduce:transition-none"
              >
                {link.label}
              </Link>
            ))}
            <Link
              href="/login"
              onClick={() => setIsOpen(false)}
              className="rounded-md px-3 py-3 text-base font-medium text-muted-light transition-colors hover:bg-white/5 hover:text-gold-bright motion-reduce:transition-none"
            >
              Log In
            </Link>
            <Link
              href="/payment"
              onClick={() => setIsOpen(false)}
              className="mt-3 inline-flex items-center justify-center rounded-md border border-gold/40 px-6 py-3 font-heading text-sm font-semibold text-gold-bright"
            >
              Pay an Invoice
            </Link>
            <Link
              href={nav.primaryCtaHref}
              onClick={() => setIsOpen(false)}
              className="mt-3 inline-flex items-center justify-center rounded-md bg-gold px-6 py-3 font-heading text-sm font-semibold text-onyx"
            >
              {nav.primaryCta}
            </Link>
          </nav>
        </div>
      </FocusTrap>
    </header>
  );
}
