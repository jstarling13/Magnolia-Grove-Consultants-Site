"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { LogOut, ChevronDown, Plus, Trash2, CheckCircle2, Clock, Loader2 } from "lucide-react";
import { markSubmissionRead, addDeliverable, deleteDeliverable } from "@/app/admin/actions";

export interface SubmissionRow {
  id: number;
  type: "lead" | "strategy_session" | "payment_request";
  data: Record<string, unknown>;
  created_at: string;
  read_at: string | null;
}

export interface DeliverableDTO {
  id: number;
  label: string;
  url: string;
  notifiedAt: string | null;
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

function DeliverablesPanel({
  submissionId,
  submissionType,
  deliverables,
  onChanged,
}: {
  submissionId: number;
  submissionType: SubmissionRow["type"];
  deliverables: DeliverableDTO[];
  onChanged: () => void;
}) {
  const [label, setLabel] = useState("");
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleAdd() {
    setError("");
    startTransition(async () => {
      const result = await addDeliverable(submissionId, submissionType, label, url);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setLabel("");
      setUrl("");
      onChanged();
    });
  }

  function handleDelete(id: number) {
    startTransition(async () => {
      await deleteDeliverable(id);
      onChanged();
    });
  }

  return (
    <div className="mt-4 border-t border-gold/15 pt-4">
      <span className="text-xs font-semibold uppercase tracking-wide text-gold-dark">
        Deliverables
      </span>

      {deliverables.length === 0 && (
        <p className="mt-2 text-xs text-onyx/60">
          Nothing attached yet — add a link below (a shared Drive link, hosted file, etc.). The
          client is emailed automatically once it&apos;s attached and the invoice is paid.
        </p>
      )}

      {deliverables.length > 0 && (
        <div className="mt-2 space-y-2">
          {deliverables.map((d) => (
            <div
              key={d.id}
              className="flex items-center justify-between gap-3 rounded-md border border-gold/15 bg-cream px-3 py-2"
            >
              <a
                href={d.url}
                target="_blank"
                rel="noopener noreferrer"
                className="truncate text-sm text-gold-dark hover:underline"
              >
                {d.label}
              </a>
              <div className="flex shrink-0 items-center gap-2">
                {d.notifiedAt ? (
                  <span
                    className="inline-flex items-center gap-1 text-xs text-green-400"
                    title={`Client notified ${formatDate(d.notifiedAt)}`}
                  >
                    <CheckCircle2 size={12} /> Notified
                  </span>
                ) : (
                  <span
                    className="inline-flex items-center gap-1 text-xs text-gold-dark"
                    title="Client will be emailed automatically once the invoice is marked paid"
                  >
                    <Clock size={12} /> Staged
                  </span>
                )}
                <button
                  onClick={() => handleDelete(d.id)}
                  disabled={isPending}
                  className="text-onyx/60 transition-colors hover:text-red-400"
                  aria-label="Remove deliverable"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <input
          type="text"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Label (e.g. Final Website Files)"
          className="flex-1 rounded-md border border-gold/25 bg-cream px-3 py-2 text-sm text-onyx placeholder:text-onyx/50 focus:outline-none focus:ring-2 focus:ring-gold/60"
        />
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://drive.google.com/…"
          className="flex-1 rounded-md border border-gold/25 bg-cream px-3 py-2 text-sm text-onyx placeholder:text-onyx/50 focus:outline-none focus:ring-2 focus:ring-gold/60"
        />
        <button
          onClick={handleAdd}
          disabled={isPending || !label.trim() || !url.trim()}
          className="inline-flex items-center justify-center gap-1.5 rounded-md bg-gold px-4 py-2 text-xs font-semibold text-onyx transition-colors hover:bg-gold-bright disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
          Add
        </button>
      </div>
      {error && <p className="mt-1.5 text-xs text-red-400">{error}</p>}
    </div>
  );
}

export default function Dashboard({
  submissions,
  username,
  deliverablesBySubmission,
}: {
  submissions: SubmissionRow[];
  username: string;
  deliverablesBySubmission: Record<number, DeliverableDTO[]>;
}) {
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
          <h1 className="text-2xl font-semibold text-onyx">Admin Dashboard</h1>
          <p className="mt-1 text-sm text-onyx/60">Magnolia Grove Consultants</p>
        </div>
        <div className="flex items-center gap-4">
          {username && <span className="text-sm text-onyx/80">Logged in as {username}</span>}
          <button
            onClick={handleLogout}
            className="inline-flex items-center gap-2 rounded-md border border-gold/25 px-4 py-2 text-sm text-onyx/80 transition-colors hover:border-gold/50 hover:text-onyx"
          >
            <LogOut size={16} />
            Log Out
          </button>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: "Total", value: stats.total },
          { label: "Unread", value: stats.unread },
          { label: "This Week", value: stats.thisWeek },
          { label: "This Month", value: stats.thisMonth },
        ].map((stat) => (
          <div key={stat.label} className="rounded-lg border border-gold/25 bg-cream-100 p-4">
            <div className="text-2xl font-semibold text-gold-dark">{stat.value}</div>
            <div className="mt-1 text-xs uppercase tracking-wide text-onyx/60">{stat.label}</div>
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
                : "border-gold/25 text-onyx/80 hover:border-gold/50"
            }`}
          >
            {type === "all" ? "All" : TYPE_LABELS[type]}
          </button>
        ))}
      </div>

      <div className="mt-6 space-y-3">
        {filtered.length === 0 && (
          <p className="rounded-lg border border-gold/15 bg-cream-100 p-8 text-center text-sm text-onyx/60">
            No submissions yet.
          </p>
        )}

        {filtered.map((row) => {
          const isExpanded = expandedId === row.id;
          const isUnread = !row.read_at;

          return (
            <div
              key={row.id}
              className={`rounded-lg border bg-cream-100 transition-colors ${
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
                    <span className="text-xs font-semibold uppercase tracking-wide text-gold-dark">
                      {TYPE_LABELS[row.type]}
                    </span>
                  </div>
                  <p className="mt-1 truncate text-sm text-onyx">{summarize(row)}</p>
                </div>
                <div className="flex shrink-0 items-center gap-3 text-xs text-onyx/60">
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
                          <dt className="text-xs uppercase tracking-wide text-onyx/60">
                            {fieldLabel(key)}
                          </dt>
                          <dd className="mt-0.5 whitespace-pre-wrap text-sm text-onyx">
                            {String(value)}
                          </dd>
                        </div>
                      ))}
                  </dl>

                  <DeliverablesPanel
                    submissionId={row.id}
                    submissionType={row.type}
                    deliverables={deliverablesBySubmission[row.id] ?? []}
                    onChanged={() => router.refresh()}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
      {isPending && <p className="mt-4 text-xs text-onyx/60">Updating…</p>}
    </div>
  );
}
