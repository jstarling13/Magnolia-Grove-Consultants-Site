"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { UserPlus } from "lucide-react";
import { useClientProfile } from "@/hooks/useClientProfile";
import { readThankYouEmail } from "@/lib/thankYouEmail";

/**
 * The email for the signup link comes from sessionStorage (written by the form
 * the customer just submitted), never from the page URL. Without it the signup
 * page simply asks for the email.
 */
export default function CreateAccountPrompt() {
  const profile = useClientProfile();
  const [email, setEmail] = useState("");
  useEffect(() => setEmail(readThankYouEmail()), []);

  if (profile) return null;

  const signupHref = email
    ? `/account/signup?email=${encodeURIComponent(email)}`
    : "/account/signup";

  return (
    <div className="mt-6 flex max-w-md items-start gap-3 rounded-lg border border-gold/20 bg-cream-200 px-5 py-4 text-left shadow-card">
      <UserPlus size={18} className="mt-0.5 shrink-0 text-gold-dark" />
      <p className="text-xs leading-relaxed text-onyx/60">
        Want to track this request and skip retyping your info next time?{" "}
        <Link href={signupHref} className="text-gold-dark hover:underline">
          Create a free account
        </Link>{" "}
        — totally optional.
      </p>
    </div>
  );
}
