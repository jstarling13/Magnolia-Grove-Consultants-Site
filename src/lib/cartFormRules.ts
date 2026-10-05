/**
 * Cart checkout form rules shared by the browser form and the checkout API
 * schema (cartCheckoutSchema in src/lib/merchOrders.ts), so the two cannot
 * disagree about what is acceptable. Pure data and functions only: no zod, no
 * server-only or supplier imports, because this file ships in the client bundle.
 */

export const CART_FORM_LIMITS = {
  nameMax: 100,
  emailMax: 200,
  phoneMin: 7,
  phoneMax: 30,
  notesMax: 2000,
  /** Largest quantity the API accepts on one cart line. */
  lineQuantityMax: 100000,
} as const;

export const CART_FORM_MESSAGES = {
  firstNameRequired: "First name is required.",
  lastNameRequired: "Last name is required.",
  nameTooLong: `Keep this under ${CART_FORM_LIMITS.nameMax} characters.`,
  emailRequired: "Email is required.",
  emailInvalid: "Enter a valid email address.",
  emailTooLong: `Keep your email under ${CART_FORM_LIMITS.emailMax} characters.`,
  phoneRequired: "Phone number is required.",
  phoneTooShort: `Enter a phone number with at least ${CART_FORM_LIMITS.phoneMin} characters.`,
  phoneTooLong: `Keep your phone number under ${CART_FORM_LIMITS.phoneMax} characters.`,
  notesTooLong: `Keep notes under ${CART_FORM_LIMITS.notesMax} characters.`,
  cartEmpty: "Your cart is empty.",
  quantityMax: `The most we can take on one line is ${CART_FORM_LIMITS.lineQuantityMax.toLocaleString("en-US")} units. For larger orders, email us.`,
} as const;

/** Same practical email rule zod applies server-side, written out so the client needs no zod. */
export const EMAIL_PATTERN =
  /^(?!\.)(?!.*\.\.)([A-Za-z0-9_'+\-.]*)[A-Za-z0-9_+-]@([A-Za-z0-9][A-Za-z0-9-]*\.)+[A-Za-z]{2,}$/;

export const CART_CONTACT_FIELDS = ["firstName", "lastName", "email", "phone", "notes"] as const;
export type CartContactField = (typeof CART_CONTACT_FIELDS)[number];
export type CartContactValues = Record<CartContactField, string>;
export type CartFieldErrors = Partial<Record<CartContactField, string>>;

/** Client-side check of the contact fields; mirrors the server schema's rules and messages. */
export function validateCartContact(values: CartContactValues): CartFieldErrors {
  const errors: CartFieldErrors = {};
  const firstName = values.firstName.trim();
  const lastName = values.lastName.trim();
  const email = values.email.trim();
  const phone = values.phone.trim();

  if (!firstName) errors.firstName = CART_FORM_MESSAGES.firstNameRequired;
  else if (firstName.length > CART_FORM_LIMITS.nameMax)
    errors.firstName = CART_FORM_MESSAGES.nameTooLong;

  if (!lastName) errors.lastName = CART_FORM_MESSAGES.lastNameRequired;
  else if (lastName.length > CART_FORM_LIMITS.nameMax)
    errors.lastName = CART_FORM_MESSAGES.nameTooLong;

  if (!email) errors.email = CART_FORM_MESSAGES.emailRequired;
  else if (email.length > CART_FORM_LIMITS.emailMax) errors.email = CART_FORM_MESSAGES.emailTooLong;
  else if (!EMAIL_PATTERN.test(email)) errors.email = CART_FORM_MESSAGES.emailInvalid;

  if (!phone) errors.phone = CART_FORM_MESSAGES.phoneRequired;
  else if (phone.length < CART_FORM_LIMITS.phoneMin)
    errors.phone = CART_FORM_MESSAGES.phoneTooShort;
  else if (phone.length > CART_FORM_LIMITS.phoneMax) errors.phone = CART_FORM_MESSAGES.phoneTooLong;

  if (values.notes.trim().length > CART_FORM_LIMITS.notesMax) {
    errors.notes = CART_FORM_MESSAGES.notesTooLong;
  }
  return errors;
}

export interface ServerValidationErrors {
  fields: CartFieldErrors;
  /** First message for anything that is not a contact field (the items list, for example). */
  other?: string;
}

/**
 * Reads the `issues` object the checkout API returns on a 400 (zod's
 * `flatten()` output) into per-field messages. Tolerant of any shape: returns
 * empty results rather than throwing.
 */
export function fieldErrorsFromIssues(issues: unknown): ServerValidationErrors {
  const result: ServerValidationErrors = { fields: {} };
  if (!issues || typeof issues !== "object") return result;
  const fieldErrors = (issues as { fieldErrors?: unknown }).fieldErrors;
  if (fieldErrors && typeof fieldErrors === "object") {
    for (const [key, value] of Object.entries(fieldErrors as Record<string, unknown>)) {
      const message = Array.isArray(value)
        ? value.find((entry): entry is string => typeof entry === "string" && entry !== "")
        : undefined;
      if (!message) continue;
      if ((CART_CONTACT_FIELDS as readonly string[]).includes(key)) {
        result.fields[key as CartContactField] = message;
      } else if (!result.other && key !== "company_website" && key !== "turnstileToken") {
        result.other = message;
      }
    }
  }
  const formErrors = (issues as { formErrors?: unknown }).formErrors;
  if (!result.other && Array.isArray(formErrors)) {
    const message = formErrors.find((entry): entry is string => typeof entry === "string");
    if (message) result.other = message;
  }
  return result;
}

export type QuantityDraft =
  { kind: "empty" } | { kind: "invalid" } | { kind: "ok"; value: number; clamped: boolean };

/**
 * Reads what a shopper has typed into a quantity box. Empty and unfinished
 * drafts are reported rather than coerced, so the box can stay empty while
 * they retype; values above `max` are clamped to it.
 */
export function parseQuantityDraft(
  draft: string,
  max: number = CART_FORM_LIMITS.lineQuantityMax
): QuantityDraft {
  const text = draft.trim();
  if (text === "") return { kind: "empty" };
  if (!/^\d+$/.test(text)) return { kind: "invalid" };
  const value = Number.parseInt(text, 10);
  if (!Number.isFinite(value) || value < 1) return { kind: "invalid" };
  return value > max
    ? { kind: "ok", value: max, clamped: true }
    : { kind: "ok", value, clamped: false };
}
