"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowLeft, ArrowRight, CheckCircle2, Loader2, Send } from "lucide-react";
import { bookingPage } from "@/config/pillarsConfig";
import { useContactForm } from "@/hooks/useContactForm";
import { useClientProfile } from "@/hooks/useClientProfile";
import Turnstile from "@/components/Turnstile";

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
  company_website: string;
}

type FieldKey = keyof FormFields;

const buildInitialFields = (initialPillar?: string): FormFields => ({
  orgName: "",
  contactName: "",
  role: "",
  email: "",
  phone: "",
  pillar: initialPillar ?? "",
  budget: "",
  timeline: "",
  message: "",
  company_website: "",
});

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validate(fields: FormFields): Partial<Record<FieldKey, string>> {
  const errors: Partial<Record<FieldKey, string>> = {};

  if (!fields.contactName.trim()) errors.contactName = "Full name is required.";
  if (!fields.role.trim()) errors.role = "Title / role is required.";
  if (!fields.email.trim()) {
    errors.email = "Email is required.";
  } else if (!EMAIL_PATTERN.test(fields.email)) {
    errors.email = "Enter a valid email address.";
  }
  if (!fields.phone.trim()) errors.phone = "Phone number is required.";

  if (!fields.orgName.trim()) errors.orgName = "Organization name is required.";
  if (!fields.message.trim()) errors.message = "Tell us about your race or initiative.";

  if (!fields.pillar) errors.pillar = "Please select an area of interest.";

  if (!fields.budget) errors.budget = "Please select an estimated budget range.";
  if (!fields.timeline) errors.timeline = "Please select a timeline.";

  return errors;
}

interface Step {
  id: string;
  label: string;
  fields: FieldKey[];
}

const STEPS: Step[] = [
  { id: "about-you", label: "About You", fields: ["contactName", "role", "email", "phone"] },
  { id: "your-race", label: "Your Race", fields: ["orgName", "message"] },
  { id: "what-you-need", label: "What You Need", fields: ["pillar"] },
  { id: "timeline-budget", label: "Timeline & Budget", fields: ["budget", "timeline"] },
];

const inputClasses =
  "w-full rounded-md border bg-cream px-4 py-3 text-sm text-onyx placeholder:text-onyx/60 focus:outline-none focus:ring-2 focus:ring-gold/60 transition-colors";

function fieldError(errors: Partial<Record<FieldKey, string>>, key: FieldKey): string | undefined {
  return errors[key];
}

interface StrategySessionFormProps {
  initialPillar?: string;
}

export default function StrategySessionForm({ initialPillar }: StrategySessionFormProps) {
  const {
    fields,
    setFields,
    status,
    submitError,
    setTurnstileToken,
    handleChange,
    handleSubmit,
    resetToIdle,
  } = useContactForm<FormFields>({
    formType: "strategy",
    initialFields: buildInitialFields(initialPillar),
    validate,
    defaultErrorMessage: bookingPage.errorMessage,
  });

  const [step, setStep] = useState(0);
  const [stepErrors, setStepErrors] = useState<Partial<Record<FieldKey, string>>>({});
  const formRef = useRef<HTMLFormElement>(null);

  const clientProfile = useClientProfile();
  useEffect(() => {
    if (!clientProfile) return;
    setFields((prev) => ({
      ...prev,
      orgName: prev.orgName || clientProfile.orgName,
      contactName:
        prev.contactName || `${clientProfile.firstName} ${clientProfile.lastName}`.trim(),
      email: prev.email || clientProfile.email,
      phone: prev.phone || clientProfile.phone,
    }));
  }, [clientProfile, setFields]);

  if (status === "success") {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-gold/25 bg-cream/85 px-8 py-16 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full border border-gold/40 bg-gold/10 text-gold-dark">
          <CheckCircle2 size={32} />
        </div>
        <h3 className="mt-6 font-heading text-2xl font-semibold text-onyx">
          {bookingPage.successTitle}
        </h3>
        <p className="mt-3 max-w-md text-sm leading-relaxed text-onyx/60">
          {bookingPage.successMessage}
        </p>
        <button
          type="button"
          onClick={resetToIdle}
          className="mt-8 inline-flex items-center rounded-md border border-gold/60 px-6 py-3 text-xs font-semibold uppercase tracking-wider text-gold-dark transition-colors hover:bg-gold/10"
        >
          Submit another request
        </button>
      </div>
    );
  }

  const currentStep = STEPS[step];
  const isLastStep = step === STEPS.length - 1;

  const goNext = () => {
    const validationErrors = validate(fields);
    const blocking = Object.fromEntries(
      currentStep.fields
        .filter((key) => validationErrors[key])
        .map((key) => [key, validationErrors[key]])
    ) as Partial<Record<FieldKey, string>>;

    if (Object.keys(blocking).length > 0) {
      setStepErrors(blocking);
      return;
    }
    setStepErrors({});
    setStep((current) => Math.min(current + 1, STEPS.length - 1));
  };

  const goBack = () => {
    setStepErrors({});
    setStep((current) => Math.max(current - 1, 0));
  };

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    const validationErrors = validate(fields);
    if (Object.keys(validationErrors).length > 0) {
      event.preventDefault();
      setStepErrors(validationErrors);
      const firstInvalidStep = STEPS.findIndex((candidate) =>
        candidate.fields.some((key) => validationErrors[key])
      );
      if (firstInvalidStep !== -1) setStep(firstInvalidStep);
      return;
    }
    handleSubmit(event);
  };

  return (
    <form
      ref={formRef}
      noValidate
      onSubmit={onSubmit}
      className="relative rounded-lg border border-gold/25 bg-cream/85 p-6 sm:p-10"
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

      <div className="mb-8">
        <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-onyx/60">
          <span>
            Step {step + 1} of {STEPS.length}
          </span>
          <span className="text-gold-dark">{currentStep.label}</span>
        </div>
        <div className="mt-3 flex gap-1.5">
          {STEPS.map((s, index) => (
            <div
              key={s.id}
              className={`h-1 flex-1 rounded-full transition-colors ${
                index <= step ? "bg-gold" : "bg-cream/10"
              }`}
            />
          ))}
        </div>
      </div>

      {currentStep.id === "about-you" && (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div>
            <label htmlFor="contactName" className="mb-2 block text-sm font-medium text-onyx/80">
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
              aria-invalid={Boolean(fieldError(stepErrors, "contactName"))}
              className={`${inputClasses} ${
                fieldError(stepErrors, "contactName") ? "border-red-500" : "border-gold/25"
              }`}
            />
            {fieldError(stepErrors, "contactName") && (
              <p className="mt-1.5 text-xs text-red-400">{stepErrors.contactName}</p>
            )}
          </div>

          <div>
            <label htmlFor="role" className="mb-2 block text-sm font-medium text-onyx/80">
              {bookingPage.fields.role}
            </label>
            <input
              id="role"
              name="role"
              type="text"
              value={fields.role}
              onChange={handleChange}
              placeholder="[Candidate / PAC Director / Chief of Staff]"
              aria-invalid={Boolean(fieldError(stepErrors, "role"))}
              className={`${inputClasses} ${
                fieldError(stepErrors, "role") ? "border-red-500" : "border-gold/25"
              }`}
            />
            {fieldError(stepErrors, "role") && (
              <p className="mt-1.5 text-xs text-red-400">{stepErrors.role}</p>
            )}
          </div>

          <div>
            <label htmlFor="email" className="mb-2 block text-sm font-medium text-onyx/80">
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
              aria-invalid={Boolean(fieldError(stepErrors, "email"))}
              className={`${inputClasses} ${
                fieldError(stepErrors, "email") ? "border-red-500" : "border-gold/25"
              }`}
            />
            {fieldError(stepErrors, "email") && (
              <p className="mt-1.5 text-xs text-red-400">{stepErrors.email}</p>
            )}
          </div>

          <div>
            <label htmlFor="phone" className="mb-2 block text-sm font-medium text-onyx/80">
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
              aria-invalid={Boolean(fieldError(stepErrors, "phone"))}
              className={`${inputClasses} ${
                fieldError(stepErrors, "phone") ? "border-red-500" : "border-gold/25"
              }`}
            />
            {fieldError(stepErrors, "phone") && (
              <p className="mt-1.5 text-xs text-red-400">{stepErrors.phone}</p>
            )}
          </div>
        </div>
      )}

      {currentStep.id === "your-race" && (
        <div className="grid grid-cols-1 gap-6">
          <div>
            <label htmlFor="orgName" className="mb-2 block text-sm font-medium text-onyx/80">
              {bookingPage.fields.orgName}
            </label>
            <input
              id="orgName"
              name="orgName"
              type="text"
              value={fields.orgName}
              onChange={handleChange}
              placeholder="[Organization / Campaign Name]"
              aria-invalid={Boolean(fieldError(stepErrors, "orgName"))}
              className={`${inputClasses} ${
                fieldError(stepErrors, "orgName") ? "border-red-500" : "border-gold/25"
              }`}
            />
            {fieldError(stepErrors, "orgName") && (
              <p className="mt-1.5 text-xs text-red-400">{stepErrors.orgName}</p>
            )}
          </div>

          <div>
            <label htmlFor="message" className="mb-2 block text-sm font-medium text-onyx/80">
              {bookingPage.fields.message}
            </label>
            <textarea
              id="message"
              name="message"
              rows={5}
              value={fields.message}
              onChange={handleChange}
              placeholder={bookingPage.messagePlaceholder}
              aria-invalid={Boolean(fieldError(stepErrors, "message"))}
              className={`${inputClasses} resize-none ${
                fieldError(stepErrors, "message") ? "border-red-500" : "border-gold/25"
              }`}
            />
            {fieldError(stepErrors, "message") && (
              <p className="mt-1.5 text-xs text-red-400">{stepErrors.message}</p>
            )}
          </div>
        </div>
      )}

      {currentStep.id === "what-you-need" && (
        <div>
          <span className="mb-3 block text-sm font-medium text-onyx/80">
            {bookingPage.fields.pillar}
          </span>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {bookingPage.serviceOptions.map((option) => {
              const selected = fields.pillar === option;
              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => {
                    setFields((prev) => ({ ...prev, pillar: option }));
                    setStepErrors((prev) => ({ ...prev, pillar: undefined }));
                  }}
                  aria-pressed={selected}
                  className={`rounded-md border px-5 py-4 text-left text-sm font-medium transition-colors ${
                    selected
                      ? "border-gold bg-gold/10 text-onyx"
                      : "border-gold/25 text-onyx/80 hover:border-gold/50"
                  }`}
                >
                  {option}
                </button>
              );
            })}
          </div>
          {fieldError(stepErrors, "pillar") && (
            <p className="mt-3 text-xs text-red-400">{stepErrors.pillar}</p>
          )}
        </div>
      )}

      {currentStep.id === "timeline-budget" && (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div>
            <label htmlFor="budget" className="mb-2 block text-sm font-medium text-onyx/80">
              {bookingPage.fields.budget}
            </label>
            <select
              id="budget"
              name="budget"
              value={fields.budget}
              onChange={handleChange}
              aria-invalid={Boolean(fieldError(stepErrors, "budget"))}
              className={`${inputClasses} ${
                fieldError(stepErrors, "budget") ? "border-red-500" : "border-gold/25"
              }`}
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
            {fieldError(stepErrors, "budget") && (
              <p className="mt-1.5 text-xs text-red-400">{stepErrors.budget}</p>
            )}
          </div>

          <div>
            <label htmlFor="timeline" className="mb-2 block text-sm font-medium text-onyx/80">
              {bookingPage.fields.timeline}
            </label>
            <select
              id="timeline"
              name="timeline"
              value={fields.timeline}
              onChange={handleChange}
              aria-invalid={Boolean(fieldError(stepErrors, "timeline"))}
              className={`${inputClasses} ${
                fieldError(stepErrors, "timeline") ? "border-red-500" : "border-gold/25"
              }`}
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
            {fieldError(stepErrors, "timeline") && (
              <p className="mt-1.5 text-xs text-red-400">{stepErrors.timeline}</p>
            )}
          </div>

          <div className="sm:col-span-2">
            <Turnstile onToken={setTurnstileToken} />
          </div>
        </div>
      )}

      {status === "error" && (
        <p className="mt-6 rounded-md border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {submitError || bookingPage.errorMessage}
        </p>
      )}

      <div className="mt-8 flex items-center justify-between gap-4">
        {step > 0 ? (
          <button
            type="button"
            onClick={goBack}
            className="inline-flex items-center gap-2 rounded-md border border-gold/40 px-6 py-4 text-xs font-semibold uppercase tracking-wider text-onyx/80 transition-all hover:bg-cream/5"
          >
            <ArrowLeft size={16} />
            Back
          </button>
        ) : (
          <span />
        )}

        {isLastStep ? (
          <button
            type="button"
            disabled={status === "submitting"}
            onClick={() => formRef.current?.requestSubmit()}
            className="inline-flex items-center justify-center gap-2 rounded-md bg-gold px-6 py-4 text-xs font-semibold uppercase tracking-wider text-onyx transition-all hover:bg-gold-bright disabled:cursor-not-allowed disabled:opacity-70"
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
        ) : (
          <button
            type="button"
            onClick={goNext}
            className="group inline-flex items-center gap-2 rounded-md bg-gold px-6 py-4 text-xs font-semibold uppercase tracking-wider text-onyx transition-all hover:bg-gold-bright"
          >
            Next
            <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
          </button>
        )}
      </div>

      <p className="mt-4 text-xs leading-relaxed text-onyx/60">{bookingPage.privacyNote}</p>
    </form>
  );
}
