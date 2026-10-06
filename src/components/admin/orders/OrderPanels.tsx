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
import {
  describeQuoteLine,
  formatOrderDate,
  readQuoteBreakdown,
  roundMoney,
  safeHttpUrl,
  suggestedQuoteTotal,
  type QuoteSuggestion,
  type RawData,
} from "@/lib/adminOrders";
import { parseQuoteExtra } from "@/lib/merchOrders";

/**
 * The detail page's working panels. They carry no business rules of their own:
 * every change goes through the same admin server actions the dashboard uses
 * (which re-check the admin session and enforce "no ESP order before payment"),
 * and input is validated with the shared parsers from merchOrders.
 */

const inputClass =
  "w-full rounded-md border border-onyx/50 bg-cream px-3 py-2 text-sm text-onyx focus:outline-none focus-visible:ring-2 focus-visible:ring-onyx focus-visible:ring-offset-2";
const labelClass = "text-xs font-medium text-onyx/70";
const headingClass = "text-xs font-semibold uppercase tracking-wide text-gold-text";

const EMPTY_QUOTE: QuoteSuggestion = { lines: [], itemsSubtotal: 0, unpricedLines: 0 };

function formatMoney(value: number): string {
  return `$${value.toFixed(2)}`;
}

export function OrderPaymentPanel({
  id,
  data,
  quote = EMPTY_QUOTE,
}: {
  id: number;
  data: RawData;
  /** Line math from the stored tier prices; the amount field starts from its subtotal. */
  quote?: QuoteSuggestion;
}) {
  const router = useRouter();
  const status = String(data.status ?? "new");
  const estimate = typeof data.total === "number" ? data.total : undefined;
  const quoted = typeof data.quotedTotal === "number" ? data.quotedTotal : undefined;
  const paymentUrl = typeof data.paymentUrl === "string" ? data.paymentUrl : "";
  const paidAt = typeof data.paidAt === "string" ? data.paidAt : "";
  const savedExtra = readQuoteBreakdown(data)?.extra ?? null;
  const hasLines = quote.lines.length > 0;

  const [extraLabel, setExtraLabel] = useState(savedExtra?.label ?? "");
  const [extraAmount, setExtraAmount] = useState(savedExtra ? savedExtra.amount.toFixed(2) : "");
  // A previous quote wins; otherwise start from the items (or the cart estimate for lines with no prices).
  const [amount, setAmount] = useState(() => {
    if (quoted !== undefined) return String(quoted);
    if (hasLines) return suggestedQuoteTotal(quote.itemsSubtotal, savedExtra).toFixed(2);
    return estimate !== undefined ? String(estimate) : "";
  });
  const [followsSuggestion, setFollowsSuggestion] = useState(quoted === undefined && hasLines);
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

  const parsedExtra = parseQuoteExtra({ label: extraLabel, amount: extraAmount });
  const extra = parsedExtra.ok ? parsedExtra.extra : null;
  const suggested = suggestedQuoteTotal(quote.itemsSubtotal, extra);
  const difference = roundMoney(Number(amount) - suggested);

  function handleExtraChange(label: string, extraValue: string) {
    setExtraLabel(label);
    setExtraAmount(extraValue);
    if (!followsSuggestion) return;
    const next = parseQuoteExtra({ label: label || "Extra", amount: extraValue });
    setAmount(suggestedQuoteTotal(quote.itemsSubtotal, next.ok ? next.extra : null).toFixed(2));
  }

  function handleResetToSuggested() {
    setAmount(suggested.toFixed(2));
    setFollowsSuggestion(true);
  }

  function handleSend() {
    setError("");
    setMessage("");
    if (!parsedExtra.ok) {
      setError(parsedExtra.error);
      return;
    }
    startTransition(async () => {
      const result = parsedExtra.extra
        ? await sendMerchPaymentLink(id, Number(amount), parsedExtra.extra)
        : await sendMerchPaymentLink(id, Number(amount));
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
  const focusRing =
    "focus:outline-none focus-visible:ring-2 focus-visible:ring-onyx focus-visible:ring-offset-2";
  const fieldClass = `rounded-md border border-onyx/50 bg-cream px-3 py-2 text-sm text-onyx ${focusRing}`;

  return (
    <section className="rounded-lg border border-gold/25 bg-cream-100 p-5">
      <h2 className={headingClass}>Final Quote &amp; Payment</h2>
      <p className="mt-1 text-xs text-onyx/70">
        Enter the full amount including decoration, shipping, and tax. The customer pays this before
        you order from ESP. Nothing is sent until you press the button.
      </p>

      {hasLines && (
        <div className="mt-3 rounded-md border border-onyx/20 bg-cream p-3 text-sm">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-onyx/80">
            Suggested from the items
          </h3>
          <ul aria-label="Quote line math" className="mt-2 space-y-1 text-onyx">
            {quote.lines.map((line, index) => (
              <li key={`${line.label}-${index}`} className="flex flex-wrap justify-between gap-x-4">
                <span>{line.label}</span>
                <span className="tabular-nums text-onyx/80">{describeQuoteLine(line)}</span>
              </li>
            ))}
            {extra && (
              <li className="flex flex-wrap justify-between gap-x-4">
                <span>{extra.label}</span>
                <span className="tabular-nums text-onyx/80">{formatMoney(extra.amount)}</span>
              </li>
            )}
          </ul>
          <p className="mt-2 flex justify-between gap-4 border-t border-onyx/15 pt-2 font-semibold text-onyx">
            <span>Suggested total</span>
            <span className="tabular-nums">{formatMoney(suggested)}</span>
          </p>
          {quote.unpricedLines > 0 && (
            <p className="mt-1 text-xs text-red-800">
              {quote.unpricedLines} {quote.unpricedLines === 1 ? "line has" : "lines have"} no saved
              price and {quote.unpricedLines === 1 ? "isn't" : "aren't"} counted. Add{" "}
              {quote.unpricedLines === 1 ? "it" : "them"} to the amount yourself.
            </p>
          )}
        </div>
      )}

      <fieldset className="mt-3">
        <legend className={labelClass}>Shipping or setup charge (optional)</legend>
        <div className="mt-1 flex flex-wrap items-center gap-3">
          <div>
            <label htmlFor={`quote-extra-label-${id}`} className="sr-only">
              Charge label, for example Shipping or Setup fee
            </label>
            <input
              id={`quote-extra-label-${id}`}
              value={extraLabel}
              onChange={(event) => handleExtraChange(event.target.value, extraAmount)}
              placeholder="Label (Shipping, Setup fee)"
              maxLength={60}
              className={`${fieldClass} w-56`}
            />
          </div>
          <div className="flex items-center gap-1 rounded-md border border-onyx/50 bg-cream px-3 py-2 text-sm text-onyx focus-within:ring-2 focus-within:ring-onyx focus-within:ring-offset-2">
            <span className="text-onyx/70" aria-hidden="true">
              $
            </span>
            <label htmlFor={`quote-extra-amount-${id}`} className="sr-only">
              Charge amount in dollars
            </label>
            <input
              id={`quote-extra-amount-${id}`}
              type="number"
              min="0"
              step="0.01"
              value={extraAmount}
              onChange={(event) => handleExtraChange(extraLabel, event.target.value)}
              className="w-24 bg-transparent focus:outline-none"
            />
          </div>
        </div>
      </fieldset>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1 rounded-md border border-onyx/50 bg-cream px-3 py-2 text-sm text-onyx focus-within:ring-2 focus-within:ring-onyx focus-within:ring-offset-2">
          <span className="text-onyx/70" aria-hidden="true">
            $
          </span>
          <input
            type="number"
            min="0"
            step="0.01"
            value={amount}
            onChange={(event) => {
              setAmount(event.target.value);
              setFollowsSuggestion(false);
            }}
            aria-label="Final quote amount in dollars"
            className="w-28 bg-transparent focus:outline-none"
          />
        </div>
        {hasLines && (
          <button
            type="button"
            onClick={handleResetToSuggested}
            className={`rounded-md border border-onyx/50 px-3 py-2 text-sm font-medium text-onyx hover:bg-cream-200 ${focusRing}`}
          >
            Reset to suggested
          </button>
        )}
        <button
          type="button"
          onClick={handleSend}
          disabled={isPending}
          className={`rounded-md border border-onyx bg-onyx px-4 py-2 text-sm font-semibold text-cream transition-colors hover:bg-onyx-100 disabled:opacity-60 ${focusRing}`}
        >
          {isPending ? "Sending…" : paymentUrl ? "Resend New Payment Link" : "Send Payment Link"}
        </button>
      </div>
      {hasLines && Number.isFinite(difference) && Math.abs(difference) >= 0.005 && (
        <p className="mt-1 text-xs text-onyx/80">
          This is {formatMoney(Math.abs(difference))} {difference > 0 ? "above" : "below"} the
          suggested total.
        </p>
      )}
      {estimate !== undefined && (
        <p className="mt-1 text-xs text-onyx/70">Cart estimate was ${estimate.toFixed(2)}.</p>
      )}
      {paymentUrl && (
        <p className="mt-2 break-all text-xs text-onyx/70">
          Current link:{" "}
          {href ? (
            <a href={href} target="_blank" rel="noreferrer" className="text-gold-text underline">
              {paymentUrl}
            </a>
          ) : (
            paymentUrl
          )}
          {quoted !== undefined && <> (${quoted.toFixed(2)})</>}. Resending creates a new link, so
          don&apos;t reuse the old one.
        </p>
      )}
      {message && (
        <p role="status" className="mt-2 text-xs text-onyx/80">
          {message}
        </p>
      )}
      {error && (
        <p role="alert" className="mt-2 text-xs text-red-800">
          {error}
        </p>
      )}
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
        {espError && <p className="mt-2 text-xs text-red-800">{espError}</p>}
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
        {shipError && <p className="mt-2 text-xs text-red-800">{shipError}</p>}
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
      setError(result.ok ? (result.warning ?? "") : result.error);
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
        className="mt-2 rounded-md border border-onyx/50 bg-cream px-3 py-2 text-sm text-onyx focus:outline-none focus-visible:ring-2 focus-visible:ring-onyx focus-visible:ring-offset-2 disabled:opacity-60"
      >
        {MERCH_ORDER_STATUSES.map((status) => (
          <option key={status} value={status}>
            {MERCH_ORDER_STATUS_LABELS[status]}
          </option>
        ))}
      </select>
      {isPending && <span className="ml-2 text-xs text-onyx/60">Saving…</span>}
      {error && <p className="mt-2 text-xs text-red-800">{error}</p>}
    </section>
  );
}
