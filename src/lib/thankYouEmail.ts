/**
 * Carries the email a customer just typed from a form to the thank-you page's
 * "create an account" prompt without putting it in the URL (history, server
 * logs and referrers all record URLs). sessionStorage is per-tab and dies with
 * the tab; the timestamp keeps a stale value from lingering within a long-lived
 * tab. Every access is wrapped because storage can be blocked or absent.
 */

const KEY = "mg-thankyou-email";
const MAX_AGE_MS = 30 * 60 * 1000;

export function rememberThankYouEmail(email: string, now = Date.now()): void {
  const value = email.trim();
  if (!value) return;
  try {
    window.sessionStorage.setItem(KEY, JSON.stringify({ email: value, at: now }));
  } catch {
    // Storage unavailable: the prompt simply asks for the email itself.
  }
}

/** The remembered email, or "" when none, expired, malformed, or storage is unavailable. */
export function readThankYouEmail(now = Date.now()): string {
  try {
    const raw = window.sessionStorage.getItem(KEY);
    if (!raw) return "";
    const parsed = JSON.parse(raw) as { email?: unknown; at?: unknown };
    if (typeof parsed.email !== "string" || typeof parsed.at !== "number") return "";
    if (now - parsed.at > MAX_AGE_MS || parsed.at > now + 60_000) return "";
    return parsed.email;
  } catch {
    return "";
  }
}
