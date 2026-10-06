import Link from "next/link";
import {
  buildAuditTrail,
  buildOrderSheetText,
  buildOrderTimeline,
  buildQuoteSuggestion,
  computeAttentionFlags,
  contactOf,
  formatOrderDate,
  normalizeStatus,
  readQuoteBreakdown,
  type OrderItem,
  type OrderRecord,
} from "@/lib/adminOrders";
import { MERCH_ORDER_STATUS_LABELS, formatOrderReference } from "@/lib/merchOrders";
import { buildEspReorderText } from "@/lib/merchBackendSheet";
import type { OrderFileSummary } from "@/lib/orderFiles";
import { AttentionFlags, OrderStatusBadge } from "./OrderBadges";
import EspReorderBlock from "./EspReorderBlock";
import OrderAuditTrail from "./OrderAuditTrail";
import OrderItemsTable from "./OrderItemsTable";
import OrderLogoFiles from "./OrderLogoFiles";
import OrderPrintSheet from "./OrderPrintSheet";
import OrderSheetActions from "./OrderSheetActions";
import OrderTimeline from "./OrderTimeline";
import { OrderFulfillmentPanel, OrderPaymentPanel, OrderStatusControl } from "./OrderPanels";

function money(value: unknown): string | undefined {
  return typeof value === "number" && Number.isFinite(value) ? `$${value.toFixed(2)}` : undefined;
}

export interface OrderDetailProps {
  order: OrderRecord;
  items: OrderItem[];
  /** Logo files the customer attached (metadata only; bytes come from the admin download route). */
  files?: OrderFileSummary[];
  /** Back to the list with the filter the admin came from, when known. */
  backHref?: string;
  now?: number;
}

export default function OrderDetail({
  order,
  items,
  files = [],
  backHref = "/admin/orders",
  now = Date.now(),
}: OrderDetailProps) {
  const { data } = order;
  const reference = formatOrderReference(order.id);
  const status = normalizeStatus(data.status);
  const contact = contactOf(data);
  const flags = computeAttentionFlags({ createdAt: order.createdAt, data }, now);
  const timeline = buildOrderTimeline(order.createdAt, data);
  const sheetText = buildOrderSheetText({
    id: order.id,
    createdAt: order.createdAt,
    data,
    items,
  });
  const reorderText = buildEspReorderText(reference, items);
  const audit = buildAuditTrail(order.createdAt, data);
  const quoteSuggestion = buildQuoteSuggestion(items);
  const breakdown = readQuoteBreakdown(data);
  const notes = typeof data.notes === "string" ? data.notes.trim() : "";
  const estimate = money(data.total);
  const quoted = money(data.quotedTotal);
  const fallbackText = [data.product, data.quantity ? `Estimated quantity ${data.quantity}` : ""]
    .filter((part) => typeof part === "string" && part)
    .join(" - ");
  const phoneHref = contact.phone ? `tel:${contact.phone.replace(/[^\d+]/g, "")}` : "";

  return (
    <>
      <div className="mx-auto max-w-5xl px-6 py-10 sm:px-8 print:hidden" data-screen-view>
        <Link href={backHref} className="text-xs font-medium text-gold-text underline">
          All orders
        </Link>

        <header className="mt-2 flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-semibold text-onyx">{reference}</h1>
              <OrderStatusBadge status={status} label={MERCH_ORDER_STATUS_LABELS[status]} />
            </div>
            <p className="mt-1 text-sm text-onyx/60">
              Placed {formatOrderDate(order.createdAt) || "(date unknown)"}
            </p>
            <div className="mt-3">
              <AttentionFlags flags={flags} />
            </div>
          </div>
          <OrderSheetActions sheetText={sheetText} />
        </header>

        <section
          aria-label="Customer"
          className="mt-6 rounded-lg border border-gold/25 bg-cream-100 p-5"
        >
          <h2 className="text-xs font-semibold uppercase tracking-wide text-gold-text">Customer</h2>
          <dl className="mt-3 grid gap-4 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-xs uppercase tracking-wide text-onyx/60">Name</dt>
              <dd className="mt-0.5 text-onyx">{contact.name || "Not given"}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-onyx/60">Email</dt>
              <dd className="mt-0.5 break-all">
                {contact.email ? (
                  <a
                    href={`mailto:${contact.email}`}
                    className="text-gold-text underline underline-offset-2"
                  >
                    {contact.email}
                  </a>
                ) : (
                  "Not given"
                )}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-onyx/60">Phone</dt>
              <dd className="mt-0.5">
                {contact.phone ? (
                  <a href={phoneHref} className="text-gold-text underline underline-offset-2">
                    {contact.phone}
                  </a>
                ) : (
                  "Not given"
                )}
              </dd>
            </div>
          </dl>
        </section>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_16rem]">
          <section
            aria-label="Items"
            className="min-w-0 rounded-lg border border-gold/25 bg-cream-100 p-5"
          >
            <h2 className="text-xs font-semibold uppercase tracking-wide text-gold-text">Items</h2>
            <div className="mt-3">
              <OrderItemsTable items={items} fallbackText={fallbackText} />
            </div>
            {(estimate || quoted) && (
              <div className="mt-4 space-y-1 border-t border-gold/15 pt-3 text-right text-sm">
                {estimate && <p className="text-onyx/70">Cart estimate: {estimate}</p>}
                {quoted && breakdown?.extra && (
                  <p className="text-onyx/70">
                    Items ${breakdown.itemsSubtotal.toFixed(2)} + {breakdown.extra.label} $
                    {breakdown.extra.amount.toFixed(2)}
                  </p>
                )}
                {quoted && <p className="font-semibold text-onyx">Quoted total: {quoted}</p>}
              </div>
            )}
          </section>

          <section
            aria-label="Timeline"
            className="rounded-lg border border-gold/25 bg-cream-100 p-5"
          >
            <h2 className="text-xs font-semibold uppercase tracking-wide text-gold-text">
              Timeline
            </h2>
            <div className="mt-3">
              <OrderTimeline steps={timeline} />
            </div>
          </section>
        </div>

        {items.length > 0 && <EspReorderBlock text={reorderText} />}

        <section
          aria-label="Customer notes"
          className="mt-6 rounded-lg border border-gold/25 bg-cream-100 p-5"
        >
          <h2 className="text-xs font-semibold uppercase tracking-wide text-gold-text">
            Customer notes
          </h2>
          <p className="mt-2 whitespace-pre-wrap text-sm text-onyx">
            {notes || <span className="text-onyx/50">None</span>}
          </p>
        </section>

        <OrderLogoFiles orderId={order.id} files={files} />

        <div className="mt-6 space-y-6">
          <OrderPaymentPanel id={order.id} data={data} quote={quoteSuggestion} />
          <OrderFulfillmentPanel id={order.id} data={data} />
          <OrderStatusControl id={order.id} currentStatus={status} />
        </div>

        <OrderAuditTrail rows={audit.rows} hasHistory={audit.hasHistory} />
      </div>

      <OrderPrintSheet
        reference={reference}
        createdAt={order.createdAt}
        data={data}
        items={items}
      />
    </>
  );
}
