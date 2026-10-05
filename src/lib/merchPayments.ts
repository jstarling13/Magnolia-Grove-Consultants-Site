import { sql } from "./db";
import { getPaymentLinkStatus } from "./square";

interface SyncableRow {
  id: number;
  type: string;
  data: Record<string, unknown>;
}

/**
 * Square has no webhook receiver wired up here, so payment is detected by
 * polling: any merch order awaiting payment is checked against Square and
 * promoted to "paid" (with a timestamp) the moment its order completes.
 * Mutates the passed rows so the caller renders the fresh state.
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
        await sql`
          UPDATE submissions
          SET data = data || ${JSON.stringify(patch)}::jsonb
          WHERE id = ${row.id} AND type = 'merch_order' AND data->>'status' = 'awaiting_payment'
        `;
        row.data = { ...row.data, ...patch };
      } catch (error) {
        console.error(`[merchPayments] sync failed for submission ${row.id}:`, error);
      }
    })
  );
}
