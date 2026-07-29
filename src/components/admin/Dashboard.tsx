"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { LogOut, ChevronDown } from "lucide-react";
import { markSubmissionRead } from "@/app/admin/actions";

export interface SubmissionRow {
  id: number;
  type: "lead" | "strategy_session" | "payment_request";
  data: Record<string, unknown>;
  created_at: string;
  read_at: string | null;
}

const TYPE_LABELS: Record<SubmissionRow["type"], string> = {
  lead: "Strategy Call Request",
  strategy_session: "Strategy Session Booking",
  payment_request: "Payment Request",
};

const HIDDEN_FIELDS = new Set(["company_website", "turnstileToken", "formType"]);

function summarize(row: SubmissionRow): string {
  const d = row.data;
  switch (row.type) {
    case "lead":
      return `${d.firstName ?? ""} ${d.lastName ?? ""} — ${d.service ?? "General Inquiry"}`;
    case "strategy_session":
      return `${d.orgName ?? "Unknown Org"} — ${d.contactName ?? ""}`;
    case "payment_request":
      return `${d.organizationName ?? "Unknown Org"} — $${Number(d.amount ?? 0).toFixed(2)}`;
  }
}

function fieldLabel(key: string): string {
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (c) => c.toUpperCase())
    .trim();
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default function Dashboard({ submissions }: { submissions: SubmissionRow[] }) {
  const router = useRouter();
  const [filter, setFilter] = useState<"all" | SubmissionRow["type"]>("all");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [isPending, startTransition] = useTransition();

  const stats = useMemo(() => {
    const now = Date.now();
    const week = 7 * 24 * 60 * 60 * 1000;
    const month = 30 * 24 * 60 * 60 * 1000;
    return {
      total: submissions.length,
      unread: submissions.filter((s) => !s.read_at).length,
      thisWeek: submissions.filter((s) => now - new Date(s.created_at).getTime() < week).length,
      thisMonth: submissions.filter((s) => now - new Date(s.created_at).getTime() < month).length,
    };
  }, [submissions]);

  const filtered = filter === "all" ? submissions : submissions.filter((s) => s.type === filter);

  function toggleExpand(row: SubmissionRow) {
    const opening = expandedId !== row.id;
    setExpandedId(opening ? row.id : null);
    if (opening && !row.read_at) {
      startTransition(() => {
        markSubmissionRead(row.id);
      });
    }
  }

  async function handleLogout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-10 sm:px-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Admin Dashboard</h1>
          <p className="mt-1 text-sm text-muted">Magnolia Grove Consultants</p>
        </div>
        <button
          onClick={handleLogout}
          className="inline-flex items-center gap-2 rounded-md border border-gold/25 px-4 py-2 text-sm text-muted-light transition-colors hover:border-gold/50 hover:text-white"
        >
          <LogOut size={16} />
          Log Out
        </button>
      </div>

      <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: "Total", value: stats.total },
          { label: "Unread", value: stats.unread },
          { label: "This Week", value: stats.thisWeek },
          { label: "This Month", value: stats.thisMonth },
        ].map((stat) => (
          <div key={stat.label} className="rounded-lg border border-gold/25 bg-onyx-100 p-4">
            <div className="text-2xl font-semibold text-gold-bright">{stat.value}</div>
            <div className="mt-1 text-xs uppercase tracking-wide text-muted">{stat.label}</div>
          </div>
        ))}
      </div>

      <div className="mt-8 flex flex-wrap gap-2">
        {(["all", "lead", "strategy_session", "payment_request"] as const).map((type) => (
          <button
            key={type}
            onClick={() => setFilter(type)}
            className={`rounded-full border px-4 py-1.5 text-xs font-medium transition-colors ${
              filter === type
                ? "border-gold bg-gold text-onyx"
                : "border-gold/25 text-muted-light hover:border-gold/50"
            }`}
          >
            {type === "all" ? "All" : TYPE_LABELS[type]}
          </button>
        ))}
      </div>

      <div className="mt-6 space-y-3">
        {filtered.length === 0 && (
          <p className="rounded-lg border border-gold/15 bg-onyx-100 p-8 text-center text-sm text-muted">
            No submissions yet.
          </p>
        )}

        {filtered.map((row) => {
          const isExpanded = expandedId === row.id;
          const isUnread = !row.read_at;

          return (
            <div
              key={row.id}
              className={`rounded-lg border bg-onyx-100 transition-colors ${
                isUnread ? "border-gold/50" : "border-gold/15"
              }`}
            >
              <button
                onClick={() => toggleExpand(row)}
                className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    {isUnread && (
                      <span
                        className="h-2 w-2 shrink-0 rounded-full bg-gold-bright"
                        aria-label="Unread"
                      />
                    )}
                    <span className="text-xs font-semibold uppercase tracking-wide text-gold-bright">
                      {TYPE_LABELS[row.type]}
                    </span>
                  </div>
                  <p className="mt-1 truncate text-sm text-white">{summarize(row)}</p>
                </div>
                <div className="flex shrink-0 items-center gap-3 text-xs text-muted">
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
                      .filter(([key]) => !HIDDEN_FIELDS.has(key))
                      .map(([key, value]) => (
                        <div key={key}>
                          <dt className="text-xs uppercase tracking-wide text-muted">
                            {fieldLabel(key)}
                          </dt>
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
      {isPending && <p className="mt-4 text-xs text-muted">Updating…</p>}
    </div>
  );
}
