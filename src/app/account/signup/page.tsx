"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Loader2, UserPlus } from "lucide-react";

const inputClasses =
  "mt-2 w-full rounded-md border border-gold/25 bg-onyx px-4 py-3 text-sm text-white placeholder:text-muted/50 focus:outline-none focus:ring-2 focus:ring-gold/60";
const labelClasses = "mt-4 block text-sm font-medium text-muted-light";

function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [fields, setFields] = useState({
    firstName: "",
    lastName: "",
    email: searchParams.get("email") ?? "",
    phone: "",
    orgName: "",
    password: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function update(key: keyof typeof fields, value: string) {
    setFields((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/account/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fields),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        setError(data?.error ?? "Something went wrong. Please try again.");
        setSubmitting(false);
        return;
      }

      router.push("/account");
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-6 py-20">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-lg border border-gold/25 bg-onyx-100 p-8"
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-full border border-gold/40 bg-gold/10 text-gold-bright">
          <UserPlus size={20} />
        </div>
        <h1 className="mt-6 text-xl font-semibold text-white">Create an Account</h1>
        <p className="mt-2 text-sm text-muted">
          Track your requests and save your info for next time.
        </p>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="firstName" className={labelClasses}>
              First Name
            </label>
            <input
              id="firstName"
              value={fields.firstName}
              onChange={(e) => update("firstName", e.target.value)}
              className={inputClasses}
            />
          </div>
          <div>
            <label htmlFor="lastName" className={labelClasses}>
              Last Name
            </label>
            <input
              id="lastName"
              value={fields.lastName}
              onChange={(e) => update("lastName", e.target.value)}
              className={inputClasses}
            />
          </div>
        </div>

        <label htmlFor="email" className={labelClasses}>
          Email
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          value={fields.email}
          onChange={(e) => update("email", e.target.value)}
          className={inputClasses}
        />

        <label htmlFor="phone" className={labelClasses}>
          Phone (optional)
        </label>
        <input
          id="phone"
          type="tel"
          value={fields.phone}
          onChange={(e) => update("phone", e.target.value)}
          className={inputClasses}
        />

        <label htmlFor="orgName" className={labelClasses}>
          Organization (optional)
        </label>
        <input
          id="orgName"
          value={fields.orgName}
          onChange={(e) => update("orgName", e.target.value)}
          className={inputClasses}
        />

        <label htmlFor="password" className={labelClasses}>
          Password
        </label>
        <input
          id="password"
          type="password"
          autoComplete="new-password"
          value={fields.password}
          onChange={(e) => update("password", e.target.value)}
          placeholder="At least 8 characters"
          className={inputClasses}
        />

        {error && (
          <p className="mt-3 rounded-md border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm text-red-300">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={
            submitting || !fields.firstName || !fields.lastName || !fields.email || !fields.password
          }
          className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-md bg-gold px-6 py-3 text-sm font-semibold text-onyx transition-all hover:bg-gold-bright disabled:cursor-not-allowed disabled:opacity-70"
        >
          {submitting ? <Loader2 size={18} className="animate-spin" /> : "Create Account"}
        </button>

        <p className="mt-4 text-center text-xs text-muted">
          Already have an account?{" "}
          <Link href="/account/login" className="text-gold-bright hover:underline">
            Log in
          </Link>
        </p>
      </form>
    </div>
  );
}

export default function ClientSignupPage() {
  return (
    <Suspense>
      <SignupForm />
    </Suspense>
  );
}
