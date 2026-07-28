import { z } from "zod";

/**
 * Shared server-side validation for both public forms. Mirrors the
 * client-side checks in LeadForm.tsx / StrategySessionForm.tsx but is the
 * authoritative source of truth — never trust client validation alone.
 */

const honeypotField = z.string().max(0, "Bot detected").optional().or(z.literal(""));

export const leadFormSchema = z.object({
  formType: z.literal("lead"),
  firstName: z.string().trim().min(1, "First name is required.").max(100),
  lastName: z.string().trim().min(1, "Last name is required.").max(100),
  email: z.string().trim().email("Enter a valid email address.").max(200),
  phone: z.string().trim().min(7, "Phone number is required.").max(30),
  service: z.string().trim().min(1, "Please select a service."),
  message: z.string().trim().min(1, "Please tell us about your project.").max(4000),
  company_website: honeypotField,
  turnstileToken: z.string().optional(),
});

export const strategySessionSchema = z.object({
  formType: z.literal("strategy"),
  orgName: z.string().trim().min(1, "Organization name is required.").max(200),
  contactName: z.string().trim().min(1, "Full name is required.").max(100),
  role: z.string().trim().min(1, "Title / role is required.").max(100),
  email: z.string().trim().email("Enter a valid email address.").max(200),
  phone: z.string().trim().min(7, "Phone number is required.").max(30),
  pillar: z.string().trim().min(1, "Please select an area of interest."),
  budget: z.string().trim().min(1, "Please select an estimated budget range."),
  timeline: z.string().trim().min(1, "Please select an engagement timeline."),
  message: z.string().trim().min(1, "Please tell us about your race or initiative.").max(4000),
  company_website: honeypotField,
  turnstileToken: z.string().optional(),
});

export const contactSubmissionSchema = z.discriminatedUnion("formType", [
  leadFormSchema,
  strategySessionSchema,
]);

export type LeadFormPayload = z.infer<typeof leadFormSchema>;
export type StrategySessionPayload = z.infer<typeof strategySessionSchema>;
export type ContactSubmission = z.infer<typeof contactSubmissionSchema>;

/**
 * Client invoice payments (Square-hosted checkout). This is not a political
 * contribution form — no FEC fields (occupation, employer, etc.) apply here.
 */
export const paymentRequestSchema = z.object({
  organizationName: z.string().trim().min(1, "Organization name is required.").max(200),
  firstName: z.string().trim().min(1, "First name is required.").max(100),
  lastName: z.string().trim().min(1, "Last name is required.").max(100),
  email: z.string().trim().email("Enter a valid email address.").max(200),
  memo: z.string().trim().min(1, "Please add a note or invoice reference.").max(300),
  amount: z.coerce
    .number()
    .positive("Enter an amount greater than $0.")
    .max(1_000_000, "Amount is too large."),
  company_website: honeypotField,
});

export type PaymentRequestPayload = z.infer<typeof paymentRequestSchema>;
