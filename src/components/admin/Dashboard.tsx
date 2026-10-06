"use client";

import { useMemo, useState, useTransition, type ChangeEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut, ChevronDown, Plus, Trash2, CheckCircle2, Clock, Loader2 } from "lucide-react";
import {
  markSubmissionRead,
  addDeliverable,
  deleteDeliverable,
  updateMerchOrderStatus,
  sendMerchPaymentLink,
  recordEspOrder,
  markMerchShipped,
} from "@/app/admin/actions";
import {
  MERCH_ORDER_STATUSES,
  MERCH_ORDER_STATUS_LABELS,
  formatOrderReference,
  parseEspOrderNumber,
  parseShipment,
} from "@/lib/merchOrders";
import { buildBackendOrderSheet, describeLineColor } from "@/lib/merchBackendSheet";

export interface SubmissionRow {
  id: number;
  type: "lead" | "strategy_session" | "payment_request" | "merch_order";
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
  merch_order: "Merchandise Order",
};

const HIDDEN_FIELDS = new Set([
  "company_website",
  "turnstileToken",
  "formType",
  "status",
  "items",
  "total",
  "quotedTotal",
  "quotedAt",
  "paymentLinkId",
  "paymentUrl",
  "paidAt",
  "paidManually",
  "paidEmailSentAt",
  // Fulfillment fields are edited in the Fulfillment panel instead.
  "espOrderNumber",
  "espOrderedAt",
  "carrier",
  "trackingNumber",
  "shippedAt",
]);

interface CartLineItemDTO {
  productId: string;
  name: string;
  // Absent on orders stored before colors were recorded.
  color?: string;
  // Customer-entered; absent on orders stored before these existed.
  sizes?: string;
  imprintNotes?: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  // Internal ESP+ fields stamped server-side; absent on orders stored earlier.
  espUrl?: string;
  espKind?: "product" | "search";
  supplier?: string;
  productNo?: string;
}

function isCartLineItems(value: unknown): value is CartLineItemDTO[] {
  return (
    Array.isArray(value) &&
    value.every(
      (item) =>
        item &&
        typeof item === "object" &&
        typeof (item as CartLineItemDTO).name === "string" &&
        typeof (item as CartLineItemDTO).quantity === "number"
    )
  );
}

function summarize(row: SubmissionRow): string {
  const d = row.data;
  switch (row.type) {
    case "lead":
      return `${d.firstName ?? ""} ${d.lastName ?? ""} — ${d.service ?? "General Inquiry"}`;
    case "strategy_session":
      return `${d.orgName ?? "Unknown Org"} — ${d.contactName ?? ""}`;
    case "payment_request":
      return `${d.organizationName ?? "Unknown Org"} — $${Number(d.amount ?? 0).toFixed(2)}`;
    case "merch_order": {
      const statusLabel =
        MERCH_ORDER_STATUS_LABELS[d.status as keyof typeof MERCH_ORDER_STATUS_LABELS] ?? "New";
      return `${formatOrderReference(row.id)} · ${d.product ?? "Unknown Product"} — Qty ${d.quantity ?? "?"} (${statusLabel})`;
    }
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

function MerchOrderStatusControl({
  submissionId,
  currentStatus,
}: {
  submissionId: number;
  currentStatus: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");

  function handleChange(event: ChangeEvent<HTMLSelectElement>) {
    const status = event.target.value;
    startTransition(async () => {
      const result = await updateMerchOrderStatus(submissionId, status);
      setError(result.ok ? (result.warning ?? "") : result.error);
      router.refresh();
    });
  }

  return (
    <div className="mt-4 border-t border-gold/15 pt-4">
      <label className="text-xs font-semibold uppercase tracking-wide text-gold-dark">
        Order Status
      </label>
      <p className="mt-1 text-xs text-onyx/60">
        No order is placed with ESP automatically — only order it after it shows as Paid, then
        update this.
      </p>
      <select
        value={currentStatus || "new"}
        onChange={handleChange}
        disabled={isPending}
        className="mt-2 rounded-md border border-gold/25 bg-cream px-3 py-2 text-sm text-onyx focus:outline-none focus:ring-2 focus:ring-gold/60 disabled:opacity-60"
      >
        {MERCH_ORDER_STATUSES.map((status) => (
          <option key={status} value={status}>
            {MERCH_ORDER_STATUS_LABELS[status]}
          </option>
        ))}
      </select>
      {isPending && <span className="ml-2 text-xs text-onyx/60">Saving…</span>}
      {error && <p className="mt-2 text-xs text-red-500">{error}</p>}
    </div>
  );
}

/** Plain-text summary the business uses to place the supplier order in ESP+. Admin-only. */
function BackendOrderSheet({
  submissionId,
  data,
  items,
}: {
  submissionId: number;
  data: Record<string, unknown>;
  items: CartLineItemDTO[];
}) {
  const [copied, setCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);

  const sheet = buildBackendOrderSheet(
    {
      orderId: submissionId,
      customerName: [data.firstName, data.lastName].filter(Boolean).join(" ") || undefined,
      notes: typeof data.notes === "string" ? data.notes : undefined,
      quotedTotal: typeof data.quotedTotal === "number" ? data.quotedTotal : undefined,
    },
    items
  );

  async function handleCopy() {
    setCopied(false);
    setCopyFailed(false);
    try {
      await navigator.clipboard.writeText(sheet);
      setCopied(true);
    } catch {
      setCopyFailed(true);
    }
  }

  return (
    <div className="mt-4 rounded-md border border-gold/15 bg-cream/60 p-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-onyx/50">
          Backend order sheet
        </p>
        <button
          type="button"
          onClick={handleCopy}
          className="rounded-md border border-gold/25 px-3 py-1 text-xs text-onyx/80 transition-colors hover:border-gold/50 hover:text-onyx"
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <textarea
        readOnly
        aria-label="Backend order sheet"
        value={sheet}
        rows={Math.min(14, sheet.split("\n").length)}
        onFocus={(event) => event.currentTarget.select()}
        className="mt-2 w-full resize-y rounded-md border border-gold/25 bg-cream px-3 py-2 font-mono text-xs text-onyx focus:outline-none focus:ring-2 focus:ring-gold/60"
      />
      {copyFailed && (
        <p className="mt-1 text-xs text-red-600">
          Couldn&apos;t copy automatically. Select the text above and copy it manually.
        </p>
      )}
    </div>
  );
}

function MerchPaymentPanel({
  submissionId,
  data,
}: {
  submissionId: number;
  data: Record<string, unknown>;
}) {
  const router = useRouter();
  const status = String(data.status ?? "new");
  const estimate = typeof data.total === "number" ? data.total : undefined;
  const quoted = typeof data.quotedTotal === "number" ? data.quotedTotal : undefined;
  const paymentUrl = typeof data.paymentUrl === "string" ? data.paymentUrl : "";
  const paidAt = typeof data.paidAt === "string" ? data.paidAt : "";

  const [amount, setAmount] = useState(String(quoted ?? estimate ?? ""));
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  if (status === "cancelled") return null;

  if (paidAt) {
    return (
      <div className="mt-4 border-t border-gold/15 pt-4">
        <span className="text-xs font-semibold uppercase tracking-wide text-gold-dark">
          Payment
        </span>
        <p className="mt-1 text-sm font-semibold text-onyx">
          Paid{quoted !== undefined ? ` $${quoted.toFixed(2)}` : ""} on {formatDate(paidAt)}
          {data.paidManually === true ? " (marked paid manually)" : ""}
        </p>
        <p className="mt-1 text-xs text-onyx/60">Cleared — safe to place the ESP order.</p>
      </div>
    );
  }

  function handleSend() {
    setError("");
    setMessage("");
    startTransition(async () => {
      const result = await sendMerchPaymentLink(submissionId, Number(amount));
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setMessage(
        result.emailed
          ? "Payment link emailed to the customer."
          : "Link created, but the email didn't send — copy the link below and send it yourself."
      );
      router.refresh();
    });
  }

  return (
    <div className="mt-4 border-t border-gold/15 pt-4">
      <span className="text-xs font-semibold uppercase tracking-wide text-gold-dark">
        Final Quote &amp; Payment
      </span>
      <p className="mt-1 text-xs text-onyx/60">
        Enter the full amount including decoration, shipping, and tax. The customer pays this before
        you order from ESP.
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1 rounded-md border border-gold/25 bg-cream px-3 py-2 text-sm text-onyx">
          <span className="text-onyx/60">$</span>
          <input
            type="number"
            min="0"
            step="0.01"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            aria-label="Final quote amount in dollars"
            className="w-28 bg-transparent focus:outline-none"
          />
        </div>
        <button
          type="button"
          onClick={handleSend}
          disabled={isPending}
          className="rounded-md bg-gold px-4 py-2 text-sm font-semibold text-onyx transition-colors hover:bg-gold-bright disabled:opacity-60"
        >
          {isPending ? "Sending…" : paymentUrl ? "Resend New Payment Link" : "Send Payment Link"}
        </button>
      </div>
      {estimate !== undefined && (
        <p className="mt-1 text-xs text-onyx/50">Cart estimate was ${estimate.toFixed(2)}.</p>
      )}
      {paymentUrl && (
        <p className="mt-2 break-all text-xs text-onyx/70">
          Current link:{" "}
          <a
            href={paymentUrl}
            target="_blank"
            rel="noreferrer"
            className="text-gold-dark underline"
          >
            {paymentUrl}
          </a>
          {quoted !== undefined && <> (${quoted.toFixed(2)})</>}. Resending creates a new link —
          don&apos;t reuse the old one.
        </p>
      )}
      {message && <p className="mt-2 text-xs text-onyx/80">{message}</p>}
      {error && <p className="mt-2 text-xs text-red-500">{error}</p>}
    </div>
  );
}

const CARRIER_SUGGESTIONS = ["UPS", "FedEx", "USPS", "DHL"];

/**
 * Admin-only fulfillment steps for a paid order: record the ESP order number
 * (internal, never shown to customers) and mark it shipped, which emails the
 * customer carrier and tracking details.
 */
function MerchFulfillmentPanel({
  submissionId,
  data,
}: {
  submissionId: number;
  data: Record<string, unknown>;
}) {
  const router = useRouter();
  const status = String(data.status ?? "new");
  const paid = typeof data.paidAt === "string";
  const shippedAt = typeof data.shippedAt === "string" ? data.shippedAt : "";

  const [espOrderNumber, setEspOrderNumber] = useState(
    typeof data.espOrderNumber === "string" ? data.espOrderNumber : ""
  );
  const [carrier, setCarrier] = useState(typeof data.carrier === "string" ? data.carrier : "");
  const [trackingNumber, setTrackingNumber] = useState(
    typeof data.trackingNumber === "string" ? data.trackingNumber : ""
  );
  const [espMessage, setEspMessage] = useState("");
  const [espError, setEspError] = useState("");
  const [shipMessage, setShipMessage] = useState("");
  const [shipError, setShipError] = useState("");
  const [espPending, startEspTransition] = useTransition();
  const [shipPending, startShipTransition] = useTransition();

  if (status === "cancelled") return null;

  if (!paid) {
    return (
      <div className="mt-4 border-t border-gold/15 pt-4">
        <span className="text-xs font-semibold uppercase tracking-wide text-gold-dark">
          Fulfillment
        </span>
        <p className="mt-1 text-xs text-onyx/60">
          Available once payment is received. Then record the ESP order number and, when it ships,
          the tracking details.
        </p>
      </div>
    );
  }

  function handleSaveEsp() {
    setEspMessage("");
    const parsed = parseEspOrderNumber(espOrderNumber);
    if (!parsed.ok) {
      setEspError(parsed.error);
      return;
    }
    setEspError("");
    startEspTransition(async () => {
      const result = await recordEspOrder(submissionId, parsed.value);
      if (!result.ok) {
        setEspError(result.error);
        return;
      }
      setEspMessage("ESP order number saved.");
      router.refresh();
    });
  }

  function handleShip() {
    setShipMessage("");
    const parsed = parseShipment({ carrier, trackingNumber });
    if (!parsed.ok) {
      setShipError(parsed.error);
      return;
    }
    setShipError("");
    startShipTransition(async () => {
      const result = await markMerchShipped(submissionId, parsed.value);
      if (!result.ok) {
        setShipError(result.error);
        return;
      }
      setShipMessage(
        result.emailed
          ? "Marked shipped. The customer was emailed their tracking details."
          : "Marked shipped, but the email didn't send. Contact the customer with the tracking details yourself."
      );
      router.refresh();
    });
  }

  const inputClass =
    "w-full rounded-md border border-gold/25 bg-cream px-3 py-2 text-sm text-onyx focus:outline-none focus:ring-2 focus:ring-gold/60";
  const labelClass = "text-xs font-medium text-onyx/70";

  return (
    <div className="mt-4 border-t border-gold/15 pt-4">
      <span className="text-xs font-semibold uppercase tracking-wide text-gold-dark">
        Fulfillment
      </span>

      <div className="mt-3">
        <label htmlFor={`esp-order-${submissionId}`} className={labelClass}>
          ESP order number (internal, never sent to the customer)
        </label>
        <div className="mt-1 flex flex-wrap items-center gap-3">
          <input
            id={`esp-order-${submissionId}`}
            value={espOrderNumber}
            onChange={(event) => setEspOrderNumber(event.target.value)}
            maxLength={40}
            className={`${inputClass} max-w-xs`}
          />
          <button
            type="button"
            onClick={handleSaveEsp}
            disabled={espPending}
            className="rounded-md border border-gold/40 px-4 py-2 text-sm font-semibold text-onyx transition-colors hover:bg-gold/10 disabled:opacity-60"
          >
            {espPending
              ? "Saving…"
              : status === "paid"
                ? "Save & mark Ordered in ESP"
                : "Save ESP order number"}
          </button>
        </div>
        {espMessage && <p className="mt-2 text-xs text-onyx/80">{espMessage}</p>}
        {espError && <p className="mt-2 text-xs text-red-500">{espError}</p>}
      </div>

      <div className="mt-4">
        <p className={labelClass}>
          Shipment{shippedAt ? ` (shipped ${formatDate(shippedAt)})` : ""}
        </p>
        <div className="mt-1 grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor={`carrier-${submissionId}`} className="sr-only">
              Carrier
            </label>
            <input
              id={`carrier-${submissionId}`}
              list={`carriers-${submissionId}`}
              value={carrier}
              onChange={(event) => setCarrier(event.target.value)}
              placeholder="Carrier (UPS, FedEx, USPS, DHL)"
              maxLength={40}
              className={inputClass}
            />
            <datalist id={`carriers-${submissionId}`}>
              {CARRIER_SUGGESTIONS.map((name) => (
                <option key={name} value={name} />
              ))}
            </datalist>
          </div>
          <div>
            <label htmlFor={`tracking-${submissionId}`} className="sr-only">
              Tracking number
            </label>
            <input
              id={`tracking-${submissionId}`}
              value={trackingNumber}
              onChange={(event) => setTrackingNumber(event.target.value)}
              placeholder="Tracking number"
              maxLength={50}
              className={inputClass}
            />
          </div>
        </div>
        <button
          type="button"
          onClick={handleShip}
          disabled={shipPending}
          className="mt-3 rounded-md bg-gold px-4 py-2 text-sm font-semibold text-onyx transition-colors hover:bg-gold-bright disabled:opacity-60"
        >
          {shipPending
            ? "Sending…"
            : shippedAt
              ? "Update tracking & resend email"
              : "Mark shipped & email customer"}
        </button>
        {shipMessage && <p className="mt-2 text-xs text-onyx/80">{shipMessage}</p>}
        {shipError && <p className="mt-2 text-xs text-red-500">{shipError}</p>}
      </div>
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
          <Link
            href="/admin/orders"
            className="rounded-md border border-gold/25 px-4 py-2 text-sm text-onyx/80 transition-colors hover:border-gold/50 hover:text-onyx"
          >
            Merch Orders
          </Link>
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
        {(["all", "lead", "strategy_session", "payment_request", "merch_order"] as const).map(
          (type) => (
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
          )
        )}
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
                  {row.type === "merch_order" && (
                    <p className="mb-3 text-sm text-onyx">
                      <span className="text-xs uppercase tracking-wide text-onyx/60">
                        Order reference{" "}
                      </span>
                      <span className="font-semibold">{formatOrderReference(row.id)}</span>
                    </p>
                  )}
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

                  {row.type === "merch_order" && isCartLineItems(row.data.items) && (
                    <div className="mt-4 rounded-md border border-gold/15 bg-cream/60 p-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-onyx/50">
                        Cart Items
                      </p>
                      <ul className="mt-2 space-y-1.5">
                        {row.data.items.map((item) => (
                          <li
                            key={`${item.productId}::${item.color ?? ""}`}
                            className="text-sm text-onyx"
                          >
                            <div className="flex justify-between">
                              <span>
                                {item.name} × {item.quantity}
                              </span>
                              <span className="text-onyx/70">
                                ${item.unitPrice.toFixed(2)}/ea — ${item.lineTotal.toFixed(2)}
                              </span>
                            </div>
                            <p className="mt-0.5 text-xs text-onyx/60">
                              {describeLineColor(item.color)}
                            </p>
                            {item.sizes && (
                              <p className="mt-0.5 whitespace-pre-wrap text-xs text-onyx/60">
                                Sizes and quantities: {item.sizes}
                              </p>
                            )}
                            {item.imprintNotes && (
                              <p className="mt-0.5 whitespace-pre-wrap text-xs text-onyx/60">
                                Imprint notes: {item.imprintNotes}
                              </p>
                            )}
                            {(item.espUrl || item.supplier || item.productNo) && (
                              <p className="mt-0.5 text-xs text-onyx/60">
                                {item.espUrl && (
                                  <a
                                    href={item.espUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="font-medium text-gold-dark underline underline-offset-2 hover:text-onyx"
                                  >
                                    Open in ESP+
                                  </a>
                                )}
                                {item.espUrl && item.espKind === "search" && " (search link)"}
                                {item.supplier && (
                                  <span>
                                    {item.espUrl ? " · " : ""}Supplier: {item.supplier}
                                  </span>
                                )}
                                {item.productNo && (
                                  <span>
                                    {item.espUrl || item.supplier ? " · " : ""}Product no.{" "}
                                    {item.productNo}
                                  </span>
                                )}
                              </p>
                            )}
                          </li>
                        ))}
                      </ul>
                      {typeof row.data.total === "number" && (
                        <p className="mt-2 border-t border-gold/15 pt-2 text-right text-sm font-semibold text-onyx">
                          Total: ${row.data.total.toFixed(2)}
                        </p>
                      )}
                    </div>
                  )}

                  {row.type === "merch_order" && isCartLineItems(row.data.items) && (
                    <BackendOrderSheet
                      submissionId={row.id}
                      data={row.data}
                      items={row.data.items}
                    />
                  )}

                  {row.type === "merch_order" && (
                    <MerchPaymentPanel submissionId={row.id} data={row.data} />
                  )}

                  {row.type === "merch_order" && (
                    <MerchFulfillmentPanel submissionId={row.id} data={row.data} />
                  )}

                  {row.type === "merch_order" && (
                    <MerchOrderStatusControl
                      submissionId={row.id}
                      currentStatus={String(row.data.status ?? "new")}
                    />
                  )}

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
