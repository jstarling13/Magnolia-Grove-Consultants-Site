import type { Metadata } from "next";
import Link from "next/link";
import { User, ShieldCheck, ArrowRight } from "lucide-react";
import Header from "@/components/global/Header";
import Footer from "@/components/global/Footer";

export const metadata: Metadata = {
  title: "Log In | Magnolia Grove Consultants",
  robots: { index: false, follow: false },
};

export default function LoginChooserPage() {
  return (
    <>
      <Header />
      <main className="flex min-h-[70vh] flex-col items-center justify-center bg-cream px-6 py-20">
        <h1 className="text-2xl font-semibold text-onyx sm:text-3xl">Log In</h1>
        <p className="mt-2 text-sm text-onyx/60">Choose the account that applies to you.</p>

        <div className="mt-10 grid w-full max-w-2xl grid-cols-1 gap-4 sm:grid-cols-2">
          <Link
            href="/account/login"
            className="group flex flex-col items-start gap-3 rounded-lg border border-gold/25 bg-cream-100 p-6 shadow-card transition-colors hover:border-gold/50 hover:shadow-card-hover"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-full border border-gold/40 bg-gold/10 text-gold-dark">
              <User size={20} />
            </div>
            <div>
              <h2 className="text-base font-semibold text-onyx">Client Login</h2>
              <p className="mt-1 text-xs leading-relaxed text-onyx/60">
                For clients tracking requests, payments, and saved info.
              </p>
            </div>
            <span className="mt-auto inline-flex items-center gap-1 text-xs font-medium text-gold-dark">
              Continue
              <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
            </span>
          </Link>

          <Link
            href="/admin/login"
            className="group flex flex-col items-start gap-3 rounded-lg border border-gold/25 bg-cream-100 p-6 transition-colors hover:border-gold/50"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-full border border-gold/40 bg-gold/10 text-gold-dark">
              <ShieldCheck size={20} />
            </div>
            <div>
              <h2 className="text-base font-semibold text-onyx">Admin Login</h2>
              <p className="mt-1 text-xs leading-relaxed text-onyx/60">
                For Magnolia Grove team members only.
              </p>
            </div>
            <span className="mt-auto inline-flex items-center gap-1 text-xs font-medium text-gold-dark">
              Continue
              <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
            </span>
          </Link>
        </div>
      </main>
      <Footer />
    </>
  );
}
