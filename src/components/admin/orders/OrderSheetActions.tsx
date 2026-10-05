"use client";

import { useState } from "react";

/** Print the backend order sheet, or copy it as plain text. */
export default function OrderSheetActions({ sheetText }: { sheetText: string }) {
  const [copied, setCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);

  async function handleCopy() {
    setCopied(false);
    setCopyFailed(false);
    try {
      await navigator.clipboard.writeText(sheetText);
      setCopied(true);
    } catch {
      setCopyFailed(true);
    }
  }

  const buttonClass =
    "rounded-md border border-gold/40 px-4 py-2 text-sm font-semibold text-onyx transition-colors hover:bg-gold/10";

  return (
    <div className="flex flex-wrap items-center gap-3 print:hidden">
      <button type="button" onClick={() => window.print()} className={buttonClass}>
        Print order sheet
      </button>
      <button type="button" onClick={handleCopy} className={buttonClass}>
        {copied ? "Copied" : "Copy order sheet"}
      </button>
      <span role="status" aria-live="polite" className="text-xs text-onyx/70">
        {copyFailed ? "Couldn't copy automatically. Select the text below and copy it." : ""}
      </span>
      {copyFailed && (
        <textarea
          readOnly
          aria-label="Backend order sheet text"
          value={sheetText}
          rows={Math.min(14, sheetText.split("\n").length)}
          onFocus={(event) => event.currentTarget.select()}
          className="w-full rounded-md border border-gold/25 bg-cream px-3 py-2 font-mono text-xs text-onyx focus:outline-none focus:ring-2 focus:ring-gold/60"
        />
      )}
    </div>
  );
}
