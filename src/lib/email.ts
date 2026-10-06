import { Resend } from "resend";
import type { LeadFormPayload, StrategySessionPayload, PaymentRequestPayload } from "./validation";
import type { MerchOrderRequestPayload } from "./merchOrders";
import type { BuiltEmail } from "./emailTemplates/layout";
import {
  buildLeadAutoResponderEmail,
  buildLeadNotificationEmail,
  buildMerchOrderNotificationEmail,
  buildPaymentRequestNotificationEmail,
  buildStrategySessionAutoResponderEmail,
  buildStrategySessionNotificationEmail,
} from "./emailTemplates/notifications";
import {
  buildCartOrderNotificationEmail,
  buildLogoAttachedNotificationEmail,
  buildMerchPaidEmail,
  buildMerchPaymentLinkEmail,
  buildMerchRequestConfirmationEmail,
  buildMerchShippedEmail,
  type CartOrderNotificationPayload,
  type LogoAttachedNotificationPayload,
  type MerchPaidEmailPayload,
  type MerchPaymentLinkEmailPayload,
  type MerchRequestConfirmationPayload,
  type MerchShippedEmailPayload,
} from "./emailTemplates/orderEmails";

/**
 * Sending side of the site's email. Every message is built by a pure builder in
 * src/lib/emailTemplates/ (html + plain-text + subject) and sent here through
 * Resend as a multipart message. See docs/EMAIL.md.
 */

export {
  buildMerchPaidEmail,
  buildMerchPaymentLinkEmail,
  buildMerchRequestConfirmationEmail,
  buildMerchShippedEmail,
  buildCartOrderNotificationEmail,
  trackOrderLinkHtml,
  type MerchPaidEmailPayload,
  type MerchPaymentLinkEmailPayload,
  type MerchRequestConfirmationPayload,
  type MerchShippedEmailPayload,
} from "./emailTemplates/orderEmails";
export {
  customerLinesFromStored,
  type BuiltEmail,
  type CustomerOrderLine,
} from "./emailTemplates/layout";

const hasResendConfig =
  Boolean(process.env.RESEND_API_KEY) && Boolean(process.env.CONTACT_EMAIL_FROM);

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

interface SendResult {
  sent: boolean;
  reason?: string;
}

function businessInbox(): string {
  return process.env.CONTACT_EMAIL_TO || "ben@magnoliagrovega.com";
}

interface Delivery {
  /** Function name, for the log line when Resend rejects the message. */
  label: string;
  to: string;
  replyTo?: string;
  email: BuiltEmail;
  /** What to log when email isn't configured; omitted for silent skips. */
  skipNote?: string;
}

/** Sends one built email, never throws. Skips cleanly when Resend isn't configured. */
async function deliver({ label, to, replyTo, email, skipNote }: Delivery): Promise<SendResult> {
  if (!resend || !hasResendConfig) {
    if (skipNote) {
      console.warn(`[email] RESEND_API_KEY / CONTACT_EMAIL_FROM not set — skipping ${skipNote}.`);
    }
    return { sent: false, reason: "not_configured" };
  }

  const { error } = await resend.emails.send({
    from: process.env.CONTACT_EMAIL_FROM!,
    to,
    ...(replyTo ? { replyTo } : {}),
    subject: email.subject,
    html: email.html,
    text: email.text,
  });

  if (error) {
    console.error(`[email] Resend rejected ${label}:`, error);
    return { sent: false, reason: error.message };
  }
  return { sent: true };
}

// ---------------------------------------------------------------------------
// Website forms (business inbox + auto-responders)
// ---------------------------------------------------------------------------

export function sendLeadNotification(payload: LeadFormPayload): Promise<SendResult> {
  return deliver({
    label: "sendLeadNotification",
    to: businessInbox(),
    replyTo: payload.email,
    email: buildLeadNotificationEmail(payload),
    skipNote: "admin notification",
  });
}

export function sendLeadAutoResponder(payload: LeadFormPayload): Promise<SendResult> {
  return deliver({
    label: "sendLeadAutoResponder",
    to: payload.email,
    email: buildLeadAutoResponderEmail(payload),
  });
}

export function sendStrategySessionNotification(
  payload: StrategySessionPayload
): Promise<SendResult> {
  return deliver({
    label: "sendStrategySessionNotification",
    to: businessInbox(),
    replyTo: payload.email,
    email: buildStrategySessionNotificationEmail(payload),
    skipNote: "admin notification",
  });
}

export function sendStrategySessionAutoResponder(
  payload: StrategySessionPayload
): Promise<SendResult> {
  return deliver({
    label: "sendStrategySessionAutoResponder",
    to: payload.email,
    email: buildStrategySessionAutoResponderEmail(payload),
  });
}

export function sendPaymentRequestNotification(
  payload: PaymentRequestPayload
): Promise<SendResult> {
  return deliver({
    label: "sendPaymentRequestNotification",
    to: businessInbox(),
    replyTo: payload.email,
    email: buildPaymentRequestNotificationEmail(payload),
    skipNote: "payment notification",
  });
}

export function sendMerchOrderNotification(payload: MerchOrderRequestPayload): Promise<SendResult> {
  return deliver({
    label: "sendMerchOrderNotification",
    to: businessInbox(),
    replyTo: payload.email,
    email: buildMerchOrderNotificationEmail(payload),
    skipNote: "merch order notification",
  });
}

// ---------------------------------------------------------------------------
// Merchandise orders: business notification
// ---------------------------------------------------------------------------

/** New cart order, to the business inbox. Includes back-office lookup details; never customer-facing. */
export function sendCartOrderNotification(
  payload: CartOrderNotificationPayload
): Promise<SendResult> {
  return deliver({
    label: "sendCartOrderNotification",
    to: businessInbox(),
    replyTo: payload.email,
    email: buildCartOrderNotificationEmail(payload),
    skipNote: "cart order notification",
  });
}

/** A customer's logo arrived on an order. Points to the order in admin; the file is never attached. */
export function sendLogoAttachedNotification(
  payload: LogoAttachedNotificationPayload
): Promise<SendResult> {
  return deliver({
    label: "sendLogoAttachedNotification",
    to: businessInbox(),
    email: buildLogoAttachedNotificationEmail(payload),
    skipNote: "logo attached notification",
  });
}

// ---------------------------------------------------------------------------
// Merchandise orders: customer emails
// (replies go to the business inbox)
// ---------------------------------------------------------------------------

/** Acknowledges a submitted cart to the customer. Callers must not let a failure here fail the order. */
export function sendMerchRequestConfirmation(
  payload: MerchRequestConfirmationPayload
): Promise<SendResult> {
  return deliver({
    label: "sendMerchRequestConfirmation",
    to: payload.email,
    replyTo: businessInbox(),
    email: buildMerchRequestConfirmationEmail(payload),
    skipNote: "merch request confirmation",
  });
}

/** Sent to the customer once an admin has confirmed the final quote and generated the Square link. */
export function sendMerchPaymentLinkEmail(
  payload: MerchPaymentLinkEmailPayload
): Promise<SendResult> {
  return deliver({
    label: "sendMerchPaymentLinkEmail",
    to: payload.email,
    replyTo: businessInbox(),
    email: buildMerchPaymentLinkEmail(payload),
    skipNote: "merch payment link email",
  });
}

export function sendMerchPaidEmail(payload: MerchPaidEmailPayload): Promise<SendResult> {
  return deliver({
    label: "sendMerchPaidEmail",
    to: payload.email,
    replyTo: businessInbox(),
    email: buildMerchPaidEmail(payload),
    skipNote: "merch payment received email",
  });
}

export function sendMerchShippedEmail(payload: MerchShippedEmailPayload): Promise<SendResult> {
  return deliver({
    label: "sendMerchShippedEmail",
    to: payload.email,
    replyTo: businessInbox(),
    email: buildMerchShippedEmail(payload),
    skipNote: "merch shipped email",
  });
}
