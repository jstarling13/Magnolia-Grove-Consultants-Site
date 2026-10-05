export const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

export type ConversionEvent =
  "form_submission_lead" | "form_submission_booking" | "pillar_cross_sell_click";

/**
 * Fires a GA4 custom event. No-ops when analytics isn't configured or gtag
 * hasn't loaded yet (e.g. consent not yet granted), so callers never need to
 * guard this themselves.
 */
export function trackEvent(event: ConversionEvent, params?: Record<string, string>) {
  if (!GA_MEASUREMENT_ID) return;
  if (typeof window === "undefined" || typeof window.gtag !== "function") return;

  window.gtag("event", event, params);
}

/**
 * Sends any GA4 event (including the ecommerce ones, whose params are nested
 * objects). Same gating as trackEvent: a no-op when NEXT_PUBLIC_GA_MEASUREMENT_ID
 * is unset, on the server, or while gtag hasn't loaded. Never throws, so an
 * analytics failure can't break a click or a form submit. gtag() only queues
 * the event on dataLayer, so it never delays navigation either.
 */
export function sendGaEvent(name: string, params?: Record<string, unknown>): boolean {
  if (!GA_MEASUREMENT_ID) return false;
  if (typeof window === "undefined" || typeof window.gtag !== "function") return false;
  try {
    window.gtag("event", name, params);
    return true;
  } catch {
    return false;
  }
}

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}
