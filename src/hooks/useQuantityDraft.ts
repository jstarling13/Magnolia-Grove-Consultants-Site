"use client";

import { useId, useState, type ChangeEvent, type FocusEvent, type KeyboardEvent } from "react";
import {
  CART_FORM_LIMITS,
  CART_FORM_MESSAGES,
  parseQuantityDraft,
  type QuantityDraft,
} from "@/lib/cartFormRules";

interface Options {
  /** The committed quantity (what the cart or page is actually using). */
  value: number;
  /** Called with each whole, in-range quantity as soon as it is typed. */
  onCommit: (quantity: number) => void;
  max?: number;
}

/**
 * Drives a quantity box that can be empty while the shopper retypes it.
 * Valid numbers are committed immediately so prices update as they type;
 * empty or unfinished text is left alone and put back to the last good value on
 * blur or Enter; numbers above `max` are clamped with an inline message.
 */
export function useQuantityDraft({
  value,
  onCommit,
  max = CART_FORM_LIMITS.lineQuantityMax,
}: Options) {
  const messageId = useId();
  const [draft, setDraft] = useState(String(value));
  const [prevValue, setPrevValue] = useState(value);
  const [message, setMessage] = useState("");

  // The committed value changed from outside (a merge, a reset): follow it,
  // unless the draft already means that same number.
  if (value !== prevValue) {
    setPrevValue(value);
    const current = parseQuantityDraft(draft, max);
    if (!(current.kind === "ok" && current.value === value)) setDraft(String(value));
  }

  const parsed: QuantityDraft = parseQuantityDraft(draft, max);

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const next = event.target.value;
    const result = parseQuantityDraft(next, max);
    if (result.kind === "ok") {
      if (result.clamped) {
        setDraft(String(result.value));
        setMessage(CART_FORM_MESSAGES.quantityMax);
      } else {
        setDraft(next);
        setMessage("");
      }
      onCommit(result.value);
      return;
    }
    // Empty or unfinished: keep the text, commit nothing.
    setDraft(next);
    setMessage("");
  }

  function settle() {
    if (parsed.kind === "ok") setDraft(String(parsed.value));
    else setDraft(String(value));
  }

  return {
    draft,
    /** What the box currently means: a number, empty, or unusable text. */
    parsed,
    /** Inline explanation (for example the cap was applied); empty when there is none. */
    message,
    messageId,
    clearMessage: () => setMessage(""),
    setDraft,
    inputProps: {
      value: draft,
      max,
      onChange: handleChange,
      onBlur: (_event: FocusEvent<HTMLInputElement>) => settle(),
      onKeyDown: (event: KeyboardEvent<HTMLInputElement>) => {
        if (event.key === "Enter") {
          event.preventDefault();
          settle();
        }
      },
    },
  };
}
