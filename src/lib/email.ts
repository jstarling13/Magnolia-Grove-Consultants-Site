import { Resend } from "resend";
import type { LeadFormPayload, StrategySessionPayload } from "./validation";

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

  await resend.emails.send({
    from: process.env.CONTACT_EMAIL_FROM!,
    to: process.env.CONTACT_EMAIL_TO || "ben@magnoliagrovega.com",
    replyTo: payload.email,
    subject: `New Strategy Call Request — ${payload.firstName} ${payload.lastName}`,
    html,
  });

  return { sent: true };
}

export async function sendLeadAutoResponder(payload: LeadFormPayload): Promise<SendResult> {
  if (!resend || !hasResendConfig) return { sent: false, reason: "not_configured" };

  const html = emailShell(
    "Strategy Request Received",
    `<p style="color:#e5e5e5;font-size:14px;line-height:1.6;">Hi ${payload.firstName},</p>
     <p style="color:#e5e5e5;font-size:14px;line-height:1.6;">Strategy request received. A senior advisor will contact you within 12 hours under strict confidentiality.</p>`
  );

  await resend.emails.send({
    from: process.env.CONTACT_EMAIL_FROM!,
    to: payload.email,
    subject: "We've received your strategy request — Magnolia Grove Consultants",
    html,
  });

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

  await resend.emails.send({
    from: process.env.CONTACT_EMAIL_FROM!,
    to: process.env.CONTACT_EMAIL_TO || "ben@magnoliagrovega.com",
    replyTo: payload.email,
    subject: `New Strategy Session Intake — ${payload.orgName}`,
    html,
  });

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

  await resend.emails.send({
    from: process.env.CONTACT_EMAIL_FROM!,
    to: payload.email,
    subject: "Strategy Session Confirmed — Magnolia Grove Consultants",
    html,
  });

  return { sent: true };
}
