"use client";

import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { Loader2, ShieldCheck, ArrowRight } from "lucide-react";
import { useClientProfile } from "@/hooks/useClientProfile";

interface FormFields {
  organizationName: string;
  firstName: string;
  lastName: string;
  email: string;
  memo: string;
  amount: string;
  company_website: string;
}

const initialFields: FormFields = {
  organizationName: "",
  firstName: "",
  lastName: "",
  email: "",
  memo: "",
  amount: "",
  company_website: "",
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validate(fields: FormFields): Partial<Record<keyof FormFields, string>> {
  const errors: Partial<Record<keyof FormFields, string>> = {};

  if (!fields.organizationName.trim()) errors.organizationName = "Organization name is required.";
  if (!fields.firstName.trim()) errors.firstName = "First name is required.";
  if (!fields.lastName.trim()) errors.lastName = "Last name is required.";

  if (!fields.email.trim()) {
    errors.email = "Email is required.";
  } else if (!EMAIL_PATTERN.test(fields.email)) {
    errors.email = "Enter a valid email address.";
  }

  if (!fields.memo.trim()) errors.memo = "Please add a note or invoice reference.";

  const amountValue = Number(fields.amount);
  if (!fields.amount.trim() || Number.isNaN(amountValue) || amountValue <= 0) {
    errors.amount = "Enter an amount greater than $0.";
  }

  return errors;
}

const inputClasses =
  "w-full rounded-md border bg-onyx px-4 py-3 text-sm text-white placeholder:text-muted/50 focus:outline-none focus:ring-2 focus:ring-gold/60 transition-colors";

const DEFAULT_ERROR_MESSAGE =
  "Something went wrong creating your payment link. Please try again or contact us directly.";

export default function PaymentForm() {
  const [fields, setFields] = useState<FormFields>(initialFields);
  const [errors, setErrors] = useState<Partial<Record<keyof FormFields, string>>>({});
  const [status, setStatus] = useState<"idle" | "submitting" | "error">("idle");
  const [submitError, setSubmitError] = useState("");

  const clientProfile = useClientProfile();
  useEffect(() => {
    if (!clientProfile) return;
    setFields((prev) => ({
      ...prev,
      organizationName: prev.organizationName || clientProfile.orgName,
      firstName: prev.firstName || clientProfile.firstName,
      lastName: prev.lastName || clientProfile.lastName,
      email: prev.email || clientProfile.email,
    }));
  }, [clientProfile]);

  const handleChange = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = event.target;
    setFields((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: undefined }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const validationErrors = validate(fields);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setStatus("submitting");
    setSubmitError("");

    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationName: fields.organizationName,
          firstName: fields.firstName,
          lastName: fields.lastName,
          email: fields.email,
          memo: fields.memo,
          amount: fields.amount,
          company_website: fields.company_website,
        }),
      });
      const data = await response.json();

      if (!response.ok || !data.success || !data.url) {
        setSubmitError(data.error || DEFAULT_ERROR_MESSAGE);
        setStatus("error");
        return;
      }

      window.location.href = data.url;
    } catch {
      setSubmitError(DEFAULT_ERROR_MESSAGE);
      setStatus("error");
    }
  };

  return (
    <form
      noValidate
      onSubmit={handleSubmit}
      className="relative rounded-lg border border-gold/25 bg-onyx/85 p-6 sm:p-10"
    >
      {/* Honeypot — hidden from real users, catches naive bots */}
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
        <div className="sm:col-span-2">
          <label
            htmlFor="organizationName"
            className="mb-2 block text-sm font-medium text-muted-light"
          >
            Organization / Company Name
          </label>
          <input
            id="organizationName"
            name="organizationName"
            type="text"
            autoComplete="organization"
            value={fields.organizationName}
            onChange={handleChange}
            placeholder="Acme Campaign Committee"
            aria-invalid={Boolean(errors.organizationName)}
            aria-describedby={errors.organizationName ? "organizationName-error" : undefined}
            className={`${inputClasses} ${
              errors.organizationName ? "border-red-500" : "border-gold/25"
            }`}
          />
          {errors.organizationName && (
            <p id="organizationName-error" className="mt-1.5 text-xs text-red-500">
              {errors.organizationName}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="firstName" className="mb-2 block text-sm font-medium text-muted-light">
            First Name
          </label>
          <input
            id="firstName"
            name="firstName"
            type="text"
            autoComplete="given-name"
            value={fields.firstName}
            onChange={handleChange}
            placeholder="Jane"
            aria-invalid={Boolean(errors.firstName)}
            aria-describedby={errors.firstName ? "firstName-error" : undefined}
            className={`${inputClasses} ${errors.firstName ? "border-red-500" : "border-gold/25"}`}
          />
          {errors.firstName && (
            <p id="firstName-error" className="mt-1.5 text-xs text-red-500">
              {errors.firstName}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="lastName" className="mb-2 block text-sm font-medium text-muted-light">
            Last Name
          </label>
          <input
            id="lastName"
            name="lastName"
            type="text"
            autoComplete="family-name"
            value={fields.lastName}
            onChange={handleChange}
            placeholder="Doe"
            aria-invalid={Boolean(errors.lastName)}
            aria-describedby={errors.lastName ? "lastName-error" : undefined}
            className={`${inputClasses} ${errors.lastName ? "border-red-500" : "border-gold/25"}`}
          />
          {errors.lastName && (
            <p id="lastName-error" className="mt-1.5 text-xs text-red-500">
              {errors.lastName}
            </p>
          )}
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="email" className="mb-2 block text-sm font-medium text-muted-light">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            value={fields.email}
            onChange={handleChange}
            placeholder="jane@example.com"
            aria-invalid={Boolean(errors.email)}
            aria-describedby={errors.email ? "email-error" : undefined}
            className={`${inputClasses} ${errors.email ? "border-red-500" : "border-gold/25"}`}
          />
          {errors.email && (
            <p id="email-error" className="mt-1.5 text-xs text-red-500">
              {errors.email}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="amount" className="mb-2 block text-sm font-medium text-muted-light">
            Amount (USD)
          </label>
          <input
            id="amount"
            name="amount"
            type="number"
            min="1"
            step="0.01"
            inputMode="decimal"
            value={fields.amount}
            onChange={handleChange}
            placeholder="500.00"
            aria-invalid={Boolean(errors.amount)}
            aria-describedby={errors.amount ? "amount-error" : undefined}
            className={`${inputClasses} ${errors.amount ? "border-red-500" : "border-gold/25"}`}
          />
          {errors.amount && (
            <p id="amount-error" className="mt-1.5 text-xs text-red-500">
              {errors.amount}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="memo" className="mb-2 block text-sm font-medium text-muted-light">
            Memo / Invoice Reference
          </label>
          <input
            id="memo"
            name="memo"
            type="text"
            value={fields.memo}
            onChange={handleChange}
            placeholder="Invoice #1042"
            aria-invalid={Boolean(errors.memo)}
            aria-describedby={errors.memo ? "memo-error" : undefined}
            className={`${inputClasses} ${errors.memo ? "border-red-500" : "border-gold/25"}`}
          />
          {errors.memo && (
            <p id="memo-error" className="mt-1.5 text-xs text-red-500">
              {errors.memo}
            </p>
          )}
        </div>
      </div>

      {status === "error" && (
        <p className="mt-6 rounded-md border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {submitError || DEFAULT_ERROR_MESSAGE}
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
            Redirecting to Secure Checkout...
          </>
        ) : (
          <>
            Proceed to Checkout
            <ArrowRight size={18} />
          </>
        )}
      </button>

      <p className="mt-4 flex items-center gap-2 text-xs leading-relaxed text-muted">
        <ShieldCheck size={14} className="shrink-0 text-gold-bright" />
        Payments are processed securely by Square. We never see or store your card details.
      </p>
    </form>
  );
}
