"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { LogOut, ChevronDown, ArrowRight, CheckCircle2, Clock } from "lucide-react";
import type { ClientProfile } from "@/lib/clientUsers";
import type { PaymentStatus } from "@/lib/square";

export interface ClientSubmissionRow {
  id: number;
  type: "lead" | "strategy_session" | "payment_request";
  data: Record<string, unknown>;
  created_at: string;
  paymentStatus: PaymentStatus | null;
}

interface UpsellPillar {
  slug: string;
  navLabel: string;
  heroTitle: string;
}

const TYPE_LABELS: Record<ClientSubmissionRow["type"], string> = {
  lead: "Strategy Call Request",
  strategy_session: "Strategy Session Booking",
  payment_request: "Payment Request",
};

function summarize(row: ClientSubmissionRow): string {
  const d = row.data;
  switch (row.type) {
    case "lead":
      return String(d.service ?? "General Inquiry");
    case "strategy_session":
      return String(d.pillar ?? "Strategy Session");
    case "payment_request":
      return `$${Number(d.amount ?? 0).toFixed(2)} — ${d.memo ?? ""}`;
  }
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { dateStyle: "medium" });
}

function StatusBadge({ status }: { status: PaymentStatus | null }) {
  if (status === "paid") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-green-500/40 bg-green-500/10 px-3 py-1 text-xs font-medium text-green-400">
        <CheckCircle2 size={12} /> Paid
      </span>
    );
  }
  if (status === "pending") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-gold/40 bg-gold/10 px-3 py-1 text-xs font-medium text-gold-bright">
        <Clock size={12} /> Pending
      </span>
    );
  }
  return null;
}

export default function AccountPortal({
  profile,
  submissions,
  unusedPillars,
}: {
  profile: ClientProfile | null;
  submissions: ClientSubmissionRow[];
  unusedPillars: UpsellPillar[];
}) {
  const router = useRouter();
  const [expandedId, setExpandedId] = useState<number | null>(null);

  async function handleLogout() {
    await fetch("/api/account/logout", { method: "POST" });
    router.push("/account/login");
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-16 sm:px-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white sm:text-3xl">
            Welcome back{profile?.firstName ? `, ${profile.firstName}` : ""}
          </h1>
          <p className="mt-1 text-sm text-muted">{profile?.email}</p>
        </div>
        <button
          onClick={handleLogout}
          className="inline-flex items-center gap-2 rounded-md border border-gold/25 px-4 py-2 text-sm text-muted-light transition-colors hover:border-gold/50 hover:text-white"
        >
          <LogOut size={16} />
          Log Out
        </button>
      </div>

      <section className="mt-10">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gold-bright">
          Your Activity
        </h2>

        <div className="mt-4 space-y-3">
          {submissions.length === 0 && (
            <p className="rounded-lg border border-gold/15 bg-onyx-100 p-8 text-center text-sm text-muted">
              No requests yet — submit a form and it&apos;ll show up here.
            </p>
          )}

          {submissions.map((row) => {
            const isExpanded = expandedId === row.id;
            return (
              <div key={row.id} className="rounded-lg border border-gold/15 bg-onyx-100">
                <button
                  onClick={() => setExpandedId(isExpanded ? null : row.id)}
                  className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
                >
                  <div className="min-w-0 flex-1">
                    <span className="text-xs font-semibold uppercase tracking-wide text-gold-bright">
                      {TYPE_LABELS[row.type]}
                    </span>
                    <p className="mt-1 truncate text-sm text-white">{summarize(row)}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3 text-xs text-muted">
                    <StatusBadge status={row.paymentStatus} />
                    {formatDate(row.created_at)}
                    <ChevronDown
                      size={16}
                      className={`transition-transform ${isExpanded ? "rotate-180" : ""}`}
                    />
                  </div>
                </button>

                {isExpanded && (
                  <div className="border-t border-gold/15 px-5 py-4">
                    <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      {Object.entries(row.data)
                        .filter(
                          ([key]) =>
                            ![
                              "company_website",
                              "turnstileToken",
                              "formType",
                              "checkoutUrl",
                              "paymentLinkId",
                            ].includes(key)
                        )
                        .map(([key, value]) => (
                          <div key={key}>
                            <dt className="text-xs uppercase tracking-wide text-muted">{key}</dt>
                            <dd className="mt-0.5 whitespace-pre-wrap text-sm text-white">
                              {String(value)}
                            </dd>
                          </div>
                        ))}
                    </dl>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {unusedPillars.length > 0 && (
        <section className="mt-12">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gold-bright">
            More Ways We Can Help
          </h2>
          <p className="mt-2 text-sm text-muted">
            You haven&apos;t worked with us yet on these — a lot of clients pair multiple services
            together for a bigger impact.
          </p>

          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {unusedPillars.map((pillar) => (
              <Link
                key={pillar.slug}
                href={`/booking?pillar=${pillar.slug}`}
                className="group flex items-center justify-between rounded-lg border border-gold/25 bg-onyx-100 px-5 py-4 transition-colors hover:border-gold/50"
              >
                <span className="text-sm font-medium text-white">{pillar.navLabel}</span>
                <ArrowRight
                  size={16}
                  className="text-gold-bright transition-transform group-hover:translate-x-1"
                />
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
