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

/**
 * How the order process is described to shoppers. It matches what the team
 * actually does: the client sends a request, we put their logo on all of the
 * products, we finalize the quote (shipping, setup and other costs) and send
 * it with a payment link, and we place the order once the client has paid.
 * Nothing here promises mockups or proofs, because none are sent.
 */

/** Intro to the logo field on the cart page. */
export const LOGO_CART_INTRO =
  "Attach your logo (optional). We will place it on your items and send you a final quote with shipping, setup and any other costs. Nothing is charged until you approve the quote and pay.";

/** Shown when the request went through but the logo could not be stored. */
export const LOGO_ATTACH_FAILED =
  "Your request was sent. We could not attach your logo; reply to the confirmation email with it.";

/** Same, for the rare case that no confirmation email could be sent. */
export function logoAttachFailedNoEmail(orderRef: string | undefined): string {
  const email = cartContactEmail();
  return `Your request was sent. We could not attach your logo; email it to ${email ?? "us"}${
    orderRef ? ` and mention ${orderRef}` : ""
  }.`;
}

/** Confirmation on the cart page after the logo was stored. */
export const LOGO_ATTACHED = "Your logo is attached to your request.";

/** On the cart page after a request with no logo attached. */
export const LOGO_REPLY_ON_CART =
  "Reply to the confirmation email with your logo (vector PDF, AI, EPS or PNG).";

/** Inside the confirmation email, when no logo was attached. */
export const LOGO_REPLY_IN_EMAIL =
  "Reply to this email with your logo (vector PDF, AI, EPS or PNG).";

/** Inside the confirmation email: what happens to the request. */
export function requestReceivedSentence(orderRef: string | undefined): string {
  return `We have your request${orderRef ? ` ${orderRef}` : ""}. We will place your logo on your items and email you a final quote with shipping and other costs.`;
}
