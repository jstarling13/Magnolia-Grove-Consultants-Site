"use client";

import { useState } from "react";

/**
 * Admin-only. One block of plain text with everything needed to re-order the
 * lines from the supplier in ESP+ (product, color, quantity, sizes, imprint
 * notes, internal ESP+ link), and one button to copy it.
 */
export default function EspReorderBlock({ text }: { text: string }) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setState("copied");
    } catch {
      setState("failed");
    }
  }

  return (
    <section
      aria-labelledby="esp-reorder-heading"
      className="mt-6 rounded-lg border border-gold/25 bg-cream-100 p-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2
            id="esp-reorder-heading"
            className="text-xs font-semibold uppercase tracking-wide text-gold-text"
          >
            Reorder from ESP+
          </h2>
          <p className="mt-1 text-xs text-onyx/70">
            Internal. Contains supplier links, so never paste it into a customer email.
          </p>
        </div>
        <button
          type="button"
          onClick={handleCopy}
          className="rounded-md border border-onyx bg-onyx px-4 py-2 text-sm font-semibold text-cream transition-colors hover:bg-onyx-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-onyx focus-visible:ring-offset-2"
        >
          {state === "copied" ? "Copied" : "Copy for ESP+"}
        </button>
      </div>
      <p role="status" aria-live="polite" className="mt-1 text-xs text-onyx/80">
        {state === "copied" ? "Order lines copied to the clipboard." : ""}
        {state === "failed"
          ? "Couldn't copy automatically. Select the text below and copy it."
          : ""}
      </p>
      <textarea
        readOnly
        aria-label="ESP+ reorder text"
        value={text}
        rows={Math.min(18, text.split("\n").length)}
        onFocus={(event) => event.currentTarget.select()}
        className="mt-2 w-full rounded-md border border-onyx/50 bg-cream px-3 py-2 font-mono text-xs text-onyx focus:outline-none focus-visible:ring-2 focus-visible:ring-onyx focus-visible:ring-offset-2"
      />
    </section>
  );
}
