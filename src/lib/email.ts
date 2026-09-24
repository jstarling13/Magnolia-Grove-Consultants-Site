import { Resend } from "resend";
import type { LeadFormPayload, StrategySessionPayload, PaymentRequestPayload } from "./validation";
import type { MerchOrderRequestPayload, PricedCartLineItem } from "./merchOrders";

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
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  notes: string;
  items: PricedCartLineItem[];
  total: number;
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
          <td style="padding:6px 0;color:#e5e5e5;font-size:14px;">${item.name}</td>
          <td style="padding:6px 0;color:#e5e5e5;font-size:14px;text-align:right;">${item.quantity}</td>
          <td style="padding:6px 0;color:#e5e5e5;font-size:14px;text-align:right;">$${item.unitPrice.toFixed(2)}</td>
          <td style="padding:6px 0;color:#e5e5e5;font-size:14px;text-align:right;">$${item.lineTotal.toFixed(2)}</td>
        </tr>`
    )
    .join("");

  const html = emailShell(
    "New Merchandise Cart Order",
    [
      row("Name", `${payload.firstName} ${payload.lastName}`),
      row("Email", payload.email),
      row("Phone", payload.phone),
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
      payload.notes ? row("Notes", payload.notes) : "",
    ].join("")
  );

  const { error } = await resend.emails.send({
    from: process.env.CONTACT_EMAIL_FROM!,
    to: process.env.CONTACT_EMAIL_TO || "ben@magnoliagrovega.com",
    replyTo: payload.email,
    subject: `New Merch Cart Order — ${payload.firstName} ${payload.lastName} (${payload.items.length} items, $${payload.total.toFixed(2)})`,
    html,
  });

  if (error) {
    console.error("[email] Resend rejected sendCartOrderNotification:", error);
    return { sent: false, reason: error.message };
  }

  return { sent: true };
}
