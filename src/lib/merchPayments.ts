import { sql } from "./db";
import { getPaymentLinkStatus } from "./square";
import { sendMerchPaidEmail } from "./email";

interface SyncableRow {
  id: number;
  type: string;
  data: Record<string, unknown>;
}

export type PaidEmailOutcome = "sent" | "already_sent" | "no_email" | "failed";

/**
 * Emails the customer a payment receipt, at most once per order. It claims the
 * send first by stamping paidEmailSentAt with a conditional WHERE (only rows
 * that don't have the stamp match), so concurrent dashboard loads or a retried
 * action can't both send. If the send itself fails the stamp is released so the
 * record never claims an email that didn't go out.
 *
 * Only call this at the moment an order is first marked paid; it deliberately
 * never scans older paid orders, so orders paid before this existed don't get a
 * surprise email.
 */
export async function sendMerchPaidEmailOnce(
  id: number,
  data: Record<string, unknown>
): Promise<PaidEmailOutcome> {
  const email = typeof data.email === "string" ? data.email.trim() : "";
  if (!email) return "no_email";

  const claim = JSON.stringify({ paidEmailSentAt: new Date().toISOString() });
  const claimed = (await sql`
    UPDATE submissions
    SET data = data || ${claim}::jsonb
    WHERE id = ${id} AND type = 'merch_order' AND data->>'paidEmailSentAt' IS NULL
    RETURNING id
  `) as { id: number }[];
  if (!claimed || claimed.length === 0) return "already_sent";

  try {
    const result = await sendMerchPaidEmail({
      email,
      firstName: typeof data.firstName === "string" ? data.firstName : "",
      orderId: id,
      ...(typeof data.quotedTotal === "number" ? { amountPaid: data.quotedTotal } : {}),
    });
    if (result.sent) return "sent";
  } catch (error) {
    console.error(`[merchPayments] paid email threw for submission ${id}:`, error);
  }

  try {
    await sql`
      UPDATE submissions SET data = data - 'paidEmailSentAt'
      WHERE id = ${id} AND type = 'merch_order'
    `;
  } catch (error) {
    console.error(`[merchPayments] couldn't release paid email claim for ${id}:`, error);
  }
  return "failed";
}

const RECEIPT_RETRY_WINDOW_MS = 14 * 24 * 60 * 60 * 1000;

/**
 * A receipt that failed to send releases its claim (see sendMerchPaidEmailOnce)
 * but the order is no longer "awaiting payment", so no sync would ever try
 * again. Retry for orders paid in the last two weeks that never got one; the
 * window keeps old, pre-feature orders from suddenly emailing their customers.
 */
export async function retryMissingPaidReceipts(
  rows: SyncableRow[],
  now = Date.now()
): Promise<void> {
  const due = rows.filter((row) => {
    if (row.type !== "merch_order" || row.data.status === "cancelled") return false;
    if (typeof row.data.paidAt !== "string" || row.data.paidEmailSentAt !== undefined) return false;
    const paidAt = Date.parse(row.data.paidAt);
    return Number.isFinite(paidAt) && now - paidAt <= RECEIPT_RETRY_WINDOW_MS;
  });

  await Promise.all(
    due.map(async (row) => {
      try {
        const outcome = await sendMerchPaidEmailOnce(row.id, row.data);
        if (outcome === "sent") {
          row.data = { ...row.data, paidEmailSentAt: new Date().toISOString() };
        }
      } catch (error) {
        console.error(`[merchPayments] receipt retry failed for submission ${row.id}:`, error);
      }
    })
  );
}

/**
 * Square has no webhook receiver wired up here, so payment is detected by
 * polling: any merch order awaiting payment is checked against Square and
 * promoted to "paid" (with a timestamp) the moment its order completes. The
 * customer's receipt email goes out only for the load that actually made the
 * transition. Mutates the passed rows so the caller renders the fresh state.
 */
export async function syncAwaitingMerchPayments(rows: SyncableRow[]): Promise<void> {
  const pending = rows.filter(
    (row) =>
      row.type === "merch_order" &&
      row.data.status === "awaiting_payment" &&
      typeof row.data.paymentLinkId === "string"
  );

  await Promise.all(
    pending.map(async (row) => {
      try {
        const status = await getPaymentLinkStatus(row.data.paymentLinkId as string);
        if (status !== "paid") return;

        const patch = { status: "paid", paidAt: new Date().toISOString() };
        const updated = (await sql`
          UPDATE submissions
          SET data = data || ${JSON.stringify(patch)}::jsonb
          WHERE id = ${row.id} AND type = 'merch_order' AND data->>'status' = 'awaiting_payment'
          RETURNING id
        `) as { id: number }[];
        row.data = { ...row.data, ...patch };

        // Zero rows means another load already made the transition (and sends the receipt).
        if (updated.length > 0) {
          const outcome = await sendMerchPaidEmailOnce(row.id, row.data);
          if (outcome === "sent") {
            row.data = { ...row.data, paidEmailSentAt: new Date().toISOString() };
          }
        }
      } catch (error) {
        console.error(`[merchPayments] sync failed for submission ${row.id}:`, error);
      }
    })
  );

  await retryMissingPaidReceipts(rows);
}

/**
 * Webhook entry point: loads every merch order currently awaiting payment (a
 * small set, capped defensively) and runs the normal sync over them. The
 * webhook never maps Square event ids to orders itself; each candidate is
 * verified against Square's API by syncAwaitingMerchPayments, so a replayed
 * or forged-but-signed event cannot mark anything paid on its own. Safe under
 * concurrent duplicate deliveries because the status transition and the
 * receipt claim are both conditional UPDATEs.
 *
 * Returns how many orders were examined. Throws if the lookup itself fails so
 * the caller can ask Square to retry.
 */
export async function syncAllAwaitingMerchPayments(): Promise<number> {
  const rows = (await sql`
    SELECT id, type, data
    FROM submissions
    WHERE type = 'merch_order' AND data->>'status' = 'awaiting_payment'
    ORDER BY id
    LIMIT 200
  `) as SyncableRow[];
  if (rows && rows.length > 0) await syncAwaitingMerchPayments(rows);

  const unreceipted = (await sql`
    SELECT id, type, data
    FROM submissions
    WHERE type = 'merch_order'
      AND data->>'paidAt' IS NOT NULL
      AND data->>'paidEmailSentAt' IS NULL
      AND (data->>'paidAt')::timestamptz > now() - interval '14 days'
    ORDER BY id
    LIMIT 50
  `) as SyncableRow[];
  if (unreceipted && unreceipted.length > 0) await retryMissingPaidReceipts(unreceipted);

  return rows?.length ?? 0;
}
