"use client";

import { useEffect, useState } from "react";
import { FocusTrap } from "focus-trap-react";
import { X } from "lucide-react";
import { CONSULTATION_DRAWER_EVENT, type ConsultationDrawerDetail } from "@/lib/consultationDrawer";
import StrategySessionForm from "./StrategySessionForm";

export default function ConsultationDrawer() {
  const [isOpen, setIsOpen] = useState(false);
  const [pillar, setPillar] = useState<string | undefined>(undefined);

  useEffect(() => {
    const handleOpen = (event: Event) => {
      const detail = (event as CustomEvent<ConsultationDrawerDetail>).detail;
      setPillar(detail?.pillar);
      setIsOpen(true);
    };

    window.addEventListener(CONSULTATION_DRAWER_EVENT, handleOpen);
    return () => window.removeEventListener(CONSULTATION_DRAWER_EVENT, handleOpen);
  }, []);

  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  return (
    <div
      className={`fixed inset-0 z-[60] transition-opacity duration-300 motion-reduce:transition-none ${
        isOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
      }`}
      aria-hidden={!isOpen}
    >
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={() => setIsOpen(false)}
      />

      <FocusTrap
        active={isOpen}
        focusTrapOptions={{
          onDeactivate: () => setIsOpen(false),
          clickOutsideDeactivates: true,
          escapeDeactivates: true,
          allowOutsideClick: true,
          fallbackFocus: "#consultation-drawer-close",
        }}
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Request a strategy session"
          className={`absolute right-0 top-0 flex h-full w-full max-w-lg flex-col overflow-y-auto border-l border-gold/25 bg-cream-200 shadow-2xl transition-transform duration-300 ease-out motion-reduce:transition-none ${
            isOpen ? "translate-x-0" : "translate-x-full"
          }`}
        >
          <div className="flex items-center justify-between border-b border-gold/15 px-6 py-5 sm:px-8">
            <div>
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-gold-dark">
                High-Intent Intake
              </span>
              <h2 className="mt-1 font-heading text-xl font-semibold text-onyx">
                Request a Strategy Session
              </h2>
            </div>
            <button
              id="consultation-drawer-close"
              type="button"
              aria-label="Close"
              onClick={() => setIsOpen(false)}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-gold/25 text-onyx/60 transition-colors hover:border-gold/60 hover:text-onyx"
            >
              <X size={18} />
            </button>
          </div>

          <div className="flex-1 px-6 py-8 sm:px-8">
            <StrategySessionForm key={pillar ?? "general"} initialPillar={pillar} />
          </div>
        </div>
      </FocusTrap>
    </div>
  );
}
