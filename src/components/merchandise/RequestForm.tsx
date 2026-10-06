"use client";

import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { Loader2 } from "lucide-react";
import Turnstile from "@/components/Turnstile";
import { FOCUS_RING, fieldClasses } from "@/components/global/focusRing";

interface FormFields {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  product: string;
  quantity: string;
  budget: string;
  deadline: string;
  notes: string;
  company_website: string;
}

const initialFields: FormFields = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  product: "",
  quantity: "",
  budget: "",
  deadline: "",
  notes: "",
  company_website: "",
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DEFAULT_ERROR =
  "Something went wrong. Please double-check your info or email ben@magnoliagrovega.com.";

function validate(fields: FormFields): Partial<Record<keyof FormFields, string>> {
  const errors: Partial<Record<keyof FormFields, string>> = {};

  if (!fields.firstName.trim()) errors.firstName = "First name is required.";
  if (!fields.lastName.trim()) errors.lastName = "Last name is required.";

  if (!fields.email.trim()) {
    errors.email = "Email is required.";
  } else if (!EMAIL_PATTERN.test(fields.email)) {
    errors.email = "Enter a valid email address.";
  }

  if (!fields.phone.trim()) errors.phone = "Phone number is required.";
  if (!fields.product.trim()) errors.product = "Tell us what product you're looking for.";
  if (!fields.quantity.trim()) errors.quantity = "Estimated quantity is required.";

  return errors;
}

/** Form order, for moving focus to the first field that needs fixing. */
const FIELD_ORDER: (keyof FormFields)[] = [
  "firstName",
  "lastName",
  "email",
  "phone",
  "product",
  "quantity",
];

type Status = "idle" | "submitting" | "success" | "error";

export default function MerchRequestForm() {
  const [fields, setFields] = useState<FormFields>(initialFields);
  const [errors, setErrors] = useState<Partial<Record<keyof FormFields, string>>>({});
  const [status, setStatus] = useState<Status>("idle");
  const [submitError, setSubmitError] = useState("");
  const [turnstileToken, setTurnstileToken] = useState("");
  const successRef = useRef<HTMLHeadingElement>(null);
  const errorRef = useRef<HTMLParagraphElement>(null);

  // Success replaces the form, so focus would otherwise be lost with it.
  useEffect(() => {
    if (status === "success") successRef.current?.focus();
    if (status === "error") errorRef.current?.focus();
  }, [status]);

  function handleChange(
    event: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) {
    const { name, value } = event.target;
    setFields((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: undefined }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const validationErrors = validate(fields);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      const first = FIELD_ORDER.find((name) => validationErrors[name]);
      if (first) document.getElementById(first)?.focus();
      return;
    }

    setStatus("submitting");
    setSubmitError("");

    try {
      const response = await fetch("/api/merchant/order-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...fields, turnstileToken }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setSubmitError(data.error || DEFAULT_ERROR);
        setStatus("error");
        return;
      }

      setStatus("success");
      setFields(initialFields);
    } catch {
      setSubmitError(DEFAULT_ERROR);
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <div
        role="status"
        className="flex flex-col items-center justify-center rounded-lg border border-gold/25 bg-cream/85 px-8 py-16 text-center"
      >
        <h3 ref={successRef} tabIndex={-1} className="text-2xl text-onyx focus:outline-none">
          Request Received
        </h3>
        <p className="mt-3 max-w-md text-base leading-relaxed text-onyx/60">
          We&apos;ll source pricing and get back to you with a quote shortly.
        </p>
        <button
          type="button"
          onClick={() => setStatus("idle")}
          className={`mt-8 inline-flex min-h-11 items-center rounded-md border border-gold-text px-6 py-3 text-sm font-semibold text-gold-text transition-colors hover:bg-gold/10 ${FOCUS_RING}`}
        >
          Submit another request
        </button>
      </div>
    );
  }

  return (
    <form
      noValidate
      onSubmit={handleSubmit}
      className="relative rounded-lg border border-gold/25 bg-cream/85 p-6 sm:p-10"
    >
      <input
        type="text"
        name="company_website"
        value={fields.company_website}
        onChange={handleChange}
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="absolute left-[-9999px] h-0 w-0 opacity-0"
      />

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div>
          <label htmlFor="firstName" className="mb-2 block text-sm font-medium text-onyx/80">
            First Name
          </label>
          <input
            id="firstName"
            name="firstName"
            type="text"
            autoComplete="given-name"
            value={fields.firstName}
            onChange={handleChange}
            required
            aria-invalid={Boolean(errors.firstName)}
            aria-describedby={errors.firstName ? "firstName-error" : undefined}
            className={fieldClasses(Boolean(errors.firstName))}
          />
          {errors.firstName && (
            <p id="firstName-error" role="alert" className="mt-1.5 text-xs text-red-700">
              {errors.firstName}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="lastName" className="mb-2 block text-sm font-medium text-onyx/80">
            Last Name
          </label>
          <input
            id="lastName"
            name="lastName"
            type="text"
            autoComplete="family-name"
            value={fields.lastName}
            onChange={handleChange}
            required
            aria-invalid={Boolean(errors.lastName)}
            aria-describedby={errors.lastName ? "lastName-error" : undefined}
            className={fieldClasses(Boolean(errors.lastName))}
          />
          {errors.lastName && (
            <p id="lastName-error" role="alert" className="mt-1.5 text-xs text-red-700">
              {errors.lastName}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="email" className="mb-2 block text-sm font-medium text-onyx/80">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            value={fields.email}
            onChange={handleChange}
            required
            aria-invalid={Boolean(errors.email)}
            aria-describedby={errors.email ? "email-error" : undefined}
            className={fieldClasses(Boolean(errors.email))}
          />
          {errors.email && (
            <p id="email-error" role="alert" className="mt-1.5 text-xs text-red-700">
              {errors.email}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="phone" className="mb-2 block text-sm font-medium text-onyx/80">
            Phone
          </label>
          <input
            id="phone"
            name="phone"
            type="tel"
            autoComplete="tel"
            value={fields.phone}
            onChange={handleChange}
            required
            aria-invalid={Boolean(errors.phone)}
            aria-describedby={errors.phone ? "phone-error" : undefined}
            className={fieldClasses(Boolean(errors.phone))}
          />
          {errors.phone && (
            <p id="phone-error" role="alert" className="mt-1.5 text-xs text-red-700">
              {errors.phone}
            </p>
          )}
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="product" className="mb-2 block text-sm font-medium text-onyx/80">
            What Product Are You Looking For?
          </label>
          <input
            id="product"
            name="product"
            type="text"
            placeholder="e.g. Branded quarter-zip pullovers"
            value={fields.product}
            onChange={handleChange}
            required
            aria-invalid={Boolean(errors.product)}
            aria-describedby={errors.product ? "product-error" : undefined}
            className={fieldClasses(Boolean(errors.product))}
          />
          {errors.product && (
            <p id="product-error" role="alert" className="mt-1.5 text-xs text-red-700">
              {errors.product}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="quantity" className="mb-2 block text-sm font-medium text-onyx/80">
            Estimated Quantity
          </label>
          <input
            id="quantity"
            name="quantity"
            type="text"
            placeholder="e.g. 100"
            value={fields.quantity}
            onChange={handleChange}
            required
            aria-invalid={Boolean(errors.quantity)}
            aria-describedby={errors.quantity ? "quantity-error" : undefined}
            className={fieldClasses(Boolean(errors.quantity))}
          />
          {errors.quantity && (
            <p id="quantity-error" role="alert" className="mt-1.5 text-xs text-red-700">
              {errors.quantity}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="budget" className="mb-2 block text-sm font-medium text-onyx/80">
            Budget (Optional)
          </label>
          <input
            id="budget"
            name="budget"
            type="text"
            placeholder="e.g. $1,000–$2,000"
            value={fields.budget}
            onChange={handleChange}
            className={fieldClasses()}
          />
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="deadline" className="mb-2 block text-sm font-medium text-onyx/80">
            Deadline (Optional)
          </label>
          <input
            id="deadline"
            name="deadline"
            type="text"
            placeholder="e.g. Needed by October 15"
            value={fields.deadline}
            onChange={handleChange}
            className={fieldClasses()}
          />
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="notes" className="mb-2 block text-sm font-medium text-onyx/80">
            Anything Else?
          </label>
          <textarea
            id="notes"
            name="notes"
            rows={4}
            value={fields.notes}
            onChange={handleChange}
            placeholder="Colors, branding details, sizing needs, etc."
            className={`${fieldClasses()} resize-none`}
          />
        </div>
      </div>

      <div className="mt-6">
        <Turnstile onToken={setTurnstileToken} />
      </div>

      {status === "error" && (
        <p
          ref={errorRef}
          tabIndex={-1}
          role="alert"
          className="mt-6 rounded-md border border-red-700/40 bg-red-500/10 px-4 py-3 text-sm text-red-700 focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-text"
        >
          {submitError || DEFAULT_ERROR}
        </p>
      )}

      <button
        type="submit"
        disabled={status === "submitting"}
        className={`mt-8 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-gold px-6 py-4 text-sm font-semibold text-onyx transition-all hover:bg-gold-bright disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto ${FOCUS_RING}`}
      >
        {status === "submitting" ? (
          <>
            <Loader2
              size={18}
              aria-hidden="true"
              className="animate-spin motion-reduce:animate-none"
            />
            Submitting...
          </>
        ) : (
          "Submit Request"
        )}
      </button>
      <p role="status" className="sr-only">
        {status === "submitting" ? "Submitting your request." : ""}
      </p>
    </form>
  );
}
