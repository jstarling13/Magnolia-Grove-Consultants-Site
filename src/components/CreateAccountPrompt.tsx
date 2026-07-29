"use client";

import Link from "next/link";
import { UserPlus } from "lucide-react";
import { useClientProfile } from "@/hooks/useClientProfile";

export default function CreateAccountPrompt({ email }: { email?: string }) {
  const profile = useClientProfile();

  if (profile) return null;

  const signupHref = email
    ? `/account/signup?email=${encodeURIComponent(email)}`
    : "/account/signup";

  return (
    <div className="mt-6 flex max-w-md items-start gap-3 rounded-lg border border-gold/20 bg-onyx-200 px-5 py-4 text-left">
      <UserPlus size={18} className="mt-0.5 shrink-0 text-gold-bright" />
      <p className="text-xs leading-relaxed text-muted">
        Want to track this request and skip retyping your info next time?{" "}
        <Link href={signupHref} className="text-gold-bright hover:underline">
          Create a free account
        </Link>{" "}
        — totally optional.
      </p>
    </div>
  );
}
