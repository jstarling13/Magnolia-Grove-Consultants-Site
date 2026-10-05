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
  quantity: number;
  unitPrice: number;
  lineTotal: number;
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
