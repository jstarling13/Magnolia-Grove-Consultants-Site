"use server";

import { sql } from "@/lib/db";
import { revalidatePath } from "next/cache";
import type { SubmissionRow } from "@/components/admin/Dashboard";

export async function markSubmissionRead(id: number): Promise<void> {
  await sql`UPDATE submissions SET read_at = now() WHERE id = ${id} AND read_at IS NULL`;
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
