"use client";

import { useState, type ChangeEvent, type FormEvent } from "react";
import { CheckCircle2, Loader2, Send } from "lucide-react";
import Turnstile from "@/components/Turnstile";

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
const DEFAULT_ERROR = "Something went wrong. Please double-check your info or email ben@magnoliagrovega.com.";

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

const inputClasses =
  "w-full rounded-md border bg-cream px-4 py-3 text-sm text-onyx placeholder:text-onyx/50 focus:outline-none focus:ring-2 focus:ring-gold/60 transition-colors";

type Status = "idle" | "submitting" | "success" | "error";

export default function MerchRequestForm() {
  const [fields, setFields] = useState<FormFields>(initialFields);
  const [errors, setErrors] = useState<Partial<Record<keyof FormFields, string>>>({});
  const [status, setStatus] = useState<Status>("idle");
  const [submitError, setSubmitError] = useState("");
  const [turnstileToken, setTurnstileToken] = useState("");

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
      <div className="flex flex-col items-center justify-center rounded-lg border border-gold/25 bg-cream/85 px-8 py-16 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full border border-gold/40 bg-gold/10 text-gold-bright">
          <CheckCircle2 size={32} />
        </div>
        <h3 className="mt-6 text-2xl text-onyx">Request Received</h3>
        <p className="mt-3 max-w-md text-base leading-relaxed text-onyx/60">
          We&apos;ll source pricing and get back to you with a quote shortly.
        </p>
        <button
          type="button"
          onClick={() => setStatus("idle")}
          className="mt-8 inline-flex items-center rounded-md border border-gold/60 px-6 py-3 text-sm font-semibold text-gold-bright transition-colors hover:bg-gold/10"
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
            aria-invalid={Boolean(errors.firstName)}
            className={`${inputClasses} ${errors.firstName ? "border-red-500" : "border-gold/25"}`}
          />
          {errors.firstName && <p className="mt-1.5 text-xs text-red-500">{errors.firstName}</p>}
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
            aria-invalid={Boolean(errors.lastName)}
            className={`${inputClasses} ${errors.lastName ? "border-red-500" : "border-gold/25"}`}
          />
          {errors.lastName && <p className="mt-1.5 text-xs text-red-500">{errors.lastName}</p>}
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
            aria-invalid={Boolean(errors.email)}
            className={`${inputClasses} ${errors.email ? "border-red-500" : "border-gold/25"}`}
          />
          {errors.email && <p className="mt-1.5 text-xs text-red-500">{errors.email}</p>}
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
            aria-invalid={Boolean(errors.phone)}
            className={`${inputClasses} ${errors.phone ? "border-red-500" : "border-gold/25"}`}
          />
          {errors.phone && <p className="mt-1.5 text-xs text-red-500">{errors.phone}</p>}
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
            aria-invalid={Boolean(errors.product)}
            className={`${inputClasses} ${errors.product ? "border-red-500" : "border-gold/25"}`}
          />
          {errors.product && <p className="mt-1.5 text-xs text-red-500">{errors.product}</p>}
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
            aria-invalid={Boolean(errors.quantity)}
            className={`${inputClasses} ${errors.quantity ? "border-red-500" : "border-gold/25"}`}
          />
          {errors.quantity && <p className="mt-1.5 text-xs text-red-500">{errors.quantity}</p>}
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
            className={`${inputClasses} border-gold/25`}
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
            className={`${inputClasses} border-gold/25`}
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
            className={`${inputClasses} resize-none border-gold/25`}
          />
        </div>
      </div>

      <div className="mt-6">
        <Turnstile onToken={setTurnstileToken} />
      </div>

      {status === "error" && (
        <p className="mt-6 rounded-md border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {submitError || DEFAULT_ERROR}
        </p>
      )}

      <button
        type="submit"
        disabled={status === "submitting"}
        className="mt-8 inline-flex w-full items-center justify-center gap-2 rounded-md bg-gold px-6 py-4 text-sm font-semibold text-onyx transition-all hover:bg-gold-bright disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto"
      >
        {status === "submitting" ? (
          <>
            <Loader2 size={18} className="animate-spin" />
            Submitting...
          </>
        ) : (
          <>
            <Send size={18} />
            Submit Request
          </>
        )}
      </button>
    </form>
  );
}
