/**
 * Wording the shopper sees when sending a cart fails. Server-side reasons
 * (missing email key, database trouble, and so on) are logged on the server
 * and never shown; the shopper gets one generic sentence with the business's
 * real contact details from siteConfig. Field-level validation messages are
 * handled elsewhere and stay specific.
 */

import { contactDetails } from "@/config/siteConfig";

function contactValue(label: string): string | undefined {
  const value = contactDetails.find((detail) => detail.label === label)?.value?.trim();
  return value ? value : undefined;
}

/** "We couldn't send your request. Please email ben@... or call (706) 573-1719." */
export function cartSendFailureMessage(): string {
  const email = contactValue("Email");
  const phone = contactValue("Phone");
  const ways = [email ? `email ${email}` : "", phone ? `call ${phone}` : ""].filter(Boolean);
  return ways.length > 0
    ? `We couldn't send your request. Please ${ways.join(" or ")}.`
    : "We couldn't send your request. Please try again in a few minutes.";
}

/** The address to send logo files to when no confirmation email could be sent. */
export function cartContactEmail(): string | undefined {
  return contactValue("Email");
}

/**
 * Picks what to print for a failed checkout response. Server faults (5xx, or a
 * reply with no usable status or message) become the generic sentence; a 4xx
 * carries our own specific message about the cart or the request (minimum
 * order, color, rate limit), which is safe and useful to show.
 */
export function shopperErrorMessage(status: unknown, serverMessage: unknown): string {
  const message = typeof serverMessage === "string" ? serverMessage.trim() : "";
  const isClientError = typeof status === "number" && status >= 400 && status < 500;
  return isClientError && message ? message : cartSendFailureMessage();
}

/** On the cart page, where the confirmation email has not been sent yet. */
export const ARTWORK_INSTRUCTIONS =
  "Send your logo files (vector PDF, AI, EPS or PNG) by replying to the confirmation email.";
/** Inside the confirmation email itself. */
export const ARTWORK_INSTRUCTIONS_IN_EMAIL =
  "Send your logo files (vector PDF, AI, EPS or PNG) by replying to this confirmation email.";
export const ARTWORK_CONFIRMATION_PROMISE =
  "We'll confirm artwork details with you before quoting the final price.";
