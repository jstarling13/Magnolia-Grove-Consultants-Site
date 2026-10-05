import { sql } from "@/lib/db";
import {
  MERCH_ORDER_STATUSES,
  buildTrackingUrl,
  formatOrderReference,
  recognizeCarrier,
  type MerchOrderStatus,
} from "@/lib/merchOrders";
import { maskEmail } from "@/lib/orderTracking";

/**
 * What a customer may see of an order. toOrderView copies fields one by one
 * from the stored submission; nothing is spread, so internal data (ESP links,
 * supplier, product numbers, the ESP order number, costs, notes, phone, the
 * full email) cannot reach the page even if it is added to the stored JSON.
 */

export const TIMELINE_STEPS = [
  { key: "received", label: "Request received" },
  { key: "quoted", label: "Quote sent" },
  { key: "paid", label: "Payment received" },
  { key: "production", label: "In production" },
  { key: "shipped", label: "Shipped" },
] as const;

export type TimelineKey = (typeof TIMELINE_STEPS)[number]["key"];

export interface OrderViewItem {
  name: string;
  color?: string;
  quantity: number;
  lineTotal?: number;
}

export interface OrderView {
  ref: string;
  cancelled: boolean;
  /** Index into TIMELINE_STEPS of the current step. Meaningless when cancelled. */
  currentStep: number;
  /** ISO dates we actually have, by step; steps without a recorded date are absent. */
  dates: Partial<Record<TimelineKey, string>>;
  items: OrderViewItem[];
  total?: { amount: number; kind: "quoted" | "estimated" };
  shipment?: { carrier: string; trackingNumber: string; trackingUrl?: string };
  maskedEmail: string;
}

const STEP_BY_STATUS: Record<MerchOrderStatus, number> = {
  new: 0,
  reviewing: 0,
  // "quoted" is the admin's own working state; the customer is only told a
  // quote was sent once the payment link exists (awaiting_payment).
  quoted: 0,
  awaiting_payment: 1,
  paid: 2,
  ordered_in_esp: 3,
  fulfilled: 4,
  cancelled: 0,
};

function text(value: unknown, max = 200): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, max) : undefined;
}

function amount(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : undefined;
}

function isoDate(value: unknown): string | undefined {
  const raw = value instanceof Date ? value.toISOString() : typeof value === "string" ? value : "";
  return raw && !Number.isNaN(Date.parse(raw)) ? raw : undefined;
}

function toItems(value: unknown): OrderViewItem[] {
  if (!Array.isArray(value)) return [];
  const items: OrderViewItem[] = [];
  for (const entry of value) {
    if (!entry || typeof entry !== "object") continue;
    const line = entry as Record<string, unknown>;
    const name = text(line.name, 200);
    const quantity = line.quantity;
    if (!name || typeof quantity !== "number" || !Number.isInteger(quantity) || quantity < 1) {
      continue;
    }
    const color = text(line.color, 100);
    const lineTotal = amount(line.lineTotal);
    items.push({
      name,
      ...(color ? { color } : {}),
      quantity,
      ...(lineTotal !== undefined ? { lineTotal } : {}),
    });
  }
  return items;
}

/** Builds the customer-safe view of a stored merch order. */
export function toOrderView(
  id: number,
  data: Record<string, unknown>,
  createdAt?: unknown
): OrderView {
  const rawStatus = String(data.status ?? "new");
  const status = (MERCH_ORDER_STATUSES as readonly string[]).includes(rawStatus)
    ? (rawStatus as MerchOrderStatus)
    : "new";

  const items = toItems(data.items);
  const quoted = amount(data.quotedTotal);
  const estimated = amount(data.total);
  const paidAt = isoDate(data.paidAt);
  const shippedAt = isoDate(data.shippedAt);
  const received = isoDate(createdAt);
  const quotedAt = isoDate(data.quotedAt);

  const dates: OrderView["dates"] = {
    ...(received ? { received } : {}),
    ...(quotedAt ? { quoted: quotedAt } : {}),
    ...(paidAt ? { paid: paidAt } : {}),
    ...(shippedAt ? { shipped: shippedAt } : {}),
  };

  const carrier = text(data.carrier, 40);
  const trackingNumber = text(data.trackingNumber, 40);
  const shipment =
    carrier && trackingNumber && status !== "cancelled"
      ? {
          carrier: recognizeCarrier(carrier) ?? carrier,
          trackingNumber,
          ...(buildTrackingUrl(carrier, trackingNumber)
            ? { trackingUrl: buildTrackingUrl(carrier, trackingNumber) }
            : {}),
        }
      : undefined;

  return {
    ref: formatOrderReference(id),
    cancelled: status === "cancelled",
    currentStep: STEP_BY_STATUS[status],
    dates,
    items,
    ...(quoted !== undefined
      ? { total: { amount: quoted, kind: "quoted" as const } }
      : estimated !== undefined
        ? { total: { amount: estimated, kind: "estimated" as const } }
        : {}),
    ...(shipment ? { shipment } : {}),
    maskedEmail: maskEmail(data.email),
  };
}

/**
 * Loads one merch order by id. Returns undefined when there is no such order
 * (or it isn't a merch order); database errors propagate so the page can fail
 * closed without pretending the order doesn't exist.
 */
export async function loadOrderView(id: number): Promise<OrderView | undefined> {
  const rows = (await sql`
    SELECT data, created_at FROM submissions WHERE id = ${id} AND type = 'merch_order'
  `) as { data: Record<string, unknown>; created_at: unknown }[];
  const row = rows[0];
  if (!row || !row.data || typeof row.data !== "object") return undefined;
  return toOrderView(id, row.data, row.created_at);
}
