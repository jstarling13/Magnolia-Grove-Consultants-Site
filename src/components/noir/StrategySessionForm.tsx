"use client";

import { useState, type FormEvent } from "react";
import { CheckCircle2, Loader2, Send } from "lucide-react";
import { bookingPage } from "@/config/pillarsConfig";

interface FormFields {
  orgName: string;
  contactName: string;
  role: string;
  email: string;
  phone: string;
  pillar: string;
  budget: string;
  timeline: string;
  message: string;
}

const initialFields: FormFields = {
  orgName: "",
  contactName: "",
  role: "",
  email: "",
  phone: "",
  pillar: "",
  budget: "",
  timeline: "",
  message: "",
};

type FormErrors = Partial<Record<keyof FormFields, string>>;
type SubmitStatus = "idle" | "submitting" | "success" | "error";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validate(fields: FormFields): FormErrors {
  const errors: FormErrors = {};

  if (!fields.orgName.trim()) errors.orgName = "Organization name is required.";
  if (!fields.contactName.trim()) errors.contactName = "Full name is required.";
  if (!fields.role.trim()) errors.role = "Title / role is required.";

  if (!fields.email.trim()) {
    errors.email = "Email is required.";
  } else if (!EMAIL_PATTERN.test(fields.email)) {
    errors.email = "Enter a valid email address.";
  }

  if (!fields.phone.trim()) errors.phone = "Phone number is required.";
  if (!fields.pillar) errors.pillar = "Please select an area of interest.";
  if (!fields.budget) errors.budget = "Please select an estimated budget range.";
  if (!fields.timeline) errors.timeline = "Please select a timeline.";
  if (!fields.message.trim()) errors.message = "Tell us about your race or initiative.";

  return errors;
}

const inputClasses =
  "w-full rounded-md border bg-onyx px-4 py-3 text-sm text-white placeholder:text-muted/60 focus:outline-none focus:ring-2 focus:ring-gold/60 transition-colors";

interface StrategySessionFormProps {
  initialPillar?: string;
}

export default function StrategySessionForm({ initialPillar }: StrategySessionFormProps) {
  const [fields, setFields] = useState<FormFields>(() => ({
    ...initialFields,
    pillar: initialPillar ?? "",
  }));
  const [errors, setErrors] = useState<FormErrors>({});
  const [status, setStatus] = useState<SubmitStatus>("idle");

  const handleChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
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

    try {
      // TODO: Wire this up to your intake handler / CRM endpoint.
      await new Promise((resolve) => setTimeout(resolve, 1200));
      setStatus("success");
      setFields(initialFields);
    } catch {
      setStatus("error");
    }
  };

  if (status === "success") {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-gold/25 bg-onyx/85 px-8 py-16 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full border border-gold/40 bg-gold/10 text-gold-bright">
          <CheckCircle2 size={32} />
        </div>
        <h3 className="mt-6 font-heading text-2xl font-semibold text-white">
          {bookingPage.successTitle}
        </h3>
        <p className="mt-3 max-w-md text-sm leading-relaxed text-muted">
          {bookingPage.successMessage}
        </p>
        <button
          type="button"
          onClick={() => setStatus("idle")}
          className="mt-8 inline-flex items-center rounded-md border border-gold/60 px-6 py-3 text-xs font-semibold uppercase tracking-wider text-gold-bright transition-colors hover:bg-gold/10"
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
      className="rounded-lg border border-gold/25 bg-onyx/85 p-6 sm:p-10"
    >
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label htmlFor="orgName" className="mb-2 block text-sm font-medium text-muted-light">
            {bookingPage.fields.orgName}
          </label>
          <input
            id="orgName"
            name="orgName"
            type="text"
            value={fields.orgName}
            onChange={handleChange}
            placeholder="[Organization / Campaign Name]"
            aria-invalid={Boolean(errors.orgName)}
            className={`${inputClasses} ${errors.orgName ? "border-red-500" : "border-gold/25"}`}
          />
          {errors.orgName && <p className="mt-1.5 text-xs text-red-400">{errors.orgName}</p>}
        </div>

        <div>
          <label htmlFor="contactName" className="mb-2 block text-sm font-medium text-muted-light">
            {bookingPage.fields.contactName}
          </label>
          <input
            id="contactName"
            name="contactName"
            type="text"
            autoComplete="name"
            value={fields.contactName}
            onChange={handleChange}
            placeholder="Jane Doe"
            aria-invalid={Boolean(errors.contactName)}
            className={`${inputClasses} ${errors.contactName ? "border-red-500" : "border-gold/25"}`}
          />
          {errors.contactName && (
            <p className="mt-1.5 text-xs text-red-400">{errors.contactName}</p>
          )}
        </div>

        <div>
          <label htmlFor="role" className="mb-2 block text-sm font-medium text-muted-light">
            {bookingPage.fields.role}
          </label>
          <input
            id="role"
            name="role"
            type="text"
            value={fields.role}
            onChange={handleChange}
            placeholder="[Candidate / PAC Director / Chief of Staff]"
            aria-invalid={Boolean(errors.role)}
            className={`${inputClasses} ${errors.role ? "border-red-500" : "border-gold/25"}`}
          />
          {errors.role && <p className="mt-1.5 text-xs text-red-400">{errors.role}</p>}
        </div>

        <div>
          <label htmlFor="email" className="mb-2 block text-sm font-medium text-muted-light">
            {bookingPage.fields.email}
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
            className={`${inputClasses} ${errors.email ? "border-red-500" : "border-gold/25"}`}
          />
          {errors.email && <p className="mt-1.5 text-xs text-red-400">{errors.email}</p>}
        </div>

        <div>
          <label htmlFor="phone" className="mb-2 block text-sm font-medium text-muted-light">
            {bookingPage.fields.phone}
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
            className={`${inputClasses} ${errors.phone ? "border-red-500" : "border-gold/25"}`}
          />
          {errors.phone && <p className="mt-1.5 text-xs text-red-400">{errors.phone}</p>}
        </div>

        <div>
          <label htmlFor="pillar" className="mb-2 block text-sm font-medium text-muted-light">
            {bookingPage.fields.pillar}
          </label>
          <select
            id="pillar"
            name="pillar"
            value={fields.pillar}
            onChange={handleChange}
            aria-invalid={Boolean(errors.pillar)}
            className={`${inputClasses} ${errors.pillar ? "border-red-500" : "border-gold/25"}`}
          >
            <option value="" disabled>
              Select an area of interest
            </option>
            {bookingPage.serviceOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          {errors.pillar && <p className="mt-1.5 text-xs text-red-400">{errors.pillar}</p>}
        </div>

        <div>
          <label htmlFor="budget" className="mb-2 block text-sm font-medium text-muted-light">
            {bookingPage.fields.budget}
          </label>
          <select
            id="budget"
            name="budget"
            value={fields.budget}
            onChange={handleChange}
            aria-invalid={Boolean(errors.budget)}
            className={`${inputClasses} ${errors.budget ? "border-red-500" : "border-gold/25"}`}
          >
            <option value="" disabled>
              Select a budget range
            </option>
            {bookingPage.budgetOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          {errors.budget && <p className="mt-1.5 text-xs text-red-400">{errors.budget}</p>}
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="timeline" className="mb-2 block text-sm font-medium text-muted-light">
            {bookingPage.fields.timeline}
          </label>
          <select
            id="timeline"
            name="timeline"
            value={fields.timeline}
            onChange={handleChange}
            aria-invalid={Boolean(errors.timeline)}
            className={`${inputClasses} ${errors.timeline ? "border-red-500" : "border-gold/25"}`}
          >
            <option value="" disabled>
              Select an engagement timeline
            </option>
            {bookingPage.timelineOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          {errors.timeline && <p className="mt-1.5 text-xs text-red-400">{errors.timeline}</p>}
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="message" className="mb-2 block text-sm font-medium text-muted-light">
            {bookingPage.fields.message}
          </label>
          <textarea
            id="message"
            name="message"
            rows={5}
            value={fields.message}
            onChange={handleChange}
            placeholder={bookingPage.messagePlaceholder}
            aria-invalid={Boolean(errors.message)}
            className={`${inputClasses} resize-none ${
              errors.message ? "border-red-500" : "border-gold/25"
            }`}
          />
          {errors.message && <p className="mt-1.5 text-xs text-red-400">{errors.message}</p>}
        </div>
      </div>

      {status === "error" && (
        <p className="mt-6 rounded-md border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {bookingPage.errorMessage}
        </p>
      )}

      <button
        type="submit"
        disabled={status === "submitting"}
        className="mt-8 inline-flex w-full items-center justify-center gap-2 rounded-md bg-gold px-6 py-4 text-xs font-semibold uppercase tracking-wider text-onyx transition-all hover:bg-gold-bright disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto"
      >
        {status === "submitting" ? (
          <>
            <Loader2 size={18} className="animate-spin" />
            {bookingPage.submittingLabel}
          </>
        ) : (
          <>
            <Send size={18} />
            {bookingPage.submitLabel}
          </>
        )}
      </button>

      <p className="mt-4 text-xs leading-relaxed text-muted">{bookingPage.privacyNote}</p>
    </form>
  );
}
