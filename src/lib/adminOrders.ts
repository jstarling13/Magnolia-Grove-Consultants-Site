/**
 * Pure helpers for the admin orders workspace (/admin/orders): filter parsing,
 * "needs attention" flags, the order timeline, list/detail view models, the
 * plain-text backend order sheet, and CSV export.
 *
 * No database or server-only imports live here so everything is unit-tested in
 * isolation. Nothing in this module reads or writes ESP cost data; the ESP+
 * product link / supplier / product number only travel on the item view model
 * and are only ever rendered inside /admin.
 */

import {
  MERCH_ORDER_STATUSES,
  MERCH_ORDER_STATUS_LABELS,
  formatOrderReference,
  type MerchOrderStatus,
} from "./merchOrders";
import { describeLineColor } from "./merchBackendSheet";

export const ORDERS_PAGE_SIZE = 25;
/** Hard cap on how many rows one CSV export may contain. */
export const ORDERS_EXPORT_LIMIT = 5000;
const MAX_PAGE = 2000;
const MAX_SEARCH_LENGTH = 100;

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
/** Awaiting payment longer than this needs a nudge. */
export const AWAITING_PAYMENT_STALE_DAYS = 3;
/** A brand-new request nobody has touched for longer than this needs attention. */
export const NEW_STALE_DAYS = 1;

export type RawData = Record<string, unknown>;

export interface OrderRecord {
  id: number;
  /** ISO timestamp the order was submitted. */
  createdAt: string;
  readAt?: string | null;
  data: RawData;
}

function str(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function num(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function parseTime(iso: string | undefined): number | undefined {
  if (!iso) return undefined;
  const time = Date.parse(iso);
  return Number.isFinite(time) ? time : undefined;
}

// ---------------------------------------------------------------------------
// Status
// ---------------------------------------------------------------------------

/** Orders with a missing or unrecognized status count as "new". */
export function normalizeStatus(value: unknown): MerchOrderStatus {
  return MERCH_ORDER_STATUSES.includes(value as MerchOrderStatus)
    ? (value as MerchOrderStatus)
    : "new";
}

/** ",new,reviewing,...," - lets SQL tell known statuses from junk without dynamic SQL. */
export const KNOWN_STATUS_CSV = `,${MERCH_ORDER_STATUSES.join(",")},`;

// ---------------------------------------------------------------------------
// Filter (URL search params <-> query)
// ---------------------------------------------------------------------------

export interface OrderFilter {
  status?: MerchOrderStatus;
  /** Free text: order reference (MG-00042), name, email, or product. */
  q: string;
  page: number;
}

type ParamBag = Record<string, string | string[] | undefined> | URLSearchParams;

function readParam(params: ParamBag, key: string): string {
  const raw = params instanceof URLSearchParams ? params.get(key) : params[key];
  const value = Array.isArray(raw) ? raw[0] : raw;
  return typeof value === "string" ? value : "";
}

export function parseOrderFilter(params: ParamBag): OrderFilter {
  const statusParam = readParam(params, "status");
  const status = MERCH_ORDER_STATUSES.includes(statusParam as MerchOrderStatus)
    ? (statusParam as MerchOrderStatus)
    : undefined;
  const q = readParam(params, "q")
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .trim()
    .slice(0, MAX_SEARCH_LENGTH);
  const pageNumber = Math.trunc(Number(readParam(params, "page")));
  const page = Number.isFinite(pageNumber) && pageNumber >= 1 ? Math.min(pageNumber, MAX_PAGE) : 1;
  return { ...(status ? { status } : {}), q, page };
}

/** Query string (no leading "?") that reproduces a filter; page 1 and empty values are omitted. */
export function orderFilterToQuery(filter: Partial<OrderFilter>): string {
  const params = new URLSearchParams();
  if (filter.status) params.set("status", filter.status);
  if (filter.q) params.set("q", filter.q);
  if (filter.page && filter.page > 1) params.set("page", String(filter.page));
  return params.toString();
}

/** MG-00042 / mg42 -> 42. Anything else is not an order reference. */
export function parseOrderReference(text: string): number | undefined {
  const match = /^MG-?(\d{1,9})$/i.exec(text.trim());
  if (!match) return undefined;
  const id = Number(match[1]);
  return Number.isSafeInteger(id) && id > 0 ? id : undefined;
}

/** Escapes LIKE/ILIKE wildcards so user text is matched literally. */
export function escapeLikePattern(text: string): string {
  return text.replace(/[\\%_]/g, (char) => `\\${char}`);
}

export interface SearchParts {
  /** ILIKE pattern, or null when there is no search text. */
  pattern: string | null;
  /** Submission id when the text is an order reference. */
  refId: number | null;
}

export function buildSearchParts(q: string): SearchParts {
  const text = q.trim();
  if (!text) return { pattern: null, refId: null };
  return { pattern: `%${escapeLikePattern(text)}%`, refId: parseOrderReference(text) ?? null };
}

export interface PageInfo {
  page: number;
  pageCount: number;
  total: number;
  /** 1-based index of the first/last row shown (0 when empty). */
  from: number;
  to: number;
  hasPrev: boolean;
  hasNext: boolean;
}

export function paginate(total: number, page: number, pageSize = ORDERS_PAGE_SIZE): PageInfo {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const current = Math.min(Math.max(1, page), pageCount);
  const from = total === 0 ? 0 : (current - 1) * pageSize + 1;
  const to = Math.min(total, current * pageSize);
  return {
    page: current,
    pageCount,
    total,
    from,
    to,
    hasPrev: current > 1,
    hasNext: current < pageCount,
  };
}

// ---------------------------------------------------------------------------
// Needs-attention flags
// ---------------------------------------------------------------------------

export type AttentionCode =
  | "paid_not_ordered"
  | "awaiting_payment_stale"
  | "new_stale"
  | "quoted_no_link"
  | "shipped_no_tracking";

export interface AttentionFlag {
  code: AttentionCode;
  label: string;
}

export const ATTENTION_LABELS: Record<AttentionCode, string> = {
  paid_not_ordered: "Paid, not ordered in ESP",
  awaiting_payment_stale: `Awaiting payment over ${AWAITING_PAYMENT_STALE_DAYS} days`,
  new_stale: "New for over a day",
  quoted_no_link: "Quoted, no payment link sent",
  shipped_no_tracking: "Shipped without tracking",
};

/**
 * Which problems an order has right now. Cancelled orders never need
 * attention. Time-based flags need a valid timestamp; without one they stay
 * off rather than guessing.
 */
export function computeAttentionFlags(
  order: { createdAt: string; data: RawData },
  now: number = Date.now()
): AttentionFlag[] {
  const { data } = order;
  const status = normalizeStatus(data.status);
  if (status === "cancelled") return [];

  const flags: AttentionCode[] = [];

  const paid = Boolean(str(data.paidAt));
  const espRecorded =
    status === "ordered_in_esp" ||
    Boolean(str(data.espOrderedAt)) ||
    Boolean(str(data.espOrderNumber));
  if (paid && status !== "fulfilled" && !espRecorded) flags.push("paid_not_ordered");

  if (status === "awaiting_payment") {
    const since = parseTime(str(data.quotedAt)) ?? parseTime(order.createdAt);
    if (since !== undefined && now - since > AWAITING_PAYMENT_STALE_DAYS * DAY_MS) {
      flags.push("awaiting_payment_stale");
    }
  }

  if (status === "new") {
    const created = parseTime(order.createdAt);
    if (created !== undefined && now - created > NEW_STALE_DAYS * DAY_MS) flags.push("new_stale");
  }

  if (status === "quoted" && !str(data.paymentUrl)) flags.push("quoted_no_link");

  if ((status === "fulfilled" || str(data.shippedAt)) && !str(data.trackingNumber)) {
    flags.push("shipped_no_tracking");
  }

  return flags.map((code) => ({ code, label: ATTENTION_LABELS[code] }));
}

/** Only plain http(s) URLs may become a clickable href; anything else renders as text. */
export function safeHttpUrl(value: unknown): string | undefined {
  const text = str(value);
  return /^https?:\/\/[^\s]+$/i.test(text) ? text : undefined;
}

// ---------------------------------------------------------------------------
// Dates
// ---------------------------------------------------------------------------

/** The business runs on Eastern time; fixing the zone keeps server and test output identical. */
const DISPLAY_ZONE = "America/New_York";

export function formatOrderDate(iso: string | undefined | null): string {
  const time = parseTime(iso ?? undefined);
  if (time === undefined) return "";
  return new Date(time).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: DISPLAY_ZONE,
  });
}

/** Compact age such as "12m", "5h", "3d", "9w". Empty when the date is unusable. */
export function formatAge(iso: string | undefined | null, now: number = Date.now()): string {
  const time = parseTime(iso ?? undefined);
  if (time === undefined) return "";
  const diff = Math.max(0, now - time);
  if (diff < HOUR_MS) return `${Math.max(1, Math.floor(diff / 60_000))}m`;
  if (diff < DAY_MS) return `${Math.floor(diff / HOUR_MS)}h`;
  if (diff < 14 * DAY_MS) return `${Math.floor(diff / DAY_MS)}d`;
  return `${Math.floor(diff / (7 * DAY_MS))}w`;
}

// ---------------------------------------------------------------------------
// Timeline
// ---------------------------------------------------------------------------

export interface TimelineStep {
  key: "created" | "quoted" | "link_sent" | "paid" | "esp_ordered" | "shipped" | "cancelled";
  label: string;
  /** ISO timestamp; absent when the step has not happened (or was not recorded). */
  at?: string;
  done: boolean;
  detail?: string;
}

/**
 * The order's life built only from timestamps actually stored on it. A step
 * that has not happened is "pending" (done: false); a step that clearly
 * happened but has no stored time is done without a date.
 */
export function buildOrderTimeline(createdAt: string, data: RawData): TimelineStep[] {
  const status = normalizeStatus(data.status);
  const quotedAt = str(data.quotedAt);
  const quotedTotal = num(data.quotedTotal);
  const paymentUrl = str(data.paymentUrl);
  const paidAt = str(data.paidAt);
  const espOrderedAt = str(data.espOrderedAt);
  const espOrderNumber = str(data.espOrderNumber);
  const shippedAt = str(data.shippedAt);
  const carrier = str(data.carrier);
  const tracking = str(data.trackingNumber);

  const shipDetail = [carrier, tracking].filter(Boolean).join(" ");

  const steps: TimelineStep[] = [
    { key: "created", label: "Order placed", at: createdAt, done: true },
    {
      key: "quoted",
      label: "Quoted",
      ...(quotedAt ? { at: quotedAt } : {}),
      done: Boolean(quotedAt) || quotedTotal !== undefined,
      ...(quotedTotal !== undefined ? { detail: `$${quotedTotal.toFixed(2)}` } : {}),
    },
    {
      key: "link_sent",
      label: "Payment link sent",
      // The link and the quote are stamped in the same write, so quotedAt is its time.
      ...(paymentUrl && quotedAt ? { at: quotedAt } : {}),
      done: Boolean(paymentUrl),
    },
    {
      key: "paid",
      label: "Paid",
      ...(paidAt ? { at: paidAt } : {}),
      done: Boolean(paidAt),
      ...(data.paidManually === true ? { detail: "Marked paid manually by an admin" } : {}),
    },
    {
      key: "esp_ordered",
      label: "Ordered in ESP",
      ...(espOrderedAt ? { at: espOrderedAt } : {}),
      done: Boolean(espOrderedAt) || Boolean(espOrderNumber) || status === "ordered_in_esp",
      ...(espOrderNumber ? { detail: `ESP order ${espOrderNumber}` } : {}),
    },
    {
      key: "shipped",
      label: "Shipped",
      ...(shippedAt ? { at: shippedAt } : {}),
      done: Boolean(shippedAt),
      ...(shipDetail ? { detail: shipDetail } : {}),
    },
  ];

  if (status === "cancelled") {
    // No cancellation time is stored, so none is shown.
    steps.push({ key: "cancelled", label: "Cancelled", done: true });
  }
  return steps;
}

// ---------------------------------------------------------------------------
// Items
// ---------------------------------------------------------------------------

export interface OrderItem {
  productId?: string;
  name: string;
  color?: string;
  quantity: number;
  /** Customer-entered size breakdown and imprint notes; absent on orders placed before these existed. */
  sizes?: string;
  imprintNotes?: string;
  unitPrice?: number;
  lineTotal?: number;
  /** Backend ESP+ fields: admin only, never shown to customers. */
  espUrl?: string;
  espKind?: "product" | "search";
  supplier?: string;
  productNo?: string;
}

/** Cart lines from a stored order; ignores malformed entries. Quote-request orders have none. */
export function readOrderItems(data: RawData): OrderItem[] {
  if (!Array.isArray(data.items)) return [];
  const items: OrderItem[] = [];
  for (const raw of data.items as unknown[]) {
    if (!raw || typeof raw !== "object") continue;
    const item = raw as Record<string, unknown>;
    const name = str(item.name);
    const quantity = num(item.quantity);
    if (!name || quantity === undefined) continue;
    const unitPrice = num(item.unitPrice);
    const lineTotal = num(item.lineTotal);
    const espUrl = str(item.espUrl);
    const supplier = str(item.supplier);
    const productNo = str(item.productNo);
    const sizes = str(item.sizes);
    const imprintNotes = str(item.imprintNotes);
    items.push({
      ...(str(item.productId) ? { productId: str(item.productId) } : {}),
      name,
      ...(str(item.color) ? { color: str(item.color) } : {}),
      quantity,
      ...(sizes ? { sizes } : {}),
      ...(imprintNotes ? { imprintNotes } : {}),
      ...(unitPrice !== undefined ? { unitPrice } : {}),
      ...(lineTotal !== undefined ? { lineTotal } : {}),
      ...(espUrl ? { espUrl } : {}),
      ...(espUrl && (item.espKind === "product" || item.espKind === "search")
        ? { espKind: item.espKind }
        : {}),
      ...(supplier ? { supplier } : {}),
      ...(productNo ? { productNo } : {}),
    });
  }
  return items;
}

/** "Name x 250 (Navy); Mug x 100" - used for the CSV and quick scans. */
export function summarizeItems(data: RawData): string {
  const items = readOrderItems(data);
  if (items.length === 0) {
    const product = str(data.product);
    const quantity = str(data.quantity);
    if (!product) return "";
    return quantity ? `${product} x ${quantity}` : product;
  }
  return items
    .map((item) => `${item.name} x ${item.quantity}${item.color ? ` (${item.color})` : ""}`)
    .join("; ");
}

// ---------------------------------------------------------------------------
// List view model
// ---------------------------------------------------------------------------

export interface OrderListItem {
  id: number;
  reference: string;
  customer: string;
  email: string;
  status: MerchOrderStatus;
  statusLabel: string;
  /** "3 items" for carts; the requested product text for quote-request orders. */
  itemsLabel: string;
  /** "120 units" / "Qty 512"; empty when unknown. */
  itemsDetail: string;
  /** Formatted money, or "" when the order has neither a quote nor an estimate. */
  totalLabel: string;
  /** True when totalLabel is the customer's cart estimate rather than a final quote. */
  totalIsEstimate: boolean;
  createdAt: string;
  age: string;
  unread: boolean;
  flags: AttentionFlag[];
}

export function customerName(data: RawData): string {
  return [str(data.firstName), str(data.lastName)].filter(Boolean).join(" ");
}

function money(value: number): string {
  return `$${value.toFixed(2)}`;
}

export function toOrderListItem(record: OrderRecord, now: number = Date.now()): OrderListItem {
  const { data } = record;
  const status = normalizeStatus(data.status);
  const items = readOrderItems(data);
  const quoted = num(data.quotedTotal);
  const estimate = num(data.total);

  let itemsLabel: string;
  let itemsDetail = "";
  if (items.length > 0) {
    const units = items.reduce((sum, item) => sum + item.quantity, 0);
    itemsLabel = `${items.length} ${items.length === 1 ? "item" : "items"}`;
    itemsDetail = `${units.toLocaleString("en-US")} ${units === 1 ? "unit" : "units"}`;
  } else {
    itemsLabel = str(data.product) || "Quote request";
    itemsDetail = str(data.quantity) ? `Qty ${str(data.quantity)}` : "";
  }

  return {
    id: record.id,
    reference: formatOrderReference(record.id),
    customer: customerName(data),
    email: str(data.email),
    status,
    statusLabel: MERCH_ORDER_STATUS_LABELS[status],
    itemsLabel,
    itemsDetail,
    totalLabel:
      quoted !== undefined ? money(quoted) : estimate !== undefined ? money(estimate) : "",
    totalIsEstimate: quoted === undefined && estimate !== undefined,
    createdAt: record.createdAt,
    age: formatAge(record.createdAt, now),
    unread: !record.readAt,
    flags: computeAttentionFlags({ createdAt: record.createdAt, data }, now),
  };
}

/** Per-status counts for the tabs; every status is present even at zero. */
export function emptyStatusCounts(): Record<MerchOrderStatus, number> {
  return Object.fromEntries(MERCH_ORDER_STATUSES.map((status) => [status, 0])) as Record<
    MerchOrderStatus,
    number
  >;
}

/** Folds raw group-by rows (status may be null or junk) into the tab counts. */
export function tallyStatusCounts(rows: { status: unknown; n: unknown }[]): {
  counts: Record<MerchOrderStatus, number>;
  all: number;
} {
  const counts = emptyStatusCounts();
  let all = 0;
  for (const row of rows) {
    const n = Number(row.n);
    if (!Number.isFinite(n) || n < 0) continue;
    counts[normalizeStatus(row.status)] += n;
    all += n;
  }
  return { counts, all };
}

// ---------------------------------------------------------------------------
// Backend order sheet (plain text, for "Copy order sheet")
// ---------------------------------------------------------------------------

export interface OrderSheetContact {
  name: string;
  email: string;
  phone: string;
}

export function contactOf(data: RawData): OrderSheetContact {
  return { name: customerName(data), email: str(data.email), phone: str(data.phone) };
}

/**
 * The text the business works from when placing the supplier order in ESP+:
 * reference and date, who to ship to, each line with color / quantity / ESP+
 * link, and the customer's notes. ESP links are included as text so they
 * survive copy/paste and print. Admin-only.
 */
export function buildOrderSheetText(order: {
  id: number;
  createdAt: string;
  data: RawData;
  items: OrderItem[];
}): string {
  const { data, items } = order;
  const contact = contactOf(data);
  const lines: string[] = [
    `Backend order sheet - ${formatOrderReference(order.id)}`,
    `Placed: ${formatOrderDate(order.createdAt) || "unknown"}`,
    "",
    "Customer / ship-to contact",
    `  Name: ${contact.name || "not given"}`,
    `  Email: ${contact.email || "not given"}`,
    `  Phone: ${contact.phone || "not given"}`,
    "",
    "Items",
  ];

  if (items.length === 0) {
    const product = str(data.product);
    const quantity = str(data.quantity);
    lines.push(
      `  ${product || "No items recorded"}${quantity ? ` - estimated quantity ${quantity}` : ""}`
    );
  }
  items.forEach((item, index) => {
    lines.push(`${index + 1}. ${item.quantity} x ${item.name}`);
    lines.push(`   ${describeLineColor(item.color)}`);
    if (item.espUrl) {
      lines.push(
        `   ESP+ link: ${item.espUrl}${item.espKind === "search" ? " (search link)" : ""}`
      );
    }
    if (item.supplier) lines.push(`   Supplier: ${item.supplier}`);
    if (item.productNo) lines.push(`   Product no.: ${item.productNo}`);
  });

  lines.push("", `Customer notes: ${str(data.notes) || "None"}`);
  const quoted = num(data.quotedTotal);
  if (quoted !== undefined) lines.push(`Quoted total: ${money(quoted)}`);
  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// CSV export
// ---------------------------------------------------------------------------

export const ORDER_CSV_COLUMNS = [
  "ref",
  "created",
  "customer",
  "email",
  "phone",
  "items",
  "total",
  "status",
  "paidAt",
  "shippedAt",
  "carrier",
  "tracking",
] as const;

/**
 * One CSV field. Text beginning with = + - @ (or a tab / carriage return, which
 * some spreadsheets also treat as a formula lead-in) is prefixed with an
 * apostrophe so Excel and Sheets read it as text instead of running it.
 * Fields containing a comma, quote, or line break are quoted with doubled
 * quotes. Finite numbers are written as-is; they are produced by this app and
 * are never attacker-controlled text.
 */
export function csvCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "";
  let text = value;
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/**
 * Rows for the current filter as CSV text (CRLF line endings, header first).
 * Columns are limited to what the back office needs to follow an order; no
 * supplier cost or ESP+ data is ever included.
 */
export function buildOrdersCsv(records: OrderRecord[]): string {
  const lines: string[] = [ORDER_CSV_COLUMNS.join(",")];
  for (const record of records) {
    const { data } = record;
    const total = num(data.quotedTotal) ?? num(data.total);
    lines.push(
      [
        csvCell(formatOrderReference(record.id)),
        csvCell(record.createdAt),
        csvCell(customerName(data)),
        csvCell(str(data.email)),
        csvCell(str(data.phone)),
        csvCell(summarizeItems(data)),
        csvCell(total === undefined ? "" : total.toFixed(2)),
        csvCell(MERCH_ORDER_STATUS_LABELS[normalizeStatus(data.status)]),
        csvCell(str(data.paidAt)),
        csvCell(str(data.shippedAt)),
        csvCell(str(data.carrier)),
        csvCell(str(data.trackingNumber)),
      ].join(",")
    );
  }
  return `${lines.join("\r\n")}\r\n`;
}
