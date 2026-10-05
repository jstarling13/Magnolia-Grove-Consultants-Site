import { sql } from "./db";

export type SubmissionType = "lead" | "strategy_session" | "payment_request" | "merch_order";

/**
 * Saves a submission and returns its new id, or undefined when it couldn't be
 * saved (failures are logged, never thrown, so a database hiccup can't break a
 * form). Existing callers that ignore the return value are unaffected.
 */
export async function recordSubmission(
  type: SubmissionType,
  data: Record<string, unknown>
): Promise<number | undefined> {
  try {
    const rows = (await sql`
      INSERT INTO submissions (type, data) VALUES (${type}, ${JSON.stringify(data)})
      RETURNING id
    `) as { id: number | string }[];
    const id = Number(rows?.[0]?.id);
    return Number.isInteger(id) && id > 0 ? id : undefined;
  } catch (error) {
    console.error("[submissions] Failed to record submission:", error);
    return undefined;
  }
}
