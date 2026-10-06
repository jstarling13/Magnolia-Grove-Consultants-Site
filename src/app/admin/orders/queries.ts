import "server-only";
import { sql } from "@/lib/db";
import { getEspLink } from "@/lib/espLinks";
import {
  KNOWN_STATUS_CSV,
  ORDERS_EXPORT_LIMIT,
  ORDERS_PAGE_SIZE,
  buildSearchParts,
  readOrderItems,
  tallyStatusCounts,
  type OrderFilter,
  type OrderItem,
  type OrderRecord,
  type RawData,
} from "@/lib/adminOrders";
import type { MerchOrderStatus } from "@/lib/merchOrders";

/**
 * Read-only queries behind /admin/orders. Every value reaches Postgres as a
 * bound parameter (tagged templates), every list is capped, and callers are
 * expected to have verified the admin session first (see guard.ts).
 *
 * The status expression maps a missing or unrecognized status to 'new' so the
 * tab counts always add up to the list.
 */

interface DbRow {
  id: number | string;
  data: RawData;
  created_at: string | Date;
  read_at: string | Date | null;
}

function toIso(value: string | Date): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function toRecord(row: DbRow): OrderRecord {
  return {
    id: Number(row.id),
    createdAt: toIso(row.created_at),
    readAt: row.read_at ? toIso(row.read_at) : null,
    data: row.data && typeof row.data === "object" ? row.data : {},
  };
}

function statusParam(status: MerchOrderStatus | undefined): string | null {
  return status ?? null;
}

/** Number of orders per status for the current search (the status and view filters are ignored). */
export async function getStatusCounts(q: string) {
  const { pattern, refId } = buildSearchParts(q);
  const rows = (await sql`
    SELECT
      CASE WHEN strpos(${KNOWN_STATUS_CSV}::text, ',' || COALESCE(data->>'status', 'new') || ',') > 0
           THEN COALESCE(data->>'status', 'new') ELSE 'new' END AS status,
      count(*)::int AS n
    FROM submissions
    WHERE type = 'merch_order'
      AND (
        ${pattern}::text IS NULL
        OR id = ${refId}::int
        OR concat_ws(' ', data->>'firstName', data->>'lastName') ILIKE ${pattern}::text
        OR data->>'email' ILIKE ${pattern}::text
        OR data->>'company' ILIKE ${pattern}::text
        OR data->>'product' ILIKE ${pattern}::text
        OR EXISTS (
          SELECT 1
          FROM jsonb_array_elements(
            CASE WHEN jsonb_typeof(data->'items') = 'array' THEN data->'items' ELSE '[]'::jsonb END
          ) AS line
          WHERE line->>'name' ILIKE ${pattern}::text
        )
      )
    GROUP BY 1
  `) as { status: unknown; n: unknown }[];
  return tallyStatusCounts(rows ?? []);
}

/**
 * How many orders need the owner right now, for the current search: everything
 * that needs action, and the paid-not-ordered part of it ("new" is a status
 * count). Same definition as the "action" and "paid_not_ordered" list views.
 */
export async function getActionCounts(
  q: string
): Promise<{ action: number; paidNotOrdered: number }> {
  const { pattern, refId } = buildSearchParts(q);
  const rows = (await sql`
    SELECT
      count(*) FILTER (
        WHERE CASE WHEN strpos(${KNOWN_STATUS_CSV}::text, ',' || COALESCE(data->>'status', 'new') || ',') > 0
      THEN COALESCE(data->>'status', 'new') ELSE 'new' END = 'new'
        OR (
          COALESCE(data->>'paidAt', '') <> ''
          AND CASE WHEN strpos(${KNOWN_STATUS_CSV}::text, ',' || COALESCE(data->>'status', 'new') || ',') > 0
          THEN COALESCE(data->>'status', 'new') ELSE 'new' END NOT IN ('fulfilled', 'cancelled', 'ordered_in_esp')
          AND COALESCE(data->>'espOrderedAt', '') = ''
          AND COALESCE(data->>'espOrderNumber', '') = ''
        )
      )::int AS action,
      count(*) FILTER (
        WHERE (
          COALESCE(data->>'paidAt', '') <> ''
          AND CASE WHEN strpos(${KNOWN_STATUS_CSV}::text, ',' || COALESCE(data->>'status', 'new') || ',') > 0
          THEN COALESCE(data->>'status', 'new') ELSE 'new' END NOT IN ('fulfilled', 'cancelled', 'ordered_in_esp')
          AND COALESCE(data->>'espOrderedAt', '') = ''
          AND COALESCE(data->>'espOrderNumber', '') = ''
        )
      )::int AS paid_not_ordered
    FROM submissions
    WHERE type = 'merch_order'
      AND (
        ${pattern}::text IS NULL
        OR id = ${refId}::int
        OR concat_ws(' ', data->>'firstName', data->>'lastName') ILIKE ${pattern}::text
        OR data->>'email' ILIKE ${pattern}::text
        OR data->>'company' ILIKE ${pattern}::text
        OR data->>'product' ILIKE ${pattern}::text
        OR EXISTS (
          SELECT 1
          FROM jsonb_array_elements(
            CASE WHEN jsonb_typeof(data->'items') = 'array' THEN data->'items' ELSE '[]'::jsonb END
          ) AS line
          WHERE line->>'name' ILIKE ${pattern}::text
        )
      )
  `) as { action: unknown; paid_not_ordered: unknown }[];
  const row = rows?.[0];
  return {
    action: Number(row?.action ?? 0) || 0,
    paidNotOrdered: Number(row?.paid_not_ordered ?? 0) || 0,
  };
}

export interface OrderPage {
  records: OrderRecord[];
  total: number;
}

/** One page (25) of orders for the filter; newest first unless the filter sorts otherwise. */
export async function listOrders(filter: OrderFilter): Promise<OrderPage> {
  const { pattern, refId } = buildSearchParts(filter.q);
  const status = statusParam(filter.status);
  const view = filter.view ?? null;
  const sort = filter.sort ?? "newest";
  const offset = (Math.max(1, filter.page) - 1) * ORDERS_PAGE_SIZE;

  const [rowResult, totalResult] = await Promise.all([
    sql`
      SELECT id, data, created_at, read_at
      FROM submissions
      WHERE type = 'merch_order'
      AND (
        ${status}::text IS NULL
        OR CASE WHEN strpos(${KNOWN_STATUS_CSV}::text, ',' || COALESCE(data->>'status', 'new') || ',') > 0
                  THEN COALESCE(data->>'status', 'new') ELSE 'new' END = ${status}::text
      )
      AND (
        ${view}::text IS NULL
        OR (
          ${view}::text = 'action'
          AND (
            CASE WHEN strpos(${KNOWN_STATUS_CSV}::text, ',' || COALESCE(data->>'status', 'new') || ',') > 0
                  THEN COALESCE(data->>'status', 'new') ELSE 'new' END = 'new'
            OR (
              COALESCE(data->>'paidAt', '') <> ''
              AND CASE WHEN strpos(${KNOWN_STATUS_CSV}::text, ',' || COALESCE(data->>'status', 'new') || ',') > 0
              THEN COALESCE(data->>'status', 'new') ELSE 'new' END NOT IN ('fulfilled', 'cancelled', 'ordered_in_esp')
              AND COALESCE(data->>'espOrderedAt', '') = ''
              AND COALESCE(data->>'espOrderNumber', '') = ''
            )
          )
        )
        OR (
          ${view}::text = 'paid_not_ordered'
          AND (
            COALESCE(data->>'paidAt', '') <> ''
            AND CASE WHEN strpos(${KNOWN_STATUS_CSV}::text, ',' || COALESCE(data->>'status', 'new') || ',') > 0
            THEN COALESCE(data->>'status', 'new') ELSE 'new' END NOT IN ('fulfilled', 'cancelled', 'ordered_in_esp')
            AND COALESCE(data->>'espOrderedAt', '') = ''
            AND COALESCE(data->>'espOrderNumber', '') = ''
          )
        )
      )
      AND (
        ${pattern}::text IS NULL
        OR id = ${refId}::int
        OR concat_ws(' ', data->>'firstName', data->>'lastName') ILIKE ${pattern}::text
        OR data->>'email' ILIKE ${pattern}::text
        OR data->>'company' ILIKE ${pattern}::text
        OR data->>'product' ILIKE ${pattern}::text
        OR EXISTS (
          SELECT 1
          FROM jsonb_array_elements(
            CASE WHEN jsonb_typeof(data->'items') = 'array' THEN data->'items' ELSE '[]'::jsonb END
          ) AS line
          WHERE line->>'name' ILIKE ${pattern}::text
        )
      )
      ORDER BY
        (CASE WHEN ${sort}::text = 'largest' THEN
          CASE WHEN jsonb_typeof(data->'quotedTotal') = 'number' THEN (data->>'quotedTotal')::numeric
               WHEN jsonb_typeof(data->'total') = 'number' THEN (data->>'total')::numeric END
        END) DESC NULLS LAST,
        (CASE WHEN ${sort}::text = 'oldest' THEN created_at END) ASC,
        (CASE WHEN ${sort}::text = 'oldest' THEN id END) ASC,
        created_at DESC, id DESC
      LIMIT ${ORDERS_PAGE_SIZE}::int OFFSET ${offset}::int
    `,
    sql`
      SELECT count(*)::int AS n
      FROM submissions
      WHERE type = 'merch_order'
      AND (
        ${status}::text IS NULL
        OR CASE WHEN strpos(${KNOWN_STATUS_CSV}::text, ',' || COALESCE(data->>'status', 'new') || ',') > 0
                  THEN COALESCE(data->>'status', 'new') ELSE 'new' END = ${status}::text
      )
      AND (
        ${view}::text IS NULL
        OR (
          ${view}::text = 'action'
          AND (
            CASE WHEN strpos(${KNOWN_STATUS_CSV}::text, ',' || COALESCE(data->>'status', 'new') || ',') > 0
                  THEN COALESCE(data->>'status', 'new') ELSE 'new' END = 'new'
            OR (
              COALESCE(data->>'paidAt', '') <> ''
              AND CASE WHEN strpos(${KNOWN_STATUS_CSV}::text, ',' || COALESCE(data->>'status', 'new') || ',') > 0
              THEN COALESCE(data->>'status', 'new') ELSE 'new' END NOT IN ('fulfilled', 'cancelled', 'ordered_in_esp')
              AND COALESCE(data->>'espOrderedAt', '') = ''
              AND COALESCE(data->>'espOrderNumber', '') = ''
            )
          )
        )
        OR (
          ${view}::text = 'paid_not_ordered'
          AND (
            COALESCE(data->>'paidAt', '') <> ''
            AND CASE WHEN strpos(${KNOWN_STATUS_CSV}::text, ',' || COALESCE(data->>'status', 'new') || ',') > 0
            THEN COALESCE(data->>'status', 'new') ELSE 'new' END NOT IN ('fulfilled', 'cancelled', 'ordered_in_esp')
            AND COALESCE(data->>'espOrderedAt', '') = ''
            AND COALESCE(data->>'espOrderNumber', '') = ''
          )
        )
      )
      AND (
        ${pattern}::text IS NULL
        OR id = ${refId}::int
        OR concat_ws(' ', data->>'firstName', data->>'lastName') ILIKE ${pattern}::text
        OR data->>'email' ILIKE ${pattern}::text
        OR data->>'company' ILIKE ${pattern}::text
        OR data->>'product' ILIKE ${pattern}::text
        OR EXISTS (
          SELECT 1
          FROM jsonb_array_elements(
            CASE WHEN jsonb_typeof(data->'items') = 'array' THEN data->'items' ELSE '[]'::jsonb END
          ) AS line
          WHERE line->>'name' ILIKE ${pattern}::text
        )
      )
    `,
  ]);
  const rows = rowResult as DbRow[];
  const totals = totalResult as { n: number | string }[];

  return { records: (rows ?? []).map(toRecord), total: Number(totals?.[0]?.n ?? 0) };
}

/** Every order matching the filter (ignoring the page), in the filter's order, capped for export. */
export async function listOrdersForExport(filter: OrderFilter): Promise<OrderRecord[]> {
  const { pattern, refId } = buildSearchParts(filter.q);
  const status = statusParam(filter.status);
  const view = filter.view ?? null;
  const sort = filter.sort ?? "newest";
  const rows = (await sql`
    SELECT id, data, created_at, read_at
    FROM submissions
    WHERE type = 'merch_order'
    AND (
      ${status}::text IS NULL
      OR CASE WHEN strpos(${KNOWN_STATUS_CSV}::text, ',' || COALESCE(data->>'status', 'new') || ',') > 0
                  THEN COALESCE(data->>'status', 'new') ELSE 'new' END = ${status}::text
    )
    AND (
      ${view}::text IS NULL
      OR (
        ${view}::text = 'action'
        AND (
          CASE WHEN strpos(${KNOWN_STATUS_CSV}::text, ',' || COALESCE(data->>'status', 'new') || ',') > 0
                  THEN COALESCE(data->>'status', 'new') ELSE 'new' END = 'new'
          OR (
            COALESCE(data->>'paidAt', '') <> ''
            AND CASE WHEN strpos(${KNOWN_STATUS_CSV}::text, ',' || COALESCE(data->>'status', 'new') || ',') > 0
            THEN COALESCE(data->>'status', 'new') ELSE 'new' END NOT IN ('fulfilled', 'cancelled', 'ordered_in_esp')
            AND COALESCE(data->>'espOrderedAt', '') = ''
            AND COALESCE(data->>'espOrderNumber', '') = ''
          )
        )
      )
      OR (
        ${view}::text = 'paid_not_ordered'
        AND (
          COALESCE(data->>'paidAt', '') <> ''
          AND CASE WHEN strpos(${KNOWN_STATUS_CSV}::text, ',' || COALESCE(data->>'status', 'new') || ',') > 0
          THEN COALESCE(data->>'status', 'new') ELSE 'new' END NOT IN ('fulfilled', 'cancelled', 'ordered_in_esp')
          AND COALESCE(data->>'espOrderedAt', '') = ''
          AND COALESCE(data->>'espOrderNumber', '') = ''
        )
      )
    )
    AND (
      ${pattern}::text IS NULL
      OR id = ${refId}::int
      OR concat_ws(' ', data->>'firstName', data->>'lastName') ILIKE ${pattern}::text
      OR data->>'email' ILIKE ${pattern}::text
      OR data->>'company' ILIKE ${pattern}::text
      OR data->>'product' ILIKE ${pattern}::text
      OR EXISTS (
        SELECT 1
        FROM jsonb_array_elements(
          CASE WHEN jsonb_typeof(data->'items') = 'array' THEN data->'items' ELSE '[]'::jsonb END
        ) AS line
        WHERE line->>'name' ILIKE ${pattern}::text
      )
    )
    ORDER BY
        (CASE WHEN ${sort}::text = 'largest' THEN
          CASE WHEN jsonb_typeof(data->'quotedTotal') = 'number' THEN (data->>'quotedTotal')::numeric
               WHEN jsonb_typeof(data->'total') = 'number' THEN (data->>'total')::numeric END
        END) DESC NULLS LAST,
        (CASE WHEN ${sort}::text = 'oldest' THEN created_at END) ASC,
        (CASE WHEN ${sort}::text = 'oldest' THEN id END) ASC,
        created_at DESC, id DESC
    LIMIT ${ORDERS_EXPORT_LIMIT}::int
  `) as DbRow[];
  return (rows ?? []).map(toRecord);
}

export async function getOrder(id: number): Promise<OrderRecord | null> {
  if (!Number.isSafeInteger(id) || id <= 0 || id > 2_147_483_647) return null;
  const rows = (await sql`
    SELECT id, data, created_at, read_at
    FROM submissions
    WHERE id = ${id}::int AND type = 'merch_order'
  `) as DbRow[];
  return rows?.[0] ? toRecord(rows[0]) : null;
}

/** Opening an order counts as reading it (the dashboard's unread dot). No revalidation: safe during render. */
export async function markOrderRead(id: number): Promise<void> {
  await sql`UPDATE submissions SET read_at = now() WHERE id = ${id}::int AND read_at IS NULL`;
}

/**
 * Items for the detail page. Lines stamped with ESP+ fields at order time keep
 * them; older lines (no stamp) get the same link the storefront would have
 * stamped, from the server-only ESP data. Admin pages only.
 */
export function readItemsWithBackendLinks(data: RawData): OrderItem[] {
  return readOrderItems(data).map((item) => {
    if (item.espUrl || !item.productId) return item;
    const link = getEspLink({ id: item.productId, name: item.name });
    return {
      ...item,
      espUrl: link.url,
      espKind: link.kind,
      ...(item.supplier || !link.supplier ? {} : { supplier: link.supplier }),
      ...(item.productNo || !link.productNo ? {} : { productNo: link.productNo }),
    };
  });
}
