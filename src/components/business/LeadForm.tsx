"use client";

import { CheckCircle2, Loader2, Send } from "lucide-react";
import { businessLeadForm } from "@/config/businessConfig";
import { useContactForm } from "@/hooks/useContactForm";
import Turnstile from "@/components/Turnstile";

interface FormFields {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  service: string;
  message: string;
  company_website: string;
}

const initialFields: FormFields = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  service: "",
  message: "",
  company_website: "",
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
  if (!fields.service) errors.service = "Please select a service.";
  if (!fields.message.trim()) errors.message = "Tell us a bit about your project.";

  return errors;
}

const inputClasses =
  "w-full rounded-md border bg-cream px-4 py-3 text-sm text-onyx placeholder:text-onyx/60/50 focus:outline-none focus:ring-2 focus:ring-gold/60 transition-colors";

export default function BusinessLeadForm() {
  const {
    fields,
    errors,
    status,
    submitError,
    setTurnstileToken,
    handleChange,
    handleSubmit,
    resetToIdle,
  } = useContactForm<FormFields>({
    formType: "lead",
    initialFields,
    validate,
    defaultErrorMessage: businessLeadForm.errorMessage,
  });

  if (status === "success") {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-gold/25 bg-cream/85 px-8 py-16 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full border border-gold/40 bg-gold/10 text-gold-bright">
          <CheckCircle2 size={32} />
        </div>
        <h3 className="mt-6 text-2xl text-onyx">{businessLeadForm.successTitle}</h3>
        <p className="mt-3 max-w-md text-sm leading-relaxed text-onyx/60">
          {businessLeadForm.successMessage}
        </p>
        <button
          type="button"
          onClick={resetToIdle}
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
            placeholder="(555) 123-4567"
            aria-invalid={Boolean(errors.phone)}
            aria-describedby={errors.phone ? "phone-error" : undefined}
            className={`${inputClasses} ${errors.phone ? "border-red-500" : "border-gold/25"}`}
          />
          {errors.phone && (
            <p id="phone-error" className="mt-1.5 text-xs text-red-500">
              {errors.phone}
            </p>
          )}
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="service" className="mb-2 block text-sm font-medium text-onyx/80">
            Service Interested In
          </label>
          <select
            id="service"
            name="service"
            value={fields.service}
            onChange={handleChange}
            aria-invalid={Boolean(errors.service)}
            aria-describedby={errors.service ? "service-error" : undefined}
            className={`${inputClasses} ${errors.service ? "border-red-500" : "border-gold/25"}`}
          >
            <option value="" disabled>
              Select a service
            </option>
            {businessLeadForm.serviceOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          {errors.service && (
            <p id="service-error" className="mt-1.5 text-xs text-red-500">
              {errors.service}
            </p>
          )}
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="message" className="mb-2 block text-sm font-medium text-onyx/80">
            Message
          </label>
          <textarea
            id="message"
            name="message"
            rows={5}
            value={fields.message}
            onChange={handleChange}
            placeholder={businessLeadForm.messagePlaceholder}
            aria-invalid={Boolean(errors.message)}
            aria-describedby={errors.message ? "message-error" : undefined}
            className={`${inputClasses} resize-none ${
              errors.message ? "border-red-500" : "border-gold/25"
            }`}
          />
          {errors.message && (
            <p id="message-error" className="mt-1.5 text-xs text-red-500">
              {errors.message}
            </p>
          )}
        </div>
      </div>

      <div className="mt-6">
        <Turnstile onToken={setTurnstileToken} />
      </div>

      {status === "error" && (
        <p className="mt-6 rounded-md border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {submitError || businessLeadForm.errorMessage}
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
            {businessLeadForm.submittingLabel}
          </>
        ) : (
          <>
            <Send size={18} />
            {businessLeadForm.submitLabel}
          </>
        )}
      </button>

      <p className="mt-4 text-xs leading-relaxed text-onyx/60">{businessLeadForm.privacyNote}</p>
    </form>
  );
}
