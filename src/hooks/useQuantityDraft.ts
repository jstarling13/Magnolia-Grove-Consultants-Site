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
  /** Called with a whole, in-range quantity once the shopper has finished with it. */
  onCommit: (quantity: number) => void;
  max?: number;
  /**
   * Smallest quantity worth committing. A smaller number stays in the box
   * (so the shopper can see and fix it) but is never committed.
   */
  min?: number;
  /** Shown when the box is left below `min`; defaults to a short generic sentence. */
  belowMinMessage?: string;
  /** Called on every edit of the box (typed or stepped), before anything is committed. */
  onEdit?: () => void;
}

/**
 * True for a change the shopper typed, pasted, cut or undid. The browser's own
 * up/down arrows fire the same event with no inputType, and those are single,
 * deliberate steps worth committing straight away.
 */
function isTextEdit(event: ChangeEvent<HTMLInputElement>): boolean {
  const inputType = (event.nativeEvent as InputEvent | undefined)?.inputType;
  return typeof inputType === "string" && /^(insert|delete|history)/.test(inputType);
}

/**
 * Drives a quantity box that can be empty while the shopper retypes it.
 *
 * What the shopper types only updates the box. The quantity is committed (so
 * prices and the cart change) when they leave the box or press Enter, and
 * straight away for the stepper arrows. That keeps prices still while "144" is
 * typed instead of flashing through 1 and 14, and means an emptied or half
 * typed box never reaches the cart: blur or Enter puts the last good value
 * back. A number below `min` is kept in the box with a message but not
 * committed. Numbers above `max` are clamped with an inline message.
 */
export function useQuantityDraft({
  value,
  onCommit,
  max = CART_FORM_LIMITS.lineQuantityMax,
  min = 1,
  belowMinMessage,
  onEdit,
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

  function commit(quantity: number) {
    if (quantity >= min && quantity !== value) onCommit(quantity);
  }

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const next = event.target.value;
    onEdit?.();
    const result = parseQuantityDraft(next, max);
    if (result.kind === "ok") {
      if (result.clamped) {
        setDraft(String(result.value));
        setMessage(CART_FORM_MESSAGES.quantityMax);
      } else {
        setDraft(next);
        setMessage("");
      }
      if (!isTextEdit(event)) commit(result.value);
      return;
    }
    // Empty or unfinished: keep the text, commit nothing.
    setDraft(next);
    setMessage("");
  }

  function settle() {
    if (parsed.kind !== "ok") {
      setDraft(String(value));
      return;
    }
    setDraft(String(parsed.value));
    if (parsed.value >= min) {
      commit(parsed.value);
    } else {
      setMessage(belowMinMessage ?? `Enter ${min} or more.`);
    }
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
    /** Commit the box now (used by an Add button that is clicked before the box blurs). */
    settle,
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
