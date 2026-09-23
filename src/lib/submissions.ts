import { sql } from "./db";

export type SubmissionType = "lead" | "strategy_session" | "payment_request" | "merch_order";

export async function recordSubmission(
  type: SubmissionType,
  data: Record<string, unknown>
): Promise<void> {
  try {
    await sql`INSERT INTO submissions (type, data) VALUES (${type}, ${JSON.stringify(data)})`;
  } catch (error) {
    console.error("[submissions] Failed to record submission:", error);
  }
}
