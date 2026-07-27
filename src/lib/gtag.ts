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

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}
