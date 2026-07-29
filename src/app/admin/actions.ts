"use server";

import { sql } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function markSubmissionRead(id: number): Promise<void> {
  await sql`UPDATE submissions SET read_at = now() WHERE id = ${id} AND read_at IS NULL`;
  revalidatePath("/admin");
}
