import { z } from "zod";

const honeypotField = z.string().max(0, "Bot detected").optional().or(z.literal(""));

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
  firstName: z.string().trim().min(1, "First name is required.").max(100),
  lastName: z.string().trim().min(1, "Last name is required.").max(100),
  email: z.string().trim().email("Enter a valid email address.").max(200),
  phone: z.string().trim().min(7, "Phone number is required.").max(30),
  notes: z.string().trim().max(2000).optional().or(z.literal("")),
  items: z
    .array(
      z.object({
        productId: z.string().trim().min(1).max(100),
        // Which color the customer chose. Whether it is required, and whether
        // it is one of the product's real colors, is checked server-side
        // against the catalog (see validateCart), not here.
        color: z.string().trim().max(100).optional(),
        quantity: z.number().int().positive().max(100000),
      })
    )
    .min(1, "Your cart is empty."),
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

export type StatusChangeResult = { ok: true } | { ok: false; error: string };

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
