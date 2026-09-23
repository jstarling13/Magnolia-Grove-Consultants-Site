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

/**
 * Lifecycle for a merch order request, per CLAUDE_HANDOFF.md's integration
 * checklist: no order is ever placed with the supplier automatically — an
 * admin manually orders through ESP and updates status to reflect that.
 */
export const MERCH_ORDER_STATUSES = [
  "new",
  "reviewing",
  "quoted",
  "approved",
  "ordered_in_esp",
  "fulfilled",
  "cancelled",
] as const;

export type MerchOrderStatus = (typeof MERCH_ORDER_STATUSES)[number];

export const MERCH_ORDER_STATUS_LABELS: Record<MerchOrderStatus, string> = {
  new: "New",
  reviewing: "Reviewing",
  quoted: "Quoted",
  approved: "Approved",
  ordered_in_esp: "Ordered in ESP",
  fulfilled: "Fulfilled",
  cancelled: "Cancelled",
};
