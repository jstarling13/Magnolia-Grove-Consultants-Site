import Link from "next/link";
import {
  formatOrderDate,
  orderFilterToQuery,
  type OrderFilter,
  type OrderListItem,
  type PageInfo,
} from "@/lib/adminOrders";
import {
  MERCH_ORDER_STATUSES,
  MERCH_ORDER_STATUS_LABELS,
  type MerchOrderStatus,
} from "@/lib/merchOrders";
import { AttentionFlags, OrderStatusBadge } from "./OrderBadges";

export interface OrdersListProps {
  items: OrderListItem[];
  counts: Record<MerchOrderStatus, number>;
  allCount: number;
  filter: OrderFilter;
  page: PageInfo;
  username?: string;
}

export function ordersHref(filter: Partial<OrderFilter>): string {
  const query = orderFilterToQuery(filter);
  return query ? `/admin/orders?${query}` : "/admin/orders";
}

function exportHref(filter: OrderFilter): string {
  const query = orderFilterToQuery({ status: filter.status, q: filter.q });
  return query ? `/admin/orders/export?${query}` : "/admin/orders/export";
}

export default function OrdersList({
  items,
  counts,
  allCount,
  filter,
  page,
  username,
}: OrdersListProps) {
  const tabs: { key: string; status?: MerchOrderStatus; label: string; count: number }[] = [
    { key: "all", label: "All", count: allCount },
    ...MERCH_ORDER_STATUSES.map((status) => ({
      key: status,
      status,
      label: MERCH_ORDER_STATUS_LABELS[status],
      count: counts[status],
    })),
  ];
  const attentionCount = items.filter((item) => item.flags.length > 0).length;

  return (
    <div className="mx-auto max-w-6xl px-6 py-10 sm:px-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link href="/admin" className="text-xs font-medium text-gold-dark underline">
            Dashboard
          </Link>
          <h1 className="mt-1 text-2xl font-semibold text-onyx">Merch orders</h1>
          <p className="mt-1 text-sm text-onyx/60">
            Quotes, payments, supplier orders and shipments in one place.
            {username ? ` Signed in as ${username}.` : ""}
          </p>
        </div>
        <a
          href={exportHref(filter)}
          download
          className="rounded-md border border-gold/40 px-4 py-2 text-sm font-semibold text-onyx transition-colors hover:bg-gold/10"
        >
          Export CSV
          {filter.status || filter.q ? " (current filter)" : ""}
        </a>
      </div>

      <form
        action="/admin/orders"
        method="get"
        role="search"
        className="mt-6 flex flex-wrap items-center gap-3"
      >
        {filter.status && <input type="hidden" name="status" value={filter.status} />}
        <label htmlFor="orders-search" className="sr-only">
          Search orders
        </label>
        <input
          id="orders-search"
          name="q"
          type="search"
          defaultValue={filter.q}
          maxLength={100}
          placeholder="Reference (MG-00042), name, email, or product"
          className="w-full max-w-md rounded-md border border-gold/25 bg-cream px-3 py-2 text-sm text-onyx focus:outline-none focus:ring-2 focus:ring-gold/60"
        />
        <button
          type="submit"
          className="rounded-md bg-gold px-4 py-2 text-sm font-semibold text-onyx transition-colors hover:bg-gold-bright"
        >
          Search
        </button>
        {filter.q && (
          <Link
            href={ordersHref({ status: filter.status })}
            className="text-sm text-onyx/70 underline"
          >
            Clear search
          </Link>
        )}
      </form>

      <nav aria-label="Order status" className="mt-5 flex flex-wrap gap-2">
        {tabs.map((tab) => {
          const active = (filter.status ?? undefined) === tab.status;
          return (
            <Link
              key={tab.key}
              href={ordersHref({ status: tab.status, q: filter.q })}
              aria-current={active ? "page" : undefined}
              className={`rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors ${
                active
                  ? "border-gold bg-gold text-onyx"
                  : "border-gold/25 text-onyx/80 hover:border-gold/50"
              }`}
            >
              {tab.label} <span className="tabular-nums text-onyx/60">({tab.count})</span>
            </Link>
          );
        })}
      </nav>

      {attentionCount > 0 && (
        <p className="mt-4 text-sm text-red-800">
          {attentionCount} {attentionCount === 1 ? "order" : "orders"} on this page{" "}
          {attentionCount === 1 ? "needs" : "need"} attention.
        </p>
      )}

      <div className="mt-4 overflow-x-auto rounded-lg border border-gold/25 bg-cream-100">
        <table className="w-full min-w-[820px] text-left text-sm">
          <thead className="border-b border-gold/25 text-xs uppercase tracking-wide text-onyx/60">
            <tr>
              <th scope="col" className="px-4 py-3 font-medium">
                Reference
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                Customer
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                Items
              </th>
              <th scope="col" className="px-4 py-3 text-right font-medium">
                Total
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                Status
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                Age
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                Needs attention
              </th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-onyx/60">
                  {filter.q || filter.status
                    ? "No orders match this filter."
                    : "No merch orders yet."}
                </td>
              </tr>
            )}
            {items.map((item) => (
              <tr
                key={item.id}
                data-order-row={item.reference}
                className="border-b border-gold/15 align-top last:border-b-0"
              >
                <td className="whitespace-nowrap px-4 py-3">
                  <Link
                    href={`/admin/orders/${item.id}`}
                    className="font-semibold text-onyx underline decoration-gold underline-offset-2 hover:text-gold-dark"
                  >
                    {item.reference}
                  </Link>
                  {item.unread && (
                    <span className="ml-2 text-xs font-medium text-gold-dark">Unread</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="text-onyx">{item.customer || "Unknown"}</div>
                  {item.email && <div className="text-xs text-onyx/60">{item.email}</div>}
                </td>
                <td className="px-4 py-3">
                  <div className="max-w-[16rem] truncate text-onyx">{item.itemsLabel}</div>
                  {item.itemsDetail && (
                    <div className="text-xs text-onyx/60">{item.itemsDetail}</div>
                  )}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums">
                  {item.totalLabel ? (
                    <>
                      <div className="text-onyx">{item.totalLabel}</div>
                      <div className="text-xs text-onyx/60">
                        {item.totalIsEstimate ? "Cart estimate" : "Quoted"}
                      </div>
                    </>
                  ) : (
                    <span className="text-onyx/40">-</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <OrderStatusBadge status={item.status} label={item.statusLabel} />
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-onyx/70">
                  <time dateTime={item.createdAt} title={formatOrderDate(item.createdAt)}>
                    {item.age || "-"}
                  </time>
                </td>
                <td className="px-4 py-3">
                  <AttentionFlags flags={item.flags} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-onyx/70">
        <p>
          {page.total === 0
            ? "0 orders"
            : `Showing ${page.from}-${page.to} of ${page.total} ${page.total === 1 ? "order" : "orders"}`}
        </p>
        {page.pageCount > 1 && (
          <nav aria-label="Pagination" className="flex items-center gap-3">
            {page.hasPrev ? (
              <Link
                href={ordersHref({ ...filter, page: page.page - 1 })}
                rel="prev"
                className="rounded-md border border-gold/25 px-3 py-1.5 text-onyx hover:border-gold/50"
              >
                Previous
              </Link>
            ) : (
              <span className="rounded-md border border-gold/10 px-3 py-1.5 text-onyx/30">
                Previous
              </span>
            )}
            <span className="tabular-nums">
              Page {page.page} of {page.pageCount}
            </span>
            {page.hasNext ? (
              <Link
                href={ordersHref({ ...filter, page: page.page + 1 })}
                rel="next"
                className="rounded-md border border-gold/25 px-3 py-1.5 text-onyx hover:border-gold/50"
              >
                Next
              </Link>
            ) : (
              <span className="rounded-md border border-gold/10 px-3 py-1.5 text-onyx/30">
                Next
              </span>
            )}
          </nav>
        )}
      </div>
    </div>
  );
}
