/**
 * The merchandise order emails, one builder per message:
 *
 *   customer: request confirmation -> quote / payment link -> paid receipt -> shipped
 *   internal: new-order notification to the business inbox
 *
 * Builders are pure (no network, no env beyond the optional order-link secret
 * read by buildOrderTrackingUrl) and return { subject, html, text }. They are
 * sent by the functions in src/lib/email.ts.
 *
 * How the store really works, which the copy must keep matching: a customer
 * submits a request (nothing is charged), we place their logo on the items and
 * finalize the quote with shipping, setup and other costs, email it with a
 * secure payment link, place the order once payment clears, and email tracking
 * when it ships. No email promises a date, a mockup or a proof.
 */

import { buildTrackingUrl, formatOrderReference, recognizeCarrier } from "../merchOrders";
import { buildOrderTrackingUrl, parseOrderRef } from "../orderTracking";
import { describeLineColor } from "../merchBackendSheet";
import { LOGO_REPLY_IN_EMAIL, requestReceivedSentence } from "../cartShopperMessages";
import { formatFileSize } from "../orderLogo";
import { getSiteUrl } from "../siteUrl";
import type { PricedCartLineItem } from "../merchOrders";
import {
  COLORS,
  LIMITS,
  buttonHtml,
  escapeHtml,
  fieldHtml,
  footerText,
  greetingHtml,
  greetingText,
  headingHtml,
  itemsTableHtml,
  itemsText,
  joinText,
  linkHtml,
  money,
  multiline,
  numberedListHtml,
  numberedText,
  oneLine,
  paragraphHtml,
  pickLines,
  referenceHtml,
  renderShell,
  safeHref,
  smallPrintHtml,
  stripControl,
  totalRowHtml,
  truncate,
  type BuiltEmail,
  type CustomerOrderLine,
} from "./layout";

export type { BuiltEmail, CustomerOrderLine } from "./layout";

// ---------------------------------------------------------------------------
// Shared pieces
// ---------------------------------------------------------------------------

/**
 * "Track your order" link block for the customer order emails. Empty when
 * ORDER_LINK_SECRET is unset (or the order has no id), so emails simply go out
 * without it. Accepts the numeric id or a reference such as "MG-00042".
 */
export function trackOrderLinkHtml(order: number | string | undefined): string {
  const url = trackingUrlFor(order);
  if (!url) return "";
  return `<p style="margin:0 0 16px;font-size:15px;line-height:1.5;"><a href="${escapeHtml(url)}" style="color:${COLORS.goldText};font-weight:700;text-decoration:underline;">Track your order &rarr;</a><br/><span style="color:${COLORS.muted};font-size:13px;">See the current status of your order any time.</span></p>`;
}

function trackingUrlFor(order: number | string | undefined): string | undefined {
  const id = typeof order === "string" ? parseOrderRef(order) : order;
  if (id === undefined) return undefined;
  return buildOrderTrackingUrl(id) ?? undefined;
}

function trackOrderLinkText(order: number | string | undefined): string {
  const url = trackingUrlFor(order);
  return url ? `Track your order any time: ${url}` : "";
}

/** The common tail of every customer email: reply instruction mentioning the reference. */
function replyLineHtml(orderRef: string | undefined): string {
  return smallPrintHtml(
    `Questions or changes? Just reply to this email${orderRef ? ` and mention ${escapeHtml(orderRef)}` : ""}.`
  );
}

function replyLineText(orderRef: string | undefined): string {
  return `Questions or changes? Just reply to this email${orderRef ? ` and mention ${orderRef}` : ""}.`;
}

/** Longest subject we aim for; most inboxes show roughly this much. */
const SUBJECT_TARGET_LENGTH = 70;

/**
 * Order emails lead with the reference (`MG-00042: Payment received`) so every
 * message in a customer's inbox for one order sorts and searches together. If
 * the order couldn't be saved and has no reference, the plain lead is used.
 */
function subjectWithRef(lead: string, orderRef: string | undefined): string {
  return oneLine(orderRef ? `${orderRef}: ${lead}` : lead);
}

/** Cuts a customer-typed name to fit a subject, on a code-point boundary, with an ellipsis. */
function fitSubjectName(name: string, max: number): string {
  const chars = Array.from(oneLine(stripControl(name)).replace(/\s+/g, " "));
  if (chars.length <= max) return chars.join("");
  return `${chars
    .slice(0, Math.max(1, max - 1))
    .join("")
    .trimEnd()}…`;
}

// ---------------------------------------------------------------------------
// Customer: request confirmation (sent right after a cart is submitted)
// ---------------------------------------------------------------------------

export interface MerchRequestConfirmationPayload {
  email: string;
  firstName: string;
  /** Customer-facing reference such as MG-00042; omitted only if the order couldn't be saved. */
  orderRef?: string;
  items: CustomerOrderLine[];
  /** Estimated subtotal at the shared quantity tier, before decoration, shipping, and tax. */
  total: number;
  notes?: string;
  /**
   * The shopper is attaching a logo to the request (it uploads right after the
   * request is saved). When false or absent the email asks them to reply with it.
   */
  logoAttached?: boolean;
}

const CONFIRMATION_STEPS = [
  "We place your logo on your items and finalize your quote with shipping, setup, and any other costs.",
  "We email you the final quote with a secure link to pay. Nothing is charged until you approve it and pay.",
  "We place your order after your payment clears, and email you tracking details when it ships.",
];

const ESTIMATE_NOTE =
  "Unit prices reflect the quantity tier for each product across all of its colors. This estimate does not yet include shipping, setup, or other costs.";

export function buildMerchRequestConfirmationEmail(
  payload: MerchRequestConfirmationPayload
): BuiltEmail {
  const items = pickLines(payload.items);
  const notes = payload.notes?.trim() ? truncate(payload.notes.trim(), LIMITS.notes) : "";
  const received = [
    requestReceivedSentence(payload.orderRef),
    payload.logoAttached ? "" : LOGO_REPLY_IN_EMAIL,
  ]
    .filter(Boolean)
    .join(" ");
  const title = "We received your merchandise request";
  const preheader = payload.orderRef
    ? `Request ${payload.orderRef} is in. Nothing has been charged.`
    : "Your request is in. Nothing has been charged.";

  const html = renderShell({
    title,
    preheader,
    bodyHtml: [
      greetingHtml(payload.firstName),
      paragraphHtml(
        "Thank you for your request. <strong>Nothing has been charged.</strong> Here is a summary of what you asked for."
      ),
      payload.orderRef ? referenceHtml(payload.orderRef) : "",
      itemsTableHtml(items),
      totalRowHtml("Estimated Subtotal", payload.total),
      smallPrintHtml(ESTIMATE_NOTE),
      notes ? fieldHtml("Your Notes", multiline(notes)) : "",
      paragraphHtml(escapeHtml(received)),
      trackOrderLinkHtml(payload.orderRef),
      headingHtml("What happens next"),
      numberedListHtml(CONFIRMATION_STEPS),
      replyLineHtml(payload.orderRef),
    ].join(""),
  });

  const text = joinText([
    greetingText(payload.firstName),
    "Thank you for your request. Nothing has been charged. Here is a summary of what you asked for.",
    payload.orderRef ? `Order reference: ${payload.orderRef}` : "",
    itemsText(items),
    `Estimated Subtotal: ${money(payload.total)}`,
    ESTIMATE_NOTE,
    notes ? `Your notes:\n${notes}` : "",
    received,
    trackOrderLinkText(payload.orderRef),
    `What happens next:\n${numberedText(CONFIRMATION_STEPS)}`,
    replyLineText(payload.orderRef),
    footerText(),
  ]);

  return {
    subject: subjectWithRef("Your Magnolia Grove request is in", payload.orderRef),
    html,
    text,
  };
}

// ---------------------------------------------------------------------------
// Customer: quote with payment link
// ---------------------------------------------------------------------------

export interface MerchPaymentLinkEmailPayload {
  email: string;
  firstName: string;
  orderId: number;
  /** The final quoted amount, including decoration, shipping, and tax. */
  total: number;
  paymentUrl: string;
  /** What the quote covers. Optional so older callers keep working; prices are shown when present. */
  items?: CustomerOrderLine[];
}

const QUOTE_STEPS = [
  "Pay using the secure link above.",
  "We place your order as soon as payment clears.",
  "We email you tracking details when it ships.",
];

export function buildMerchPaymentLinkEmail(payload: MerchPaymentLinkEmailPayload): BuiltEmail {
  const orderRef = formatOrderReference(payload.orderId);
  const items = pickLines(payload.items ?? []);
  const title = "Your merchandise quote is ready";
  const payHref = safeHref(payload.paymentUrl);

  const html = renderShell({
    title,
    preheader: `Quote ${orderRef}: ${money(payload.total)} due. Pay securely online.`,
    bodyHtml: [
      greetingHtml(payload.firstName),
      paragraphHtml(
        "We've confirmed the final pricing for your merchandise order, including decoration, shipping, and tax. We place the order as soon as payment clears."
      ),
      referenceHtml(orderRef),
      itemsTableHtml(items),
      totalRowHtml("Total Due", payload.total),
      buttonHtml("Pay Securely Online", payload.paymentUrl),
      trackOrderLinkHtml(payload.orderId),
      headingHtml("What happens next"),
      numberedListHtml(QUOTE_STEPS),
      smallPrintHtml(
        `Payment is processed by Square. Card details never touch our site.${
          payHref ? "" : " Reply to this email if you need a new payment link."
        } Questions? Just reply to this email and mention ${escapeHtml(orderRef)}.`
      ),
      payHref
        ? smallPrintHtml(
            `If the button does not work, copy this link into your browser: ${linkHtml(payHref, payHref)}`
          )
        : "",
    ].join(""),
  });

  const text = joinText([
    greetingText(payload.firstName),
    "We've confirmed the final pricing for your merchandise order, including decoration, shipping, and tax. We place the order as soon as payment clears.",
    `Order reference: ${orderRef}`,
    items.length ? itemsText(items) : "",
    `Total Due: ${money(payload.total)}`,
    payHref ? `Pay securely online: ${payHref}` : "",
    trackOrderLinkText(payload.orderId),
    `What happens next:\n${numberedText(QUOTE_STEPS)}`,
    `Payment is processed by Square. Card details never touch our site. Questions? Just reply to this email and mention ${orderRef}.`,
    footerText(),
  ]);

  return { subject: subjectWithRef("Your quote and payment link", orderRef), html, text };
}

// ---------------------------------------------------------------------------
// Customer: payment received (receipt)
// ---------------------------------------------------------------------------

export interface MerchPaidEmailPayload {
  email: string;
  firstName: string;
  orderId: number;
  /** The quoted amount that was paid. Omitted when we don't have one on record. */
  amountPaid?: number;
  /** What the payment covers. Optional; quantities and prices are shown when present. */
  items?: CustomerOrderLine[];
}

const PAID_STEPS = [
  "We are placing your order now.",
  "We will email you again with tracking details when it ships.",
];

export function buildMerchPaidEmail(payload: MerchPaidEmailPayload): BuiltEmail {
  const orderRef = formatOrderReference(payload.orderId);
  const items = pickLines(payload.items ?? []);
  const hasAmount = typeof payload.amountPaid === "number";
  const title = "Payment received";

  const html = renderShell({
    title,
    preheader: `Thank you. We have your payment for ${orderRef}.`,
    bodyHtml: [
      greetingHtml(payload.firstName),
      paragraphHtml("Thank you. We have received your payment for your merchandise order."),
      referenceHtml(orderRef),
      itemsTableHtml(items),
      hasAmount ? totalRowHtml("Amount Paid", payload.amountPaid as number) : "",
      paragraphHtml(
        "We are placing your order now. We will email you again with tracking details when it ships."
      ),
      trackOrderLinkHtml(payload.orderId),
      smallPrintHtml(
        `Keep this email as your receipt. Questions? Just reply and mention ${escapeHtml(orderRef)}.`
      ),
    ].join(""),
  });

  const text = joinText([
    greetingText(payload.firstName),
    "Thank you. We have received your payment for your merchandise order.",
    `Order reference: ${orderRef}`,
    items.length ? itemsText(items) : "",
    hasAmount ? `Amount Paid: ${money(payload.amountPaid as number)}` : "",
    `What happens next:\n${numberedText(PAID_STEPS)}`,
    trackOrderLinkText(payload.orderId),
    `Keep this email as your receipt. Questions? Just reply and mention ${orderRef}.`,
    footerText(),
  ]);

  return { subject: subjectWithRef(title, orderRef), html, text };
}

// ---------------------------------------------------------------------------
// Customer: shipped
// ---------------------------------------------------------------------------

export interface MerchShippedEmailPayload {
  email: string;
  firstName: string;
  orderId: number;
  carrier: string;
  trackingNumber: string;
  /** What is in the shipment (name, color, quantity). Prices are not shown. */
  items?: CustomerOrderLine[];
}

export function buildMerchShippedEmail(payload: MerchShippedEmailPayload): BuiltEmail {
  const orderRef = formatOrderReference(payload.orderId);
  const carrierName = truncate(recognizeCarrier(payload.carrier) ?? payload.carrier, LIMITS.name);
  const trackingNumber = truncate(payload.trackingNumber, LIMITS.tracking);
  const trackingUrl = buildTrackingUrl(payload.carrier, payload.trackingNumber);
  const items = pickLines(payload.items ?? []).map(({ name, color, quantity }) => ({
    name,
    ...(color ? { color } : {}),
    quantity,
  }));
  const title = "Your order has shipped";

  const html = renderShell({
    title,
    preheader: `${orderRef} is on its way with ${carrierName}.`,
    bodyHtml: [
      greetingHtml(payload.firstName),
      paragraphHtml("Good news: your merchandise order is on its way."),
      referenceHtml(orderRef),
      fieldHtml("Carrier", escapeHtml(carrierName)),
      fieldHtml("Tracking Number", escapeHtml(trackingNumber)),
      trackingUrl
        ? buttonHtml("Track Your Package", trackingUrl)
        : smallPrintHtml(
            `Use the tracking number above on ${escapeHtml(carrierName)}'s website to follow your package.`
          ),
      items.length ? headingHtml("In this shipment") : "",
      itemsTableHtml(items),
      trackOrderLinkHtml(payload.orderId),
      smallPrintHtml(
        `It can take a while for tracking to show movement after a label is created. Questions? Just reply and mention ${escapeHtml(orderRef)}.`
      ),
    ].join(""),
  });

  const text = joinText([
    greetingText(payload.firstName),
    "Good news: your merchandise order is on its way.",
    `Order reference: ${orderRef}`,
    `Carrier: ${carrierName}\nTracking number: ${trackingNumber}`,
    trackingUrl
      ? `Track your package: ${trackingUrl}`
      : `Use the tracking number above on ${carrierName}'s website to follow your package.`,
    items.length ? `In this shipment:\n${itemsText(items)}` : "",
    trackOrderLinkText(payload.orderId),
    `It can take a while for tracking to show movement after a label is created. Questions? Just reply and mention ${orderRef}.`,
    footerText(),
  ]);

  return { subject: subjectWithRef(title, orderRef), html, text };
}

// ---------------------------------------------------------------------------
// Internal: new cart order notification (business inbox only)
// ---------------------------------------------------------------------------

export interface CartOrderNotificationPayload {
  /** Customer-facing reference such as MG-00042; absent only if the order couldn't be saved. */
  orderRef?: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  notes: string;
  items: PricedCartLineItem[];
  total: number;
  /** The shopper is attaching a logo; it uploads right after the order is saved. */
  logoComing?: boolean;
}

const ADMIN_ARTWORK_NONE =
  "No logo attached. The customer was asked to reply to their confirmation email with it.";
const ADMIN_ARTWORK_COMING =
  "The customer is attaching a logo. A separate email confirms when it arrives; if none comes, the upload failed and the customer was asked to reply with the file.";

/** Back-office lines for one cart item: color, sizes, imprint notes, and the ESP+ lookup details. */
function adminItemCellHtml(item: PricedCartLineItem): string {
  const sub = (innerHtml: string) =>
    `<div style="margin-top:2px;color:${COLORS.muted};font-size:13px;line-height:1.4;">${innerHtml}</div>`;
  const parts = [
    sub(escapeHtml(describeLineColor(item.color))),
    item.sizes?.trim()
      ? sub(`Sizes and quantities: ${escapeHtml(truncate(item.sizes.trim(), LIMITS.detail))}`)
      : "",
    item.imprintNotes?.trim()
      ? sub(`Imprint notes: ${escapeHtml(truncate(item.imprintNotes.trim(), LIMITS.detail))}`)
      : "",
  ];
  const esp: string[] = [];
  if (item.espUrl) {
    esp.push(
      linkHtml(
        item.espKind === "search" ? "Open in ESP+ (search link)" : "Open in ESP+",
        item.espUrl
      )
    );
  }
  if (item.supplier) esp.push(`Supplier: ${escapeHtml(item.supplier)}`);
  if (item.productNo) esp.push(`Product no. ${escapeHtml(item.productNo)}`);
  if (esp.length) parts.push(sub(esp.join(" &middot; ")));
  return `${escapeHtml(truncate(item.name, LIMITS.line))}${parts.join("")}`;
}

function adminItemText(item: PricedCartLineItem, index: number): string {
  const lines = [
    `${index + 1}. ${truncate(item.name, LIMITS.line)}`,
    `   ${describeLineColor(item.color)}`,
  ];
  if (item.sizes?.trim())
    lines.push(`   Sizes and quantities: ${truncate(item.sizes.trim(), LIMITS.detail)}`);
  if (item.imprintNotes?.trim())
    lines.push(`   Imprint notes: ${truncate(item.imprintNotes.trim(), LIMITS.detail)}`);
  lines.push(`   Qty ${item.quantity} x ${money(item.unitPrice)} = ${money(item.lineTotal)}`);
  if (item.espUrl) {
    lines.push(`   ESP+ link: ${item.espUrl}${item.espKind === "search" ? " (search link)" : ""}`);
  }
  if (item.supplier) lines.push(`   Supplier: ${item.supplier}`);
  if (item.productNo) lines.push(`   Product no.: ${item.productNo}`);
  return lines.join("\n");
}

const ADMIN_TH = `padding:8px 0;border-bottom:2px solid ${COLORS.ink};color:${COLORS.muted};font-size:12px;font-weight:700;letter-spacing:0.05em;text-transform:uppercase;`;
const ADMIN_TD = `padding:10px 0;border-bottom:1px solid ${COLORS.rule};color:${COLORS.ink};font-size:15px;line-height:1.4;vertical-align:top;`;

function adminItemsTableHtml(items: PricedCartLineItem[]): string {
  const head = `<th align="left" style="${ADMIN_TH}text-align:left;">Item</th><th align="right" style="${ADMIN_TH}text-align:right;padding-left:8px;">Qty</th><th align="right" style="${ADMIN_TH}text-align:right;padding-left:8px;">Unit</th><th align="right" style="${ADMIN_TH}text-align:right;padding-left:8px;">Line Total</th>`;
  const body = items
    .map(
      (item) =>
        `<tr><td align="left" style="${ADMIN_TD}text-align:left;word-break:break-word;">${adminItemCellHtml(item)}</td><td align="right" style="${ADMIN_TD}text-align:right;padding-left:8px;">${item.quantity}</td><td align="right" style="${ADMIN_TD}text-align:right;padding-left:8px;white-space:nowrap;">${money(item.unitPrice)}</td><td align="right" style="${ADMIN_TD}text-align:right;padding-left:8px;white-space:nowrap;">${money(item.lineTotal)}</td></tr>`
    )
    .join("");
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 8px;border-collapse:collapse;"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`;
}

export function buildCartOrderNotificationEmail(payload: CartOrderNotificationPayload): BuiltEmail {
  const fullName = truncate(`${payload.firstName} ${payload.lastName}`.trim(), LIMITS.name * 2);
  const email = truncate(payload.email, LIMITS.line);
  const phone = truncate(payload.phone, LIMITS.name);
  const notes = payload.notes?.trim() ? truncate(payload.notes.trim(), LIMITS.adminNotes) : "";
  const title = "New merchandise cart order";
  const artwork = payload.logoComing ? ADMIN_ARTWORK_COMING : ADMIN_ARTWORK_NONE;

  const html = renderShell({
    audience: "internal",
    title,
    preheader: `${payload.orderRef ?? "New order"}: ${fullName}, ${payload.items.length} ${payload.items.length === 1 ? "item" : "items"}, ${money(payload.total)} estimated.`,
    bodyHtml: [
      payload.orderRef ? fieldHtml("Order Reference", escapeHtml(payload.orderRef)) : "",
      fieldHtml("Name", escapeHtml(fullName)),
      fieldHtml("Email", escapeHtml(email)),
      fieldHtml("Phone", escapeHtml(phone)),
      adminItemsTableHtml(payload.items),
      totalRowHtml("Estimated Total", payload.total),
      notes ? fieldHtml("Notes", multiline(notes)) : "",
      fieldHtml("Logo", escapeHtml(artwork)),
    ].join(""),
  });

  const text = joinText([
    title,
    payload.orderRef ? `Order reference: ${payload.orderRef}` : "",
    `Name: ${fullName}\nEmail: ${email}\nPhone: ${phone}`,
    payload.items.map(adminItemText).join("\n"),
    `Estimated Total: ${money(payload.total)}`,
    notes ? `Notes:\n${notes}` : "",
    `Logo: ${artwork}`,
    footerText("internal"),
  ]);

  const lead = "New merchandise request from ";
  const prefix = payload.orderRef ? `${payload.orderRef}: ${lead}` : lead;
  const name = fitSubjectName(
    `${payload.firstName} ${payload.lastName}`.trim() || "a customer",
    Math.max(12, SUBJECT_TARGET_LENGTH - prefix.length)
  );

  return {
    subject: oneLine(`${prefix}${name}`),
    html,
    text,
  };
}

// ---------------------------------------------------------------------------
// Internal: a customer's logo arrived (sent after the upload succeeds)
// ---------------------------------------------------------------------------

export interface LogoAttachedNotificationPayload {
  orderId: number;
  /** Customer-facing reference such as MG-00042. */
  orderRef: string;
  filename: string;
  size: number;
  customerName?: string;
}

/**
 * Tells the business that a logo is now on an order. No attachment: it points
 * to the order in admin, where the file is behind the admin sign-in.
 */
export function buildLogoAttachedNotificationEmail(
  payload: LogoAttachedNotificationPayload
): BuiltEmail {
  const filename = truncate(oneLine(stripControl(payload.filename)), LIMITS.line);
  const adminUrl = `${getSiteUrl()}/admin/orders/${payload.orderId}`;
  const size = formatFileSize(payload.size);
  const title = "Logo attached to an order";
  const who = payload.customerName?.trim()
    ? truncate(payload.customerName.trim(), LIMITS.name * 2)
    : "";

  const html = renderShell({
    audience: "internal",
    title,
    preheader: `${payload.orderRef}: logo attached, ${filename}.`,
    bodyHtml: [
      fieldHtml("Order Reference", escapeHtml(payload.orderRef)),
      who ? fieldHtml("Customer", escapeHtml(who)) : "",
      fieldHtml("Logo attached", escapeHtml(size ? `${filename} (${size})` : filename)),
      paragraphHtml(
        `${linkHtml("Open the order in admin", adminUrl)} to view and download the file. It is not attached to this email.`
      ),
    ].join(""),
  });

  const text = joinText([
    title,
    `Order reference: ${payload.orderRef}`,
    who ? `Customer: ${who}` : "",
    `Logo attached: ${size ? `${filename} (${size})` : filename}`,
    `Open the order in admin to view and download the file (it is not attached to this email): ${adminUrl}`,
    footerText("internal"),
  ]);

  return {
    subject: oneLine(`${payload.orderRef}: Logo attached`),
    html,
    text,
  };
}
