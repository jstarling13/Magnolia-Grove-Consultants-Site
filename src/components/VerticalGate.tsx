"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { readVertical, saveVertical } from "@/lib/verticalChoice";

// Shown once, on first visit, so a new visitor can self-select the
// political or business track before landing on either one. A returning
// visitor who chose business is sent from the home page to /business.
// Never shows once inside /business — that section already knows what it is.
// Either side's header has a switch to the other side (VerticalSwitch).
export default function VerticalGate() {
  const pathname = usePathname();
  const router = useRouter();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (pathname?.startsWith("/business")) return;
    if (pathname?.startsWith("/admin") || pathname?.startsWith("/account")) return;
    // A shared product or cart link must land on the product, not on a gate
    // that can redirect the shopper away from it.
    if (pathname?.startsWith("/merchandise")) return;
    // Same for the order status link in a customer's email.
    if (pathname?.startsWith("/orders")) return;

    const chosen = readVertical();
    // A returning visitor who picked the business side lands there, not on
    // the campaign home page.
    if (chosen === "business") {
      if (pathname === "/") router.replace("/business");
      return;
    }
    if (!chosen) setVisible(true);
  }, [pathname, router]);

  const choose = (value: "political" | "business") => {
    saveVertical(value);
    setVisible(false);
    if (value === "business") router.push("/business");
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-onyx/95 px-6 backdrop-blur-sm">
      <div className="w-full max-w-2xl text-center">
        <Image
          src="/images/logo-magnolia-grove-white.png"
          alt="Magnolia Grove Consultants"
          width={342}
          height={272}
          className="mx-auto h-16 w-auto"
        />
        <h1 className="mt-6 text-2xl text-white sm:text-3xl">Welcome to Magnolia Grove</h1>
        <p className="mt-3 text-base leading-relaxed text-muted-light sm:text-base">
          We work with two kinds of clients. Which one are you?
        </p>

        <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => choose("political")}
            className="group flex flex-col items-center gap-3 rounded-lg border border-gold/30 bg-onyx px-6 py-10 text-center transition-all hover:-translate-y-1 hover:border-gold/70 hover:shadow-[0_16px_40px_-12px_rgba(197,160,89,0.35)]"
          >
            <span className="text-lg font-semibold text-white">Political Campaigns</span>
            <span className="text-sm text-muted-light">
              Candidates, PACs, and political organizations
            </span>
          </button>

          <button
            type="button"
            onClick={() => choose("business")}
            className="group flex flex-col items-center gap-3 rounded-lg border border-gold/30 bg-onyx px-6 py-10 text-center transition-all hover:-translate-y-1 hover:border-gold/70 hover:shadow-[0_16px_40px_-12px_rgba(197,160,89,0.35)]"
          >
            <span className="text-lg font-semibold text-white">Business & Organizations</span>
            <span className="text-sm text-muted-light">
              Businesses, nonprofits, and enterprise clients
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
