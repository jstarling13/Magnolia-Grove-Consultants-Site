"use client";

import { useState, useTransition, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import {
  markMerchShipped,
  recordEspOrder,
  sendMerchPaymentLink,
  updateMerchOrderStatus,
} from "@/app/admin/actions";
import {
  MERCH_ORDER_STATUSES,
  MERCH_ORDER_STATUS_LABELS,
  parseEspOrderNumber,
  parseShipment,
} from "@/lib/merchOrders";
import { formatOrderDate, safeHttpUrl, type RawData } from "@/lib/adminOrders";

/**
 * The detail page's working panels. They carry no business rules of their own:
 * every change goes through the same admin server actions the dashboard uses
 * (which re-check the admin session and enforce "no ESP order before payment"),
 * and input is validated with the shared parsers from merchOrders.
 */

const inputClass =
  "w-full rounded-md border border-gold/25 bg-cream px-3 py-2 text-sm text-onyx focus:outline-none focus:ring-2 focus:ring-gold/60";
const labelClass = "text-xs font-medium text-onyx/70";
const headingClass = "text-xs font-semibold uppercase tracking-wide text-gold-dark";

export function OrderPaymentPanel({ id, data }: { id: number; data: RawData }) {
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
      <section className="rounded-lg border border-gold/25 bg-cream-100 p-5">
        <h2 className={headingClass}>Payment</h2>
        <p className="mt-2 text-sm font-semibold text-onyx">
          Paid{quoted !== undefined ? ` $${quoted.toFixed(2)}` : ""} on {formatOrderDate(paidAt)}
          {data.paidManually === true ? " (marked paid manually)" : ""}
        </p>
        <p className="mt-1 text-xs text-onyx/60">Cleared. Safe to place the ESP order.</p>
      </section>
    );
  }

  function handleSend() {
    setError("");
    setMessage("");
    startTransition(async () => {
      const result = await sendMerchPaymentLink(id, Number(amount));
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setMessage(
        result.emailed
          ? "Payment link emailed to the customer."
          : "Link created, but the email didn't send. Copy the link below and send it yourself."
      );
      router.refresh();
    });
  }

  const href = safeHttpUrl(paymentUrl);

  return (
    <section className="rounded-lg border border-gold/25 bg-cream-100 p-5">
      <h2 className={headingClass}>Final Quote &amp; Payment</h2>
      <p className="mt-1 text-xs text-onyx/60">
        Enter the full amount including decoration, shipping, and tax. The customer pays this before
        you order from ESP.
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-3">
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
          {href ? (
            <a href={href} target="_blank" rel="noreferrer" className="text-gold-dark underline">
              {paymentUrl}
            </a>
          ) : (
            paymentUrl
          )}
          {quoted !== undefined && <> (${quoted.toFixed(2)})</>}. Resending creates a new link, so
          don&apos;t reuse the old one.
        </p>
      )}
      {message && <p className="mt-2 text-xs text-onyx/80">{message}</p>}
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </section>
  );
}

const CARRIER_SUGGESTIONS = ["UPS", "FedEx", "USPS", "DHL"];

export function OrderFulfillmentPanel({ id, data }: { id: number; data: RawData }) {
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
      <section className="rounded-lg border border-gold/25 bg-cream-100 p-5">
        <h2 className={headingClass}>Fulfillment</h2>
        <p className="mt-1 text-xs text-onyx/60">
          Available once payment is received. Then record the ESP order number and, when it ships,
          the tracking details.
        </p>
      </section>
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
      const result = await recordEspOrder(id, parsed.value);
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
      const result = await markMerchShipped(id, parsed.value);
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

  return (
    <section className="rounded-lg border border-gold/25 bg-cream-100 p-5">
      <h2 className={headingClass}>Fulfillment</h2>

      <div className="mt-3">
        <label htmlFor={`esp-order-${id}`} className={labelClass}>
          ESP order number (internal, never sent to the customer)
        </label>
        <div className="mt-1 flex flex-wrap items-center gap-3">
          <input
            id={`esp-order-${id}`}
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
        {espError && <p className="mt-2 text-xs text-red-600">{espError}</p>}
      </div>

      <div className="mt-4">
        <p className={labelClass}>
          Shipment{shippedAt ? ` (shipped ${formatOrderDate(shippedAt)})` : ""}
        </p>
        <div className="mt-1 grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor={`carrier-${id}`} className="sr-only">
              Carrier
            </label>
            <input
              id={`carrier-${id}`}
              list={`carriers-${id}`}
              value={carrier}
              onChange={(event) => setCarrier(event.target.value)}
              placeholder="Carrier (UPS, FedEx, USPS, DHL)"
              maxLength={40}
              className={inputClass}
            />
            <datalist id={`carriers-${id}`}>
              {CARRIER_SUGGESTIONS.map((name) => (
                <option key={name} value={name} />
              ))}
            </datalist>
          </div>
          <div>
            <label htmlFor={`tracking-${id}`} className="sr-only">
              Tracking number
            </label>
            <input
              id={`tracking-${id}`}
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
        {shipError && <p className="mt-2 text-xs text-red-600">{shipError}</p>}
      </div>
    </section>
  );
}

export function OrderStatusControl({ id, currentStatus }: { id: number; currentStatus: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");

  function handleChange(event: ChangeEvent<HTMLSelectElement>) {
    const status = event.target.value;
    startTransition(async () => {
      const result = await updateMerchOrderStatus(id, status);
      setError(result.ok ? "" : result.error);
      router.refresh();
    });
  }

  return (
    <section className="rounded-lg border border-gold/25 bg-cream-100 p-5">
      <label htmlFor={`status-${id}`} className={headingClass}>
        Order Status
      </label>
      <p className="mt-1 text-xs text-onyx/60">
        No order is placed with ESP automatically. Only order it after it shows as Paid, then update
        this.
      </p>
      <select
        id={`status-${id}`}
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
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </section>
  );
}
