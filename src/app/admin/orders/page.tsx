import { redirect } from "next/navigation";
import { paginate, parseOrderFilter, toOrderListItem } from "@/lib/adminOrders";
import { syncAwaitingMerchPayments } from "@/lib/merchPayments";
import OrdersList, { ordersHref } from "@/components/admin/orders/OrdersList";
import { requireAdminPage } from "./guard";
import { getActionCounts, getStatusCounts, listOrders } from "./queries";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Merch orders | Admin | Magnolia Grove Consultants",
  robots: { index: false, follow: false },
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function AdminOrdersPage({ searchParams }: { searchParams: SearchParams }) {
  const session = await requireAdminPage();
  const filter = parseOrderFilter(await searchParams);

  let { records, total } = await listOrders(filter);

  // A stale link past the last page lands on the last page instead of an empty table.
  const pageInfo = paginate(total, filter.page);
  if (records.length === 0 && total > 0 && filter.page !== pageInfo.page) {
    redirect(ordersHref({ ...filter, page: pageInfo.page }));
  }

  // Square payment is detected by polling (see syncAwaitingMerchPayments); do it
  // for the awaiting orders on screen so the list never shows a paid order as
  // unpaid. Failures are logged inside and must never break the page.
  try {
    const rows = records.map((record) => ({
      id: record.id,
      type: "merch_order",
      data: record.data,
    }));
    await syncAwaitingMerchPayments(rows);
    records = records.map((record, index) => ({ ...record, data: rows[index].data }));
  } catch (error) {
    console.error("[admin/orders] payment sync failed:", error);
  }

  const [{ counts, all }, actionCounts] = await Promise.all([
    getStatusCounts(filter.q),
    getActionCounts(filter.q),
  ]);
  const now = Date.now();

  return (
    <OrdersList
      items={records.map((record) => toOrderListItem(record, now))}
      counts={counts}
      allCount={all}
      filter={filter}
      page={pageInfo}
      username={session.username}
      actionCounts={actionCounts}
    />
  );
}
