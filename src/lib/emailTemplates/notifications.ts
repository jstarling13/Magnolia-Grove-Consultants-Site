/**
 * Lead, strategy-session, payment-request and merch-quote-form emails. Same
 * layout as the order emails so everything the site sends looks like one
 * brand. Internal notifications list the submitted fields; the two
 * auto-responders go to whatever address was typed into the form, so they
 * carry only the (escaped) first name.
 */

import type { MerchOrderRequestPayload } from "../merchOrders";
import type { LeadFormPayload, PaymentRequestPayload, StrategySessionPayload } from "../validation";
import {
  LIMITS,
  escapeHtml,
  fieldHtml,
  footerText,
  greetingHtml,
  greetingText,
  joinText,
  money,
  multiline,
  oneLine,
  paragraphHtml,
  renderShell,
  truncate,
  type BuiltEmail,
} from "./layout";

interface Field {
  label: string;
  value: string;
  /** Keep the author's line breaks (messages and notes). */
  multiline?: boolean;
}

function internalEmail(
  title: string,
  preheader: string,
  fields: Field[]
): Omit<BuiltEmail, "subject"> {
  const shown = fields
    .filter((field) => field.value.trim() !== "")
    .map((field) => ({
      ...field,
      value: truncate(field.value, field.multiline ? LIMITS.adminNotes : LIMITS.line),
    }));
  const html = renderShell({
    audience: "internal",
    title,
    preheader: oneLine(preheader),
    bodyHtml: shown
      .map((field) =>
        fieldHtml(field.label, field.multiline ? multiline(field.value) : escapeHtml(field.value))
      )
      .join(""),
  });
  const text = joinText([
    title,
    shown
      .map((field) =>
        field.multiline ? `${field.label}:\n${field.value}` : `${field.label}: ${field.value}`
      )
      .join("\n"),
    footerText("internal"),
  ]);
  return { html, text };
}

export function buildLeadNotificationEmail(payload: LeadFormPayload): BuiltEmail {
  const name = `${payload.firstName} ${payload.lastName}`;
  return {
    subject: oneLine(`New Strategy Call Request — ${name}`),
    ...internalEmail("New strategy call request", `${name} asked about ${payload.service}.`, [
      { label: "Name", value: name },
      { label: "Email", value: payload.email },
      { label: "Phone", value: payload.phone },
      { label: "Service", value: payload.service },
      { label: "Message", value: payload.message, multiline: true },
    ]),
  };
}

export function buildLeadAutoResponderEmail(payload: LeadFormPayload): BuiltEmail {
  const title = "Strategy request received";
  const line =
    "Strategy request received. A senior advisor will contact you within 12 hours under strict confidentiality.";
  return {
    subject: "We've received your strategy request — Magnolia Grove Consultants",
    html: renderShell({
      title,
      preheader: "A senior advisor will be in touch.",
      bodyHtml: greetingHtml(payload.firstName) + paragraphHtml(escapeHtml(line)),
    }),
    text: joinText([greetingText(payload.firstName), line, footerText()]),
  };
}

export function buildStrategySessionNotificationEmail(payload: StrategySessionPayload): BuiltEmail {
  return {
    subject: oneLine(`New Strategy Session Intake — ${payload.orgName}`),
    ...internalEmail(
      "New strategy session intake",
      `${payload.contactName} of ${payload.orgName} requested a session.`,
      [
        { label: "Organization", value: payload.orgName },
        { label: "Contact", value: `${payload.contactName} — ${payload.role}` },
        { label: "Email", value: payload.email },
        { label: "Phone", value: payload.phone },
        { label: "Area of Interest", value: payload.pillar },
        { label: "Budget Range", value: payload.budget },
        { label: "Timeline", value: payload.timeline },
        { label: "Details", value: payload.message, multiline: true },
      ]
    ),
  };
}

export function buildStrategySessionAutoResponderEmail(
  payload: StrategySessionPayload
): BuiltEmail {
  const title = "Consultation booked";
  const lines = [
    "Consultation booked. You will receive an invitation with encrypted meeting details shortly.",
    "All consultations and project briefs are held under absolute client-advisor confidentiality.",
  ];
  return {
    subject: "Strategy Session Confirmed — Magnolia Grove Consultants",
    html: renderShell({
      title,
      preheader: "Your invitation will follow shortly.",
      bodyHtml:
        greetingHtml(payload.contactName) +
        lines.map((line) => paragraphHtml(escapeHtml(line))).join(""),
    }),
    text: joinText([greetingText(payload.contactName), ...lines, footerText()]),
  };
}

export function buildPaymentRequestNotificationEmail(payload: PaymentRequestPayload): BuiltEmail {
  return {
    subject: oneLine(
      `New Payment Request — ${payload.organizationName} (${money(payload.amount)})`
    ),
    ...internalEmail(
      "New payment request",
      `${payload.organizationName} requested a payment of ${money(payload.amount)}.`,
      [
        { label: "Organization", value: payload.organizationName },
        { label: "Contact", value: `${payload.firstName} ${payload.lastName}` },
        { label: "Email", value: payload.email },
        { label: "Amount", value: money(payload.amount) },
        { label: "Note / Invoice Reference", value: payload.memo },
      ]
    ),
  };
}

export function buildMerchOrderNotificationEmail(payload: MerchOrderRequestPayload): BuiltEmail {
  const name = `${payload.firstName} ${payload.lastName}`;
  return {
    subject: oneLine(`New Merch Order Request — ${name} (${payload.product})`),
    ...internalEmail("New merchandise order request", `${name} asked about ${payload.product}.`, [
      { label: "Name", value: name },
      { label: "Email", value: payload.email },
      { label: "Phone", value: payload.phone },
      { label: "Product", value: payload.product },
      { label: "Quantity", value: payload.quantity },
      { label: "Budget", value: payload.budget ?? "" },
      { label: "Deadline", value: payload.deadline ?? "" },
      { label: "Notes", value: payload.notes ?? "", multiline: true },
    ]),
  };
}
