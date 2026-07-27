"use client";

import { useState, type ChangeEvent, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { trackEvent } from "@/lib/gtag";

export type ContactFormType = "lead" | "strategy";
export type SubmitStatus = "idle" | "submitting" | "success" | "error";

export interface UseContactFormOptions<T extends object> {
  formType: ContactFormType;
  initialFields: T;
  validate: (fields: T) => Partial<Record<keyof T, string>>;
  defaultErrorMessage: string;
}

export interface UseContactFormReturn<T extends object> {
  fields: T;
  errors: Partial<Record<keyof T, string>>;
  status: SubmitStatus;
  submitError: string;
  turnstileToken: string;
  setTurnstileToken: (token: string) => void;
  handleChange: (
    event: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => void;
  handleSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  resetToIdle: () => void;
}

/**
 * Shared submission pipeline for every public form on the site (LeadForm,
 * StrategySessionForm). Centralizes validation gating, the fetch call to
 * /api/contact, and honeypot/Turnstile token plumbing so there is exactly
 * one place to fix bugs in the submit flow instead of N.
 */
export function useContactForm<T extends object>({
  formType,
  initialFields,
  validate,
  defaultErrorMessage,
}: UseContactFormOptions<T>): UseContactFormReturn<T> {
  const router = useRouter();
  const [fields, setFields] = useState<T>(initialFields);
  const [errors, setErrors] = useState<Partial<Record<keyof T, string>>>({});
  const [status, setStatus] = useState<SubmitStatus>("idle");
  const [submitError, setSubmitError] = useState<string>("");
  const [turnstileToken, setTurnstileToken] = useState<string>("");

  const handleChange = (
    event: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = event.target;
    setFields((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: undefined }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    // Honeypot: a filled hidden field means a bot filled every input on the
    // form. The server enforces this too — this is just cheap client relief.
    const validationErrors = validate(fields);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setStatus("submitting");
    setSubmitError("");

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ formType, ...fields, turnstileToken }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setSubmitError(data.error || defaultErrorMessage);
        setStatus("error");
        return;
      }

      setStatus("success");
      setFields(initialFields);
      trackEvent(formType === "lead" ? "form_submission_lead" : "form_submission_booking");
      router.push(`/thank-you?source=${formType}`);
    } catch {
      setSubmitError(defaultErrorMessage);
      setStatus("error");
    }
  };

  const resetToIdle = () => {
    setStatus("idle");
    setSubmitError("");
  };

  return {
    fields,
    errors,
    status,
    submitError,
    turnstileToken,
    setTurnstileToken,
    handleChange,
    handleSubmit,
    resetToIdle,
  };
}
