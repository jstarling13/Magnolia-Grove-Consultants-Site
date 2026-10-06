import { sql } from "./db";
import { MAX_LOGO_FILES_PER_ORDER } from "./orderLogo";

/**
 * Logo files customers attach to their order requests, stored in Postgres next
 * to the order. Created on first use (same pattern as admin_session_revocations).
 *
 * Bytes cross the wire as base64 (decode()/encode() in SQL) so they survive
 * the HTTP JSON transport of the Neon driver whatever its bytea handling. A
 * file's bytes are only ever read by getOrderFile, which the admin download
 * route calls after checking the admin session. Nothing here is public.
 */

let tableReady: Promise<void> | undefined;

function ensureTable(): Promise<void> {
  tableReady ??= (async () => {
    await sql`
      CREATE TABLE IF NOT EXISTS order_files (
        id SERIAL PRIMARY KEY,
        order_id INTEGER NOT NULL,
        filename TEXT NOT NULL,
        mime TEXT NOT NULL,
        size INTEGER NOT NULL,
        data BYTEA NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `;
    await sql`CREATE INDEX IF NOT EXISTS order_files_order_id_idx ON order_files (order_id)`;
  })().catch((error) => {
    tableReady = undefined; // retry on the next call instead of caching the failure
    throw error;
  });
  return tableReady;
}

export interface OrderFileSummary {
  id: number;
  filename: string;
  mime: string;
  size: number;
  createdAt: string;
}

export interface OrderFileContent extends OrderFileSummary {
  data: Buffer;
}

export type AddOrderFileResult = { ok: true; id: number } | { ok: false; reason: "limit" };

/**
 * Stores one file for an order unless the order already has the maximum. The
 * limit is part of the INSERT itself, so two uploads racing each other cannot
 * both slip past a separate count.
 */
export async function addOrderFile(
  orderId: number,
  file: { filename: string; mime: string; bytes: Uint8Array }
): Promise<AddOrderFileResult> {
  await ensureTable();
  const base64 = Buffer.from(file.bytes).toString("base64");
  const rows = (await sql`
    INSERT INTO order_files (order_id, filename, mime, size, data)
    SELECT ${orderId}::int, ${file.filename}::text, ${file.mime}::text, ${file.bytes.length}::int, decode(${base64}::text, 'base64')
    WHERE (SELECT count(*) FROM order_files WHERE order_id = ${orderId}::int) < ${MAX_LOGO_FILES_PER_ORDER}::int
    RETURNING id
  `) as { id: number | string }[];
  const id = rows?.[0]?.id;
  return id === undefined ? { ok: false, reason: "limit" } : { ok: true, id: Number(id) };
}

interface SummaryRow {
  id: number | string;
  filename: string;
  mime: string;
  size: number | string;
  created_at: string | Date;
}

function toSummary(row: SummaryRow): OrderFileSummary {
  return {
    id: Number(row.id),
    filename: String(row.filename),
    mime: String(row.mime),
    size: Number(row.size),
    createdAt:
      row.created_at instanceof Date
        ? row.created_at.toISOString()
        : new Date(row.created_at).toISOString(),
  };
}

/** The files on an order, oldest first, without their bytes. */
export async function listOrderFiles(orderId: number): Promise<OrderFileSummary[]> {
  await ensureTable();
  const rows = (await sql`
    SELECT id, filename, mime, size, created_at FROM order_files WHERE order_id = ${orderId} ORDER BY id
  `) as SummaryRow[];
  return (rows ?? []).map(toSummary);
}

/** One file with its bytes, only when it belongs to the given order. */
export async function getOrderFile(
  orderId: number,
  fileId: number
): Promise<OrderFileContent | null> {
  await ensureTable();
  const rows = (await sql`
    SELECT id, filename, mime, size, created_at, encode(data, 'base64') AS data_b64
    FROM order_files WHERE id = ${fileId} AND order_id = ${orderId}
  `) as (SummaryRow & { data_b64: string })[];
  const row = rows?.[0];
  if (!row) return null;
  return { ...toSummary(row), data: Buffer.from(String(row.data_b64), "base64") };
}

/** Test hook: forget that the table was created. */
export function __resetOrderFilesForTests(): void {
  tableReady = undefined;
}
