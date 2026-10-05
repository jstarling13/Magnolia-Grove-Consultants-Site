"use server";

import { sql } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { createPaymentLink } from "@/lib/square";
import { sendMerchPaymentLinkEmail } from "@/lib/email";
import type { SubmissionRow } from "@/components/admin/Dashboard";
import {
  MERCH_ORDER_STATUSES,
  MERCH_ORDER_STATUS_LABELS,
  canSetMerchStatus,
  parseQuoteAmount,
  type MerchOrderStatus,
  type StatusChangeResult,
} from "@/lib/merchOrders";
import { ADMIN_SESSION_COOKIE, verifySessionToken } from "@/lib/adminAuth";

// Middleware guards /admin pages, but server actions are separately
// invokable endpoints — so the actions that move money or send customer
// email re-check the admin session themselves.
async function isAdminSession(): Promise<boolean> {
  const cookieStore = await cookies();
  return Boolean(verifySessionToken(cookieStore.get(ADMIN_SESSION_COOKIE)?.value));
}

export async function markSubmissionRead(id: number): Promise<void> {
  await sql`UPDATE submissions SET read_at = now() WHERE id = ${id} AND read_at IS NULL`;
  revalidatePath("/admin");
}

// No supplier order is ever placed automatically — this only records that
// an admin manually advanced the order (e.g. after placing it in ESP
// themselves). Ordering from ESP is refused until payment is confirmed.
export async function updateMerchOrderStatus(
  id: number,
  status: string
): Promise<StatusChangeResult> {
  if (!(await isAdminSession())) return { ok: false, error: "Not authorized." };
  if (!MERCH_ORDER_STATUSES.includes(status as MerchOrderStatus)) {
    return { ok: false, error: "Unknown status." };
  }

  const rows = (await sql`
    SELECT data FROM submissions WHERE id = ${id} AND type = 'merch_order'
  `) as { data: Record<string, unknown> }[];
  if (!rows[0]) return { ok: false, error: "Order not found." };

  const allowed = canSetMerchStatus(rows[0].data, status as MerchOrderStatus);
  if (!allowed.ok) return allowed;

  if (status === "paid" && typeof rows[0].data.paidAt !== "string") {
    // Payment arrived outside Square (check, bank transfer) — the admin is
    // vouching for it, so it's flagged and timestamped rather than silent.
    const patch = { status, paidAt: new Date().toISOString(), paidManually: true };
    await sql`
      UPDATE submissions
      SET data = data || ${JSON.stringify(patch)}::jsonb
      WHERE id = ${id} AND type = 'merch_order'
    `;
  } else {
    await sql`
      UPDATE submissions
      SET data = jsonb_set(data, '{status}', to_jsonb(${status}::text))
      WHERE id = ${id} AND type = 'merch_order'
    `;
  }
  revalidatePath("/admin");
  return { ok: true };
}

export type SendPaymentLinkResult =
  { ok: true; url: string; emailed: boolean } | { ok: false; error: string };

const LOCKED_STATUSES: readonly MerchOrderStatus[] = [
  "paid",
  "ordered_in_esp",
  "fulfilled",
  "cancelled",
];

/**
 * Turns a reviewed order into a payable quote: creates a Square payment
 * link for the final amount, stores it on the order, flips it to
 * "awaiting_payment", and emails the customer. The ESP order is only
 * placed after the link is paid (see canSetMerchStatus).
 */
export async function sendMerchPaymentLink(
  id: number,
  quotedTotal: number
): Promise<SendPaymentLinkResult> {
  if (!(await isAdminSession())) return { ok: false, error: "Not authorized." };

  const amount = parseQuoteAmount(quotedTotal);
  if (!amount.ok) return amount;

  const rows = (await sql`
    SELECT data FROM submissions WHERE id = ${id} AND type = 'merch_order'
  `) as { data: Record<string, unknown> }[];
  const data = rows[0]?.data;
  if (!data) return { ok: false, error: "Order not found." };

  const currentStatus = String(data.status ?? "new") as MerchOrderStatus;
  if (LOCKED_STATUSES.includes(currentStatus)) {
    return {
      ok: false,
      error: `This order is already ${MERCH_ORDER_STATUS_LABELS[currentStatus] ?? currentStatus}.`,
    };
  }

  const email = typeof data.email === "string" ? data.email : "";
  const firstName = typeof data.firstName === "string" ? data.firstName : "";
  const lastName = typeof data.lastName === "string" ? data.lastName : "";
  if (!email) return { ok: false, error: "This order has no customer email." };

  const link = await createPaymentLink({
    organizationName: `${firstName} ${lastName}`.trim() || "Merchandise",
    memo: `Merchandise order #${id}`,
    amountCents: amount.cents,
    buyerEmail: email,
    redirectSource: "merch",
  });
  if (!link.url) {
    return {
      ok: false,
      error:
        link.error === "not_configured"
          ? "Square isn't configured (SQUARE_ACCESS_TOKEN / SQUARE_LOCATION_ID)."
          : "Square couldn't create the payment link. Try again.",
    };
  }

  const patch = {
    status: "awaiting_payment",
    quotedTotal: amount.cents / 100,
    quotedAt: new Date().toISOString(),
    paymentLinkId: link.id ?? "",
    paymentUrl: link.url,
  };
  await sql`
    UPDATE submissions
    SET data = data || ${JSON.stringify(patch)}::jsonb
    WHERE id = ${id} AND type = 'merch_order'
  `;

  const emailResult = await sendMerchPaymentLinkEmail({
    email,
    firstName,
    orderId: id,
    total: amount.cents / 100,
    paymentUrl: link.url,
  });

  revalidatePath("/admin");
  return { ok: true, url: link.url, emailed: emailResult.sent };
}

// Deliverables storage isn't wired up yet — these keep the Dashboard UI
// compiling until that feature lands.
export async function addDeliverable(
  _submissionId: number,
  _submissionType: SubmissionRow["type"],
  _label: string,
  _url: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  return { ok: false, error: "Deliverables aren't available yet." };
}

export async function deleteDeliverable(_id: number): Promise<void> {}
