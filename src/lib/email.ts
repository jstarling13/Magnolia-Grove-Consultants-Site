import { Resend } from "resend";
import type { LeadFormPayload, StrategySessionPayload, PaymentRequestPayload } from "./validation";
import type { MerchOrderRequestPayload, PricedCartLineItem } from "./merchOrders";
import { describeLineColor } from "./merchBackendSheet";
import { buildTrackingUrl, formatOrderReference, recognizeCarrier } from "./merchOrders";
import { buildOrderTrackingUrl, parseOrderRef } from "./orderTracking";

const hasResendConfig =
  Boolean(process.env.RESEND_API_KEY) && Boolean(process.env.CONTACT_EMAIL_FROM);

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

const GOLD = "#c5a059";
const ONYX = "#0d0d0d";
const MUTED = "#a1a1a1";

function emailShell(title: string, bodyHtml: string): string {
  return `
  <div style="background:${ONYX};padding:32px 16px;font-family:Helvetica,Arial,sans-serif;">
    <div style="max-width:560px;margin:0 auto;background:#161616;border:1px solid rgba(197,160,89,0.25);border-radius:8px;overflow:hidden;">
      <div style="padding:24px 32px;border-bottom:1px solid rgba(197,160,89,0.15);">
        <span style="color:#ffffff;font-size:18px;font-weight:700;letter-spacing:0.02em;">Magnolia Grove<span style="color:${GOLD};">.</span></span>
      </div>
      <div style="padding:32px;">
        <h1 style="color:#ffffff;font-size:20px;margin:0 0 16px;">${title}</h1>
        ${bodyHtml}
      </div>
      <div style="padding:20px 32px;border-top:1px solid rgba(197,160,89,0.15);color:${MUTED};font-size:12px;">
        Magnolia Grove Consultants, LLC. All communications are confidential.
      </div>
    </div>
  </div>`;
}

function row(label: string, value: string): string {
  return `<p style="margin:0 0 12px;color:#e5e5e5;font-size:14px;"><strong style="color:${MUTED};text-transform:uppercase;font-size:11px;letter-spacing:0.05em;display:block;margin-bottom:2px;">${label}</strong>${value}</p>`;
}

interface SendResult {
  sent: boolean;
  reason?: string;
}

export async function sendLeadNotification(payload: LeadFormPayload): Promise<SendResult> {
  if (!resend || !hasResendConfig) {
    console.warn(
      "[email] RESEND_API_KEY / CONTACT_EMAIL_FROM not set — skipping admin notification."
    );
    return { sent: false, reason: "not_configured" };
  }

  const html = emailShell(
    "New Strategy Call Request",
    [
      row("Name", `${payload.firstName} ${payload.lastName}`),
      row("Email", payload.email),
      row("Phone", payload.phone),
      row("Service", payload.service),
      row("Message", payload.message.replace(/\n/g, "<br/>")),
    ].join("")
  );

  const { error } = await resend.emails.send({
    from: process.env.CONTACT_EMAIL_FROM!,
    to: process.env.CONTACT_EMAIL_TO || "ben@magnoliagrovega.com",
    replyTo: payload.email,
    subject: `New Strategy Call Request — ${payload.firstName} ${payload.lastName}`,
    html,
  });

  if (error) {
    console.error("[email] Resend rejected sendLeadNotification:", error);
    return { sent: false, reason: error.message };
  }

  return { sent: true };
}

export async function sendLeadAutoResponder(payload: LeadFormPayload): Promise<SendResult> {
  if (!resend || !hasResendConfig) return { sent: false, reason: "not_configured" };

  const html = emailShell(
    "Strategy Request Received",
    `<p style="color:#e5e5e5;font-size:14px;line-height:1.6;">Hi ${payload.firstName},</p>
     <p style="color:#e5e5e5;font-size:14px;line-height:1.6;">Strategy request received. A senior advisor will contact you within 12 hours under strict confidentiality.</p>`
  );

  const { error } = await resend.emails.send({
    from: process.env.CONTACT_EMAIL_FROM!,
    to: payload.email,
    subject: "We've received your strategy request — Magnolia Grove Consultants",
    html,
  });

  if (error) {
    console.error("[email] Resend rejected sendLeadAutoResponder:", error);
    return { sent: false, reason: error.message };
  }

  return { sent: true };
}

export async function sendStrategySessionNotification(
  payload: StrategySessionPayload
): Promise<SendResult> {
  if (!resend || !hasResendConfig) {
    console.warn(
      "[email] RESEND_API_KEY / CONTACT_EMAIL_FROM not set — skipping admin notification."
    );
    return { sent: false, reason: "not_configured" };
  }

  const html = emailShell(
    "New Strategy Session Intake",
    [
      row("Organization", payload.orgName),
      row("Contact", `${payload.contactName} — ${payload.role}`),
      row("Email", payload.email),
      row("Phone", payload.phone),
      row("Area of Interest", payload.pillar),
      row("Budget Range", payload.budget),
      row("Timeline", payload.timeline),
      row("Details", payload.message.replace(/\n/g, "<br/>")),
    ].join("")
  );

  const { error } = await resend.emails.send({
    from: process.env.CONTACT_EMAIL_FROM!,
    to: process.env.CONTACT_EMAIL_TO || "ben@magnoliagrovega.com",
    replyTo: payload.email,
    subject: `New Strategy Session Intake — ${payload.orgName}`,
    html,
  });

  if (error) {
    console.error("[email] Resend rejected sendStrategySessionNotification:", error);
    return { sent: false, reason: error.message };
  }

  return { sent: true };
}

export async function sendStrategySessionAutoResponder(
  payload: StrategySessionPayload
): Promise<SendResult> {
  if (!resend || !hasResendConfig) return { sent: false, reason: "not_configured" };

  const html = emailShell(
    "Consultation Booked",
    `<p style="color:#e5e5e5;font-size:14px;line-height:1.6;">Hi ${payload.contactName},</p>
     <p style="color:#e5e5e5;font-size:14px;line-height:1.6;">Consultation booked. You will receive an invitation with encrypted meeting details shortly.</p>
     <p style="color:#e5e5e5;font-size:14px;line-height:1.6;">All consultations and project briefs are held under absolute client-advisor confidentiality.</p>`
  );

  const { error } = await resend.emails.send({
    from: process.env.CONTACT_EMAIL_FROM!,
    to: payload.email,
    subject: "Strategy Session Confirmed — Magnolia Grove Consultants",
    html,
  });

  if (error) {
    console.error("[email] Resend rejected sendStrategySessionAutoResponder:", error);
    return { sent: false, reason: error.message };
  }

  return { sent: true };
}

export async function sendPaymentRequestNotification(
  payload: PaymentRequestPayload
): Promise<SendResult> {
  if (!resend || !hasResendConfig) {
    console.warn(
      "[email] RESEND_API_KEY / CONTACT_EMAIL_FROM not set — skipping payment notification."
    );
    return { sent: false, reason: "not_configured" };
  }

  const html = emailShell(
    "New Payment Request",
    [
      row("Organization", payload.organizationName),
      row("Contact", `${payload.firstName} ${payload.lastName}`),
      row("Email", payload.email),
      row("Amount", `$${payload.amount.toFixed(2)}`),
      row("Note / Invoice Reference", payload.memo),
    ].join("")
  );

  const { error } = await resend.emails.send({
    from: process.env.CONTACT_EMAIL_FROM!,
    to: process.env.CONTACT_EMAIL_TO || "ben@magnoliagrovega.com",
    replyTo: payload.email,
    subject: `New Payment Request — ${payload.organizationName} ($${payload.amount.toFixed(2)})`,
    html,
  });

  if (error) {
    console.error("[email] Resend rejected sendPaymentRequestNotification:", error);
    return { sent: false, reason: error.message };
  }

  return { sent: true };
}

export async function sendMerchOrderNotification(
  payload: MerchOrderRequestPayload
): Promise<SendResult> {
  if (!resend || !hasResendConfig) {
    console.warn(
      "[email] RESEND_API_KEY / CONTACT_EMAIL_FROM not set — skipping merch order notification."
    );
    return { sent: false, reason: "not_configured" };
  }

  const html = emailShell(
    "New Merchandise Order Request",
    [
      row("Name", `${payload.firstName} ${payload.lastName}`),
      row("Email", payload.email),
      row("Phone", payload.phone),
      row("Product", payload.product),
      row("Quantity", payload.quantity),
      payload.budget ? row("Budget", payload.budget) : "",
      payload.deadline ? row("Deadline", payload.deadline) : "",
      payload.notes ? row("Notes", payload.notes) : "",
    ].join("")
  );

  const { error } = await resend.emails.send({
    from: process.env.CONTACT_EMAIL_FROM!,
    to: process.env.CONTACT_EMAIL_TO || "ben@magnoliagrovega.com",
    replyTo: payload.email,
    subject: `New Merch Order Request — ${payload.firstName} ${payload.lastName} (${payload.product})`,
    html,
  });

  if (error) {
    console.error("[email] Resend rejected sendMerchOrderNotification:", error);
    return { sent: false, reason: error.message };
  }

  return { sent: true };
}

interface CartOrderNotificationPayload {
  /** Customer-facing reference such as MG-00042; absent only if the order couldn't be saved. */
  orderRef?: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  notes: string;
  items: PricedCartLineItem[];
  total: number;
}

/**
 * Internal ESP+ lookup details for one cart line. Business-inbox only: this
 * helper is used by sendCartOrderNotification and nowhere customer-facing.
 */
function espDetailsHtml(item: PricedCartLineItem): string {
  const parts: string[] = [];
  if (item.espUrl) {
    const label = item.espKind === "search" ? "Open in ESP+ (search link)" : "Open in ESP+";
    parts.push(
      `<a href="${escapeHtml(item.espUrl)}" style="color:${GOLD};text-decoration:underline;">${label}</a>`
    );
  }
  if (item.supplier) parts.push(`Supplier: ${escapeHtml(item.supplier)}`);
  if (item.productNo) parts.push(`Product no. ${escapeHtml(item.productNo)}`);
  if (parts.length === 0) return "";
  return `<div style="margin-top:2px;color:${MUTED};font-size:12px;">${parts.join(" &middot; ")}</div>`;
}

export async function sendCartOrderNotification(
  payload: CartOrderNotificationPayload
): Promise<SendResult> {
  if (!resend || !hasResendConfig) {
    console.warn(
      "[email] RESEND_API_KEY / CONTACT_EMAIL_FROM not set — skipping cart order notification."
    );
    return { sent: false, reason: "not_configured" };
  }

  const itemsHtml = payload.items
    .map(
      (item) =>
        `<tr>
          <td style="padding:6px 0;color:#e5e5e5;font-size:14px;">${escapeHtml(item.name)}<div style="margin-top:2px;color:${MUTED};font-size:12px;">${escapeHtml(describeLineColor(item.color))}</div>${espDetailsHtml(item)}</td>
          <td style="padding:6px 0;color:#e5e5e5;font-size:14px;text-align:right;vertical-align:top;">${item.quantity}</td>
          <td style="padding:6px 0;color:#e5e5e5;font-size:14px;text-align:right;vertical-align:top;">$${item.unitPrice.toFixed(2)}</td>
          <td style="padding:6px 0;color:#e5e5e5;font-size:14px;text-align:right;vertical-align:top;">$${item.lineTotal.toFixed(2)}</td>
        </tr>`
    )
    .join("");

  const html = emailShell(
    "New Merchandise Cart Order",
    [
      payload.orderRef ? row("Order Reference", escapeHtml(payload.orderRef)) : "",
      row("Name", escapeHtml(`${payload.firstName} ${payload.lastName}`)),
      row("Email", escapeHtml(payload.email)),
      row("Phone", escapeHtml(payload.phone)),
      `<table style="width:100%;border-collapse:collapse;margin:16px 0;">
        <thead>
          <tr style="border-bottom:1px solid rgba(197,160,89,0.25);">
            <th style="text-align:left;color:${MUTED};text-transform:uppercase;font-size:11px;letter-spacing:0.05em;padding-bottom:6px;">Item</th>
            <th style="text-align:right;color:${MUTED};text-transform:uppercase;font-size:11px;letter-spacing:0.05em;padding-bottom:6px;">Qty</th>
            <th style="text-align:right;color:${MUTED};text-transform:uppercase;font-size:11px;letter-spacing:0.05em;padding-bottom:6px;">Unit</th>
            <th style="text-align:right;color:${MUTED};text-transform:uppercase;font-size:11px;letter-spacing:0.05em;padding-bottom:6px;">Line Total</th>
          </tr>
        </thead>
        <tbody>${itemsHtml}</tbody>
      </table>`,
      row("Estimated Total", `$${payload.total.toFixed(2)}`),
      payload.notes ? row("Notes", multiline(payload.notes)) : "",
    ].join("")
  );

  const { error } = await resend.emails.send({
    from: process.env.CONTACT_EMAIL_FROM!,
    to: process.env.CONTACT_EMAIL_TO || "ben@magnoliagrovega.com",
    replyTo: payload.email,
    subject: oneLine(
      `New Merch Cart Order${payload.orderRef ? ` ${payload.orderRef}` : ""} — ${payload.firstName} ${payload.lastName} (${payload.items.length} items, $${payload.total.toFixed(2)})`
    ),
    html,
  });

  if (error) {
    console.error("[email] Resend rejected sendCartOrderNotification:", error);
    return { sent: false, reason: error.message };
  }

  return { sent: true };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Escapes, then keeps the author's line breaks. */
function multiline(value: string): string {
  return escapeHtml(value).replace(/\r?\n/g, "<br/>");
}

/** Header-safe single line for use in an email subject. */
function oneLine(value: string): string {
  return value.replace(/[\r\n]+/g, " ").trim();
}

function businessInbox(): string {
  return process.env.CONTACT_EMAIL_TO || "ben@magnoliagrovega.com";
}

function paragraph(innerHtml: string): string {
  return `<p style="color:#e5e5e5;font-size:14px;line-height:1.6;">${innerHtml}</p>`;
}

function greeting(firstName: string): string {
  return paragraph(`Hi ${escapeHtml(firstName.trim()) || "there"},`);
}

/**
 * What a customer may see of a cart line: no supplier, product number, or link
 * fields exist on this type, and the builders copy only these fields, so
 * backend-only data on the stored line can never reach a customer email.
 */
export interface CustomerOrderLine {
  name: string;
  color?: string;
  quantity: number;
  unitPrice?: number;
  lineTotal?: number;
}

function money(value: number): string {
  return `$${value.toFixed(2)}`;
}

function headerCell(label: string, align: "left" | "right"): string {
  return `<th style="text-align:${align};color:${MUTED};text-transform:uppercase;font-size:11px;letter-spacing:0.05em;padding-bottom:6px;">${label}</th>`;
}

function bodyCell(innerHtml: string, align: "left" | "right" = "right"): string {
  return `<td style="padding:6px 0;color:#e5e5e5;font-size:14px;text-align:${align};vertical-align:top;">${innerHtml}</td>`;
}

function itemNameCell(item: CustomerOrderLine): string {
  const color = item.color?.trim();
  return bodyCell(
    `${escapeHtml(item.name)}${color ? `<div style="margin-top:2px;color:${MUTED};font-size:12px;">${escapeHtml(color)}</div>` : ""}`,
    "left"
  );
}

function allPriced(items: CustomerOrderLine[]): boolean {
  return items.every(
    (item) => typeof item.unitPrice === "number" && typeof item.lineTotal === "number"
  );
}

function customerItemsTable(items: CustomerOrderLine[]): string {
  const showPrices = allPriced(items);
  const head = [
    headerCell("Item", "left"),
    headerCell("Qty", "right"),
    ...(showPrices ? [headerCell("Unit", "right"), headerCell("Line Total", "right")] : []),
  ].join("");
  const body = items
    .map(
      (item) =>
        `<tr>${itemNameCell(item)}${bodyCell(String(item.quantity))}${
          showPrices
            ? bodyCell(money(item.unitPrice as number)) + bodyCell(money(item.lineTotal as number))
            : ""
        }</tr>`
    )
    .join("");
  return `<table style="width:100%;border-collapse:collapse;margin:16px 0;">
        <thead><tr style="border-bottom:1px solid rgba(197,160,89,0.25);">${head}</tr></thead>
        <tbody>${body}</tbody>
      </table>`;
}

/** Copies only the customer-safe fields, dropping anything else stored on the line. */
function pickLines(items: CustomerOrderLine[]): CustomerOrderLine[] {
  return items.map(({ name, color, quantity, unitPrice, lineTotal }) => ({
    name,
    ...(color ? { color } : {}),
    quantity,
    ...(typeof unitPrice === "number" ? { unitPrice } : {}),
    ...(typeof lineTotal === "number" ? { lineTotal } : {}),
  }));
}

export interface BuiltEmail {
  subject: string;
  html: string;
}

// ---------------------------------------------------------------------------
// Customer: request confirmation (sent right after a cart is submitted)
// ---------------------------------------------------------------------------

/**
 * "Track your order" link block for the customer order emails. Empty when
 * ORDER_LINK_SECRET is unset (or the order has no id), so emails simply go out
 * without it. Accepts the numeric id or a reference such as "MG-00042".
 */
export function trackOrderLinkHtml(order: number | string | undefined): string {
  const id = typeof order === "string" ? parseOrderRef(order) : order;
  if (id === undefined) return "";
  const url = buildOrderTrackingUrl(id);
  if (!url) return "";
  return `<p style="margin:16px 0;font-size:14px;"><a href="${escapeHtml(url)}" style="color:${GOLD};font-weight:700;text-decoration:underline;">Track your order &rarr;</a><br/><span style="color:${MUTED};font-size:12px;">See the current status of your order any time.</span></p>`;
}

export interface MerchRequestConfirmationPayload {
  email: string;
  firstName: string;
  /** Customer-facing reference such as MG-00042; omitted only if the order couldn't be saved. */
  orderRef?: string;
  items: CustomerOrderLine[];
  /** Estimated subtotal at the shared quantity tier, before decoration, shipping, and tax. */
  total: number;
  notes?: string;
}

export function buildMerchRequestConfirmationEmail(
  payload: MerchRequestConfirmationPayload
): BuiltEmail {
  const items = pickLines(payload.items);
  const html = emailShell(
    "We Received Your Merchandise Request",
    [
      greeting(payload.firstName),
      paragraph(
        "Thank you for your request. <strong>Nothing has been charged.</strong> This confirms that we have it, with a summary of what you asked for."
      ),
      payload.orderRef ? row("Order Reference", escapeHtml(payload.orderRef)) : "",
      customerItemsTable(items),
      row("Estimated Subtotal", money(payload.total)),
      paragraph(
        `<span style="color:${MUTED};font-size:12px;">Unit prices reflect the quantity tier for each product across all of its colors. This estimate does not yet include decoration, shipping, or tax.</span>`
      ),
      payload.notes?.trim() ? row("Your Notes", multiline(payload.notes.trim())) : "",
      trackOrderLinkHtml(payload.orderRef),
      `<h2 style="color:#ffffff;font-size:16px;margin:24px 0 8px;">What happens next</h2>`,
      `<ol style="color:#e5e5e5;font-size:14px;line-height:1.7;margin:0 0 16px;padding-left:20px;">
        <li>We confirm decoration, shipping, and sales tax for your order.</li>
        <li>We email you a final quote with a secure link to pay.</li>
        <li>We place your order with our supplier after your payment clears, and email you tracking details when it ships.</li>
      </ol>`,
      paragraph(
        `<span style="color:${MUTED};font-size:12px;">Questions or changes? Just reply to this email${payload.orderRef ? ` and mention ${escapeHtml(payload.orderRef)}` : ""}.</span>`
      ),
    ].join("")
  );
  return {
    subject: oneLine(
      payload.orderRef
        ? `We received your merchandise request — ${payload.orderRef}`
        : "We received your merchandise request"
    ),
    html,
  };
}

/** Acknowledges a submitted cart to the customer. Callers must not let a failure here fail the order. */
export async function sendMerchRequestConfirmation(
  payload: MerchRequestConfirmationPayload
): Promise<SendResult> {
  if (!resend || !hasResendConfig) {
    console.warn(
      "[email] RESEND_API_KEY / CONTACT_EMAIL_FROM not set — skipping merch request confirmation."
    );
    return { sent: false, reason: "not_configured" };
  }

  const { subject, html } = buildMerchRequestConfirmationEmail(payload);
  const { error } = await resend.emails.send({
    from: process.env.CONTACT_EMAIL_FROM!,
    to: payload.email,
    replyTo: businessInbox(),
    subject,
    html,
  });

  if (error) {
    console.error("[email] Resend rejected sendMerchRequestConfirmation:", error);
    return { sent: false, reason: error.message };
  }
  return { sent: true };
}

// ---------------------------------------------------------------------------
// Customer: payment link (the final quote)
// ---------------------------------------------------------------------------

export interface MerchPaymentLinkEmailPayload {
  email: string;
  firstName: string;
  orderId: number;
  total: number;
  paymentUrl: string;
}

/** Sent to the customer once an admin has confirmed the final quote and generated the Square link. */
export async function sendMerchPaymentLinkEmail(
  payload: MerchPaymentLinkEmailPayload
): Promise<SendResult> {
  if (!resend || !hasResendConfig) {
    console.warn(
      "[email] RESEND_API_KEY / CONTACT_EMAIL_FROM not set — skipping merch payment link email."
    );
    return { sent: false, reason: "not_configured" };
  }

  const orderRef = formatOrderReference(payload.orderId);
  const html = emailShell(
    "Your Merchandise Quote Is Ready",
    `<p style="color:#e5e5e5;font-size:14px;line-height:1.6;">Hi ${escapeHtml(payload.firstName) || "there"},</p>
     <p style="color:#e5e5e5;font-size:14px;line-height:1.6;">We've confirmed the final pricing for your merchandise order, including decoration, shipping, and tax. We place the order with our supplier as soon as payment clears.</p>
     ${row("Order Reference", orderRef)}
     ${row("Total Due", `$${payload.total.toFixed(2)}`)}
     <p style="margin:24px 0;"><a href="${escapeHtml(payload.paymentUrl)}" style="display:inline-block;background:${GOLD};color:${ONYX};font-size:14px;font-weight:700;text-decoration:none;border-radius:6px;padding:12px 24px;">Pay Securely Online &rarr;</a></p>
     ${trackOrderLinkHtml(payload.orderId)}
     <p style="color:${MUTED};font-size:12px;line-height:1.6;">Payment is processed by Square. Card details never touch our site. Questions? Just reply to this email.</p>`
  );

  const { error } = await resend.emails.send({
    from: process.env.CONTACT_EMAIL_FROM!,
    to: payload.email,
    replyTo: businessInbox(),
    subject: `Your Merchandise Quote Is Ready — ${orderRef}`,
    html,
  });

  if (error) {
    console.error("[email] Resend rejected sendMerchPaymentLinkEmail:", error);
    return { sent: false, reason: error.message };
  }

  return { sent: true };
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
}

export function buildMerchPaidEmail(payload: MerchPaidEmailPayload): BuiltEmail {
  const orderRef = formatOrderReference(payload.orderId);
  const html = emailShell(
    "Payment Received",
    [
      greeting(payload.firstName),
      paragraph("Thank you. We have received your payment for your merchandise order."),
      row("Order Reference", escapeHtml(orderRef)),
      typeof payload.amountPaid === "number" ? row("Amount Paid", money(payload.amountPaid)) : "",
      paragraph(
        "We are placing your order with our supplier now. We will email you again with tracking details when it ships."
      ),
      trackOrderLinkHtml(payload.orderId),
      paragraph(
        `<span style="color:${MUTED};font-size:12px;">Keep this email as your receipt. Questions? Just reply and mention ${escapeHtml(orderRef)}.</span>`
      ),
    ].join("")
  );
  return { subject: `Payment received — ${orderRef}`, html };
}

export async function sendMerchPaidEmail(payload: MerchPaidEmailPayload): Promise<SendResult> {
  if (!resend || !hasResendConfig) {
    console.warn(
      "[email] RESEND_API_KEY / CONTACT_EMAIL_FROM not set — skipping merch payment received email."
    );
    return { sent: false, reason: "not_configured" };
  }

  const { subject, html } = buildMerchPaidEmail(payload);
  const { error } = await resend.emails.send({
    from: process.env.CONTACT_EMAIL_FROM!,
    to: payload.email,
    replyTo: businessInbox(),
    subject,
    html,
  });

  if (error) {
    console.error("[email] Resend rejected sendMerchPaidEmail:", error);
    return { sent: false, reason: error.message };
  }
  return { sent: true };
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
  const carrierName = recognizeCarrier(payload.carrier) ?? payload.carrier;
  const trackingUrl = buildTrackingUrl(payload.carrier, payload.trackingNumber);
  const items = pickLines(payload.items ?? []).map(({ name, color, quantity }) => ({
    name,
    ...(color ? { color } : {}),
    quantity,
  }));

  const html = emailShell(
    "Your Order Has Shipped",
    [
      greeting(payload.firstName),
      paragraph("Good news: your merchandise order is on its way."),
      row("Order Reference", escapeHtml(orderRef)),
      row("Carrier", escapeHtml(carrierName)),
      row("Tracking Number", escapeHtml(payload.trackingNumber)),
      trackingUrl
        ? `<p style="margin:24px 0;"><a href="${escapeHtml(trackingUrl)}" style="display:inline-block;background:${GOLD};color:${ONYX};font-size:14px;font-weight:700;text-decoration:none;border-radius:6px;padding:12px 24px;">Track Your Package &rarr;</a></p>`
        : paragraph(
            `<span style="color:${MUTED};font-size:12px;">Use the tracking number above on ${escapeHtml(carrierName)}'s website to follow your package.</span>`
          ),
      items.length ? customerItemsTable(items) : "",
      trackOrderLinkHtml(payload.orderId),
      paragraph(
        `<span style="color:${MUTED};font-size:12px;">Tracking can take a few hours to show movement after a label is created. Questions? Just reply and mention ${escapeHtml(orderRef)}.</span>`
      ),
    ].join("")
  );
  return { subject: `Your order has shipped — ${orderRef}`, html };
}

export async function sendMerchShippedEmail(
  payload: MerchShippedEmailPayload
): Promise<SendResult> {
  if (!resend || !hasResendConfig) {
    console.warn(
      "[email] RESEND_API_KEY / CONTACT_EMAIL_FROM not set — skipping merch shipped email."
    );
    return { sent: false, reason: "not_configured" };
  }

  const { subject, html } = buildMerchShippedEmail(payload);
  const { error } = await resend.emails.send({
    from: process.env.CONTACT_EMAIL_FROM!,
    to: payload.email,
    replyTo: businessInbox(),
    subject,
    html,
  });

  if (error) {
    console.error("[email] Resend rejected sendMerchShippedEmail:", error);
    return { sent: false, reason: error.message };
  }
  return { sent: true };
}
