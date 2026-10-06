import { z } from "zod";
import { CART_FORM_LIMITS, CART_FORM_MESSAGES, EMAIL_PATTERN } from "@/lib/cartFormRules";

// Not length-limited here: the route checks it and returns a fake success, so the bot never learns it was caught.
const honeypotField = z.string().max(500).optional();

export const merchOrderRequestSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required.").max(100),
  lastName: z.string().trim().min(1, "Last name is required.").max(100),
  email: z.string().trim().email("Enter a valid email address.").max(200),
  phone: z.string().trim().min(7, "Phone number is required.").max(30),
  product: z.string().trim().min(1, "Tell us what product you're looking for.").max(300),
  quantity: z.string().trim().min(1, "Estimated quantity is required.").max(50),
  budget: z.string().trim().max(100).optional().or(z.literal("")),
  deadline: z.string().trim().max(100).optional().or(z.literal("")),
  notes: z.string().trim().max(2000).optional().or(z.literal("")),
  company_website: honeypotField,
  turnstileToken: z.string().optional(),
});

export type MerchOrderRequestPayload = z.infer<typeof merchOrderRequestSchema>;

export const cartCheckoutSchema = z.object({
  // Limits, patterns and messages come from cartFormRules so the browser form
  // and this schema always agree.
  firstName: z
    .string()
    .trim()
    .min(1, CART_FORM_MESSAGES.firstNameRequired)
    .max(CART_FORM_LIMITS.nameMax, CART_FORM_MESSAGES.nameTooLong),
  lastName: z
    .string()
    .trim()
    .min(1, CART_FORM_MESSAGES.lastNameRequired)
    .max(CART_FORM_LIMITS.nameMax, CART_FORM_MESSAGES.nameTooLong),
  email: z
    .string()
    .trim()
    .min(1, CART_FORM_MESSAGES.emailRequired)
    .max(CART_FORM_LIMITS.emailMax, CART_FORM_MESSAGES.emailTooLong)
    .regex(EMAIL_PATTERN, CART_FORM_MESSAGES.emailInvalid),
  phone: z
    .string()
    .trim()
    .min(1, CART_FORM_MESSAGES.phoneRequired)
    .min(CART_FORM_LIMITS.phoneMin, CART_FORM_MESSAGES.phoneTooShort)
    .max(CART_FORM_LIMITS.phoneMax, CART_FORM_MESSAGES.phoneTooLong),
  notes: z
    .string()
    .trim()
    .max(CART_FORM_LIMITS.notesMax, CART_FORM_MESSAGES.notesTooLong)
    .optional()
    .or(z.literal("")),
  items: z
    .array(
      z.object({
        productId: z.string().trim().min(1).max(100),
        // Which color the customer chose. Whether it is required, and whether
        // it is one of the product's real colors, is checked server-side
        // against the catalog (see validateCart), not here.
        color: z.string().trim().max(100).optional(),
        quantity: z
          .number()
          .int()
          .positive()
          .max(CART_FORM_LIMITS.lineQuantityMax, CART_FORM_MESSAGES.quantityMax),
        // Optional free text per line, e.g. "24 M, 60 L, 60 XL" and "Left chest, white ink".
        sizes: z
          .string()
          .trim()
          .max(CART_FORM_LIMITS.lineDetailMax, CART_FORM_MESSAGES.sizesTooLong)
          .optional(),
        imprintNotes: z
          .string()
          .trim()
          .max(CART_FORM_LIMITS.lineDetailMax, CART_FORM_MESSAGES.imprintNotesTooLong)
          .optional(),
      })
    )
    .min(1, CART_FORM_MESSAGES.cartEmpty),
  /**
   * The shopper is attaching a logo. The file itself never travels in this JSON
   * request: it is uploaded to /api/merchant/order-logo right after the order
   * is created, using the token this route returns.
   */
  hasLogo: z.boolean().optional(),
  company_website: honeypotField,
  turnstileToken: z.string().optional(),
});

export type CartCheckoutPayload = z.infer<typeof cartCheckoutSchema>;

/** A cart line item with pricing recalculated server-side — never trust client-submitted prices. */
export interface PricedCartLineItem {
  productId: string;
  name: string;
  /** Color the customer chose; absent for products without colors and for orders stored before colors were recorded. */
  color?: string;
  quantity: number;
  /** Customer's size breakdown, e.g. "24 M, 60 L, 60 XL"; absent when not given and on older orders. */
  sizes?: string;
  /** Customer's imprint notes (location, ink color); absent when not given and on older orders. */
  imprintNotes?: string;
  unitPrice: number;
  lineTotal: number;
  /**
   * Internal, backend-only supplier lookup fields, stamped server-side from
   * src/lib/espLinks.ts. Optional so orders stored before this existed still
   * type-check. Never render these to customers or trust them from the client.
   */
  espUrl?: string;
  espKind?: "product" | "search";
  supplier?: string;
  asi?: string;
  productNo?: string;
}

/**
 * Lifecycle for a merch order request, per CLAUDE_HANDOFF.md's integration
 * checklist: no order is ever placed with the supplier automatically — an
 * admin manually orders through ESP and updates status to reflect that.
 * The customer pays the full quoted amount first, so ESP is never ordered
 * on the business's own money.
 */
export const MERCH_ORDER_STATUSES = [
  "new",
  "reviewing",
  "quoted",
  "awaiting_payment",
  "paid",
  "ordered_in_esp",
  "fulfilled",
  "cancelled",
] as const;

export type MerchOrderStatus = (typeof MERCH_ORDER_STATUSES)[number];

export const MERCH_ORDER_STATUS_LABELS: Record<MerchOrderStatus, string> = {
  new: "New",
  reviewing: "Reviewing",
  quoted: "Quoted",
  awaiting_payment: "Awaiting Payment",
  paid: "Paid",
  ordered_in_esp: "Ordered in ESP",
  fulfilled: "Fulfilled",
  cancelled: "Cancelled",
};

const REQUIRES_PAYMENT: readonly MerchOrderStatus[] = ["ordered_in_esp", "fulfilled"];

/** `warning` is set when the change went through but something needs the admin's attention. */
export type StatusChangeResult = { ok: true; warning?: string } | { ok: false; error: string };

/** Blocks moving an order to a supplier-ordered state until payment is confirmed. */
export function canSetMerchStatus(
  data: Record<string, unknown>,
  target: MerchOrderStatus
): StatusChangeResult {
  if (REQUIRES_PAYMENT.includes(target) && typeof data.paidAt !== "string") {
    return {
      ok: false,
      error:
        "Payment hasn't been received yet — send the payment link and wait for it to clear before ordering from ESP.",
    };
  }
  return { ok: true };
}

const MAX_QUOTE_DOLLARS = 250_000;

export type QuoteAmountResult = { ok: true; cents: number } | { ok: false; error: string };

/** Validates an admin-entered final quote and converts it to whole cents. */
export function parseQuoteAmount(input: number): QuoteAmountResult {
  if (!Number.isFinite(input) || input <= 0) {
    return { ok: false, error: "Enter a quote greater than $0." };
  }
  if (input > MAX_QUOTE_DOLLARS) {
    return {
      ok: false,
      error: `Quotes above $${MAX_QUOTE_DOLLARS.toLocaleString("en-US")} need to be invoiced manually.`,
    };
  }
  return { ok: true, cents: Math.round(input * 100) };
}

export const MAX_QUOTE_EXTRA_LABEL = 60;

export interface QuoteExtra {
  /** What the extra charge is for, e.g. "Shipping" or "Setup fee". */
  label: string;
  /** Dollars, rounded to whole cents. */
  amount: number;
}

export type QuoteExtraResult =
  { ok: true; extra: QuoteExtra | null } | { ok: false; error: string };

/**
 * Validates the optional shipping / setup line an admin adds to a quote. An
 * empty or zero line means "no extra"; a charge needs a short plain-text label.
 */
export function parseQuoteExtra(
  input: { label?: unknown; amount?: unknown } | null | undefined
): QuoteExtraResult {
  if (!input) return { ok: true, extra: null };
  const amount = typeof input.amount === "number" ? input.amount : Number(input.amount ?? 0);
  const label = String(input.label ?? "")
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!Number.isFinite(amount) || amount < 0) {
    return { ok: false, error: "The shipping or setup amount can't be negative." };
  }
  if (amount === 0) return { ok: true, extra: null };
  if (amount > MAX_QUOTE_DOLLARS) {
    return { ok: false, error: "The shipping or setup amount is too large." };
  }
  if (!label) return { ok: false, error: "Add a short label for the shipping or setup charge." };
  if (label.length > MAX_QUOTE_EXTRA_LABEL) {
    return {
      ok: false,
      error: `Keep the shipping or setup label under ${MAX_QUOTE_EXTRA_LABEL} characters.`,
    };
  }
  return { ok: true, extra: { label, amount: Math.round(amount * 100) / 100 } };
}

// ---------------------------------------------------------------------------
// Audit trail (stored as data.auditLog, newest last). Orders placed before this
// existed simply have no log; every reader treats a missing or malformed log as empty.
// ---------------------------------------------------------------------------

export type AuditKind = "status" | "quote" | "payment" | "esp_order" | "shipped";

export interface AuditEntry {
  /** ISO timestamp. */
  at: string;
  /** Admin username, or "Square" when payment was detected automatically. */
  by: string;
  kind: AuditKind;
  from?: MerchOrderStatus;
  to?: MerchOrderStatus;
  detail?: string;
}

const AUDIT_KINDS: readonly AuditKind[] = ["status", "quote", "payment", "esp_order", "shipped"];
export const MAX_AUDIT_ENTRIES = 200;

function asStatus(value: unknown): MerchOrderStatus | undefined {
  return MERCH_ORDER_STATUSES.includes(value as MerchOrderStatus)
    ? (value as MerchOrderStatus)
    : undefined;
}

export function makeAuditEntry(entry: {
  by: string;
  kind: AuditKind;
  from?: unknown;
  to?: unknown;
  detail?: string;
  at?: string;
}): AuditEntry {
  const from = asStatus(entry.from);
  const to = asStatus(entry.to);
  return {
    at: entry.at ?? new Date().toISOString(),
    by: entry.by.trim().slice(0, 60) || "Unknown",
    kind: entry.kind,
    ...(from ? { from } : {}),
    ...(to ? { to } : {}),
    ...(entry.detail ? { detail: entry.detail.slice(0, 300) } : {}),
  };
}

/** The stored audit entries, oldest first. Anything malformed is dropped. */
export function readAuditLog(data: Record<string, unknown>): AuditEntry[] {
  if (!Array.isArray(data.auditLog)) return [];
  const entries: AuditEntry[] = [];
  for (const raw of data.auditLog as unknown[]) {
    if (!raw || typeof raw !== "object") continue;
    const item = raw as Record<string, unknown>;
    if (typeof item.at !== "string" || !Number.isFinite(Date.parse(item.at))) continue;
    if (typeof item.by !== "string" || !item.by) continue;
    if (!AUDIT_KINDS.includes(item.kind as AuditKind)) continue;
    entries.push(
      makeAuditEntry({
        at: item.at,
        by: item.by,
        kind: item.kind as AuditKind,
        from: item.from,
        to: item.to,
        ...(typeof item.detail === "string" ? { detail: item.detail } : {}),
      })
    );
  }
  return entries.sort((a, b) => Date.parse(a.at) - Date.parse(b.at)).slice(-MAX_AUDIT_ENTRIES);
}

/** JSON array text for the `auditLog` append in the UPDATE statements ("[]" when there is nothing to add). */
export function auditEntriesJson(entries: (AuditEntry | undefined)[]): string {
  return JSON.stringify(entries.filter((entry): entry is AuditEntry => Boolean(entry)));
}

/**
 * Customer-facing order reference, derived from the saved submission id so it
 * needs no extra column: id 42 becomes "MG-00042". Ids past five digits just
 * grow longer.
 */
export function formatOrderReference(id: number): string {
  return `MG-${String(Math.trunc(id)).padStart(5, "0")}`;
}

// ---------------------------------------------------------------------------
// Fulfillment fields (stored in the submission JSON; set from the admin
// dashboard). espOrderNumber is internal and must never reach a customer.
// ---------------------------------------------------------------------------

export type FieldResult<T> = { ok: true; value: T } | { ok: false; error: string };

const ESP_ORDER_NUMBER_PATTERN = /^[A-Za-z0-9][A-Za-z0-9 ._#/-]{0,39}$/;
const CARRIER_PATTERN = /^[A-Za-z0-9][A-Za-z0-9 &.\-/]{1,39}$/;
const TRACKING_NUMBER_PATTERN = /^[A-Za-z0-9-]{5,40}$/;

/** Validates the supplier-side order number an admin records after ordering. */
export function parseEspOrderNumber(input: string): FieldResult<string> {
  const value = String(input ?? "").trim();
  if (!value) return { ok: false, error: "Enter the ESP order number." };
  if (!ESP_ORDER_NUMBER_PATTERN.test(value)) {
    return {
      ok: false,
      error:
        "The ESP order number can be up to 40 characters: letters, numbers, spaces, and . _ # / -",
    };
  }
  return { ok: true, value };
}

export interface ShipmentInput {
  carrier: string;
  trackingNumber: string;
}

/**
 * Validates carrier and tracking number. Spaces inside a pasted tracking number
 * are dropped ("1Z 999 AA1" becomes "1Z999AA1"); the carrier's runs of spaces
 * are collapsed.
 */
export function parseShipment(input: ShipmentInput): FieldResult<ShipmentInput> {
  const carrier = String(input?.carrier ?? "")
    .trim()
    .replace(/\s+/g, " ");
  const trackingNumber = String(input?.trackingNumber ?? "").replace(/\s+/g, "");
  if (!carrier) return { ok: false, error: "Enter the carrier (for example UPS or FedEx)." };
  if (!CARRIER_PATTERN.test(carrier)) {
    return {
      ok: false,
      error: "The carrier can be 2 to 40 characters: letters, numbers, spaces, and & . - /",
    };
  }
  if (!trackingNumber) return { ok: false, error: "Enter the tracking number." };
  if (!TRACKING_NUMBER_PATTERN.test(trackingNumber)) {
    return {
      ok: false,
      error: "The tracking number can be 5 to 40 letters, numbers, or dashes.",
    };
  }
  return { ok: true, value: { carrier, trackingNumber } };
}

export type KnownCarrier = "UPS" | "FedEx" | "USPS" | "DHL";

const CARRIER_ALIASES: Record<string, KnownCarrier> = {
  ups: "UPS",
  unitedparcelservice: "UPS",
  fedex: "FedEx",
  federalexpress: "FedEx",
  usps: "USPS",
  unitedstatespostalservice: "USPS",
  uspostalservice: "USPS",
  uspostoffice: "USPS",
  dhl: "DHL",
  dhlexpress: "DHL",
};

/** Maps free-text carrier input to one of the carriers we can link to, or undefined. */
export function recognizeCarrier(carrier: string): KnownCarrier | undefined {
  return CARRIER_ALIASES[
    String(carrier ?? "")
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "")
  ];
}

/**
 * Public tracking page for a recognized carrier, or undefined for any other
 * carrier (the email then just shows the number). The number is URL-encoded,
 * so no input can break out of the query string.
 */
export function buildTrackingUrl(carrier: string, trackingNumber: string): string | undefined {
  const known = recognizeCarrier(carrier);
  const number = String(trackingNumber ?? "").replace(/\s+/g, "");
  if (!known || !number) return undefined;
  const encoded = encodeURIComponent(number);
  switch (known) {
    case "UPS":
      return `https://www.ups.com/track?tracknum=${encoded}`;
    case "FedEx":
      return `https://www.fedex.com/fedextrack/?trknbr=${encoded}`;
    case "USPS":
      return `https://tools.usps.com/go/TrackConfirmAction?tLabels=${encoded}`;
    case "DHL":
      return `https://www.dhl.com/us-en/home/tracking/tracking-express.html?submit=1&tracking-id=${encoded}`;
  }
}
