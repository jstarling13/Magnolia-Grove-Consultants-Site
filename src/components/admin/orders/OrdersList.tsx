import Link from "next/link";
import {
  ORDER_SORTS,
  ORDER_SORT_LABELS,
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
  /** Orders that need the owner right now (for the current search). Omit to hide the panel. */
  actionCounts?: { action: number; paidNotOrdered: number };
}

/** Shared look for the list's links and buttons: visible keyboard focus and a 3:1+ border. */
const CONTROL_BASE =
  "inline-block rounded-md border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-onyx focus-visible:ring-offset-2";

export function ordersHref(filter: Partial<OrderFilter>): string {
  const query = orderFilterToQuery(filter);
  return query ? `/admin/orders?${query}` : "/admin/orders";
}

function exportHref(filter: OrderFilter): string {
  const query = orderFilterToQuery({
    status: filter.status,
    view: filter.view,
    q: filter.q,
    sort: filter.sort,
  });
  return query ? `/admin/orders/export?${query}` : "/admin/orders/export";
}

export default function OrdersList({
  items,
  counts,
  allCount,
  filter,
  page,
  username,
  actionCounts,
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
  const sort = filter.sort ?? "newest";
  const actionLinks = actionCounts
    ? [
        {
          key: "action",
          label: "Everything needing action",
          count: actionCounts.action,
          href: ordersHref({ view: "action", q: filter.q, sort: filter.sort }),
          active: filter.view === "action" && !filter.status,
        },
        {
          key: "new",
          label: "New requests",
          count: counts.new,
          href: ordersHref({ status: "new", q: filter.q, sort: filter.sort }),
          active: filter.status === "new" && !filter.view,
        },
        {
          key: "paid_not_ordered",
          label: "Paid, not ordered in ESP",
          count: actionCounts.paidNotOrdered,
          href: ordersHref({ view: "paid_not_ordered", q: filter.q, sort: filter.sort }),
          active: filter.view === "paid_not_ordered" && !filter.status,
        },
      ]
    : [];

  return (
    <div className="mx-auto max-w-6xl px-6 py-10 sm:px-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link href="/admin" className="text-xs font-medium text-gold-text underline">
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
          className={`${CONTROL_BASE} border-onyx/50 px-4 py-2 font-semibold hover:bg-cream-200`}
        >
          Export CSV
          {filter.status || filter.view || filter.q ? " (current filter)" : ""}
        </a>
      </div>

      {actionCounts && (
        <section
          aria-labelledby="needs-action-heading"
          className="mt-6 rounded-lg border-2 border-onyx bg-cream-100 p-4"
        >
          <h2 id="needs-action-heading" className="text-sm font-semibold text-onyx">
            Needs action
          </h2>
          <p className="mt-0.5 text-xs text-onyx/70">
            New requests to review, and paid orders that still need to be ordered in ESP+.
          </p>
          <nav aria-label="Needs action" className="mt-3 flex flex-wrap gap-2">
            {actionLinks.map((link) => (
              <Link
                key={link.key}
                href={link.href}
                aria-current={link.active ? "page" : undefined}
                className={`${CONTROL_BASE} px-3.5 py-1.5 text-sm font-medium ${
                  link.active
                    ? "border-onyx bg-onyx text-cream"
                    : link.count > 0
                      ? "border-onyx bg-cream text-onyx hover:bg-cream-200"
                      : "border-onyx/50 bg-cream text-onyx/70 hover:bg-cream-200"
                }`}
              >
                {link.label} <span className="tabular-nums">({link.count})</span>
              </Link>
            ))}
          </nav>
        </section>
      )}

      <form
        action="/admin/orders"
        method="get"
        role="search"
        className="mt-6 flex flex-wrap items-center gap-3"
      >
        {filter.status && <input type="hidden" name="status" value={filter.status} />}
        {filter.view && <input type="hidden" name="view" value={filter.view} />}
        {filter.sort && <input type="hidden" name="sort" value={filter.sort} />}
        <label htmlFor="orders-search" className="sr-only">
          Search orders
        </label>
        <input
          id="orders-search"
          name="q"
          type="search"
          defaultValue={filter.q}
          maxLength={100}
          placeholder="Reference (MG-00042), name, email, company, or product"
          className="w-full max-w-md rounded-md border border-onyx/50 bg-cream px-3 py-2 text-sm text-onyx placeholder:text-onyx/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-onyx focus-visible:ring-offset-2"
        />
        <button
          type="submit"
          className={`${CONTROL_BASE} border-onyx bg-onyx px-4 py-2 font-semibold text-cream hover:bg-onyx-100`}
        >
          Search
        </button>
        {filter.q && (
          <Link
            href={ordersHref({ status: filter.status, view: filter.view, sort: filter.sort })}
            className="text-sm text-onyx/80 underline focus:outline-none focus-visible:ring-2 focus-visible:ring-onyx focus-visible:ring-offset-2"
          >
            Clear search
          </Link>
        )}
      </form>

      <nav aria-label="Order status" className="mt-5 flex flex-wrap gap-2">
        {tabs.map((tab) => {
          const active = (filter.status ?? undefined) === tab.status && !filter.view;
          return (
            <Link
              key={tab.key}
              href={ordersHref({ status: tab.status, q: filter.q, sort: filter.sort })}
              aria-current={active ? "page" : undefined}
              className={`${CONTROL_BASE} rounded-full px-3.5 py-1.5 text-xs font-medium ${
                active
                  ? "border-onyx bg-onyx text-cream"
                  : "border-onyx/50 text-onyx hover:bg-cream-200"
              }`}
            >
              {tab.label} <span className="tabular-nums">({tab.count})</span>
            </Link>
          );
        })}
      </nav>

      <nav aria-label="Sort orders" className="mt-3 flex flex-wrap items-center gap-2 text-xs">
        <span className="font-medium text-onyx/80">Sort by</span>
        {ORDER_SORTS.map((key) => (
          <Link
            key={key}
            href={ordersHref({
              status: filter.status,
              view: filter.view,
              q: filter.q,
              sort: key,
            })}
            aria-current={sort === key ? "true" : undefined}
            className={`${CONTROL_BASE} px-3 py-1 font-medium ${
              sort === key
                ? "border-onyx bg-onyx text-cream"
                : "border-onyx/50 text-onyx hover:bg-cream-200"
            }`}
          >
            {ORDER_SORT_LABELS[key]}
          </Link>
        ))}
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
                  {filter.q || filter.status || filter.view
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
                    className="font-semibold text-onyx underline decoration-gold underline-offset-2 hover:decoration-onyx"
                  >
                    {item.reference}
                  </Link>
                  {item.unread && (
                    <span className="ml-2 text-xs font-medium text-gold-text">Unread</span>
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
                    <span className="text-onyx/70">-</span>
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
