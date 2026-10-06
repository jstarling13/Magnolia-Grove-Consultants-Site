import { notFound } from "next/navigation";
import { syncAwaitingMerchPayments } from "@/lib/merchPayments";
import OrderDetail from "@/components/admin/orders/OrderDetail";
import { listOrderFiles, type OrderFileSummary } from "@/lib/orderFiles";
import { requireAdminPage } from "../guard";
import { getOrder, markOrderRead, readItemsWithBackendLinks } from "../queries";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Order | Admin | Magnolia Grove Consultants",
  robots: { index: false, follow: false },
};

type Params = Promise<{ id: string }>;

export default async function AdminOrderPage({ params }: { params: Params }) {
  await requireAdminPage();
  const { id: rawId } = await params;
  if (!/^\d{1,9}$/.test(rawId)) notFound();

  let order = await getOrder(Number(rawId));
  if (!order) notFound();

  // Same Square poll the dashboard runs: an awaiting order that was paid shows as paid.
  try {
    const row = { id: order.id, type: "merch_order", data: order.data };
    await syncAwaitingMerchPayments([row]);
    order = { ...order, data: row.data };
  } catch (error) {
    console.error("[admin/orders] payment sync failed:", error);
  }

  if (!order.readAt) {
    try {
      await markOrderRead(order.id);
    } catch (error) {
      console.error("[admin/orders] couldn't mark order read:", error);
    }
  }

  let files: OrderFileSummary[] = [];
  try {
    files = await listOrderFiles(order.id);
  } catch (error) {
    console.error("[admin/orders] couldn't list logo files:", error);
  }

  return <OrderDetail order={order} items={readItemsWithBackendLinks(order.data)} files={files} />;
}
