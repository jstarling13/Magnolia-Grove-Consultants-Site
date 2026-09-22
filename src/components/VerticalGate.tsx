"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { Landmark, Briefcase } from "lucide-react";

const STORAGE_KEY = "mg-vertical-choice";

// Shown once, on first visit, so a new visitor can self-select the
// political or business track before landing on either one. Never blocks
// direct/return visits, and never shows once inside /business — that
// section already knows what it is.
export default function VerticalGate() {
  const pathname = usePathname();
  const router = useRouter();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (pathname?.startsWith("/business")) return;
    if (pathname?.startsWith("/admin") || pathname?.startsWith("/account")) return;

    let alreadyChosen = true;
    try {
      alreadyChosen = Boolean(window.localStorage.getItem(STORAGE_KEY));
    } catch {
      alreadyChosen = true;
    }

    if (!alreadyChosen) setVisible(true);
  }, [pathname]);

  const choose = (value: "political" | "business") => {
    try {
      window.localStorage.setItem(STORAGE_KEY, value);
    } catch {
      // Private browsing or storage disabled — fine, it'll just ask again next visit.
    }
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
          We work with two kinds of clients. Which one is you?
        </p>

        <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => choose("political")}
            className="group flex flex-col items-center gap-4 rounded-lg border border-gold/30 bg-onyx px-6 py-10 text-center transition-all hover:-translate-y-1 hover:border-gold/70 hover:shadow-[0_16px_40px_-12px_rgba(197,160,89,0.35)]"
          >
            <span className="flex h-14 w-14 items-center justify-center rounded-full border border-gold/40 bg-gold/10 text-gold-bright">
              <Landmark size={26} strokeWidth={1.75} />
            </span>
            <span className="text-lg font-semibold text-white">Political Campaigns</span>
            <span className="text-sm text-muted-light">
              Candidates, PACs, and political organizations
            </span>
          </button>

          <button
            type="button"
            onClick={() => choose("business")}
            className="group flex flex-col items-center gap-4 rounded-lg border border-gold/30 bg-onyx px-6 py-10 text-center transition-all hover:-translate-y-1 hover:border-gold/70 hover:shadow-[0_16px_40px_-12px_rgba(197,160,89,0.35)]"
          >
            <span className="flex h-14 w-14 items-center justify-center rounded-full border border-gold/40 bg-gold/10 text-gold-bright">
              <Briefcase size={26} strokeWidth={1.75} />
            </span>
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
