"use server";

import { sql } from "@/lib/db";
import { revalidatePath } from "next/cache";
import type { SubmissionRow } from "@/components/admin/Dashboard";
import { MERCH_ORDER_STATUSES, type MerchOrderStatus } from "@/lib/merchOrders";

export async function markSubmissionRead(id: number): Promise<void> {
  await sql`UPDATE submissions SET read_at = now() WHERE id = ${id} AND read_at IS NULL`;
  revalidatePath("/admin");
}

// No supplier order is ever placed automatically — this only records that
// an admin manually advanced the order (e.g. after placing it in ESP
// themselves). See CLAUDE_HANDOFF.md's integration checklist.
export async function updateMerchOrderStatus(id: number, status: string): Promise<void> {
  if (!MERCH_ORDER_STATUSES.includes(status as MerchOrderStatus)) return;
  await sql`
    UPDATE submissions
    SET data = jsonb_set(data, '{status}', to_jsonb(${status}::text))
    WHERE id = ${id} AND type = 'merch_order'
  `;
  revalidatePath("/admin");
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
