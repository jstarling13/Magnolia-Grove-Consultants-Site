import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { checkRateLimit } from "@/lib/ratelimit";
import { isOrderTrackingEnabled, parseOrderRefParam, verifyOrderToken } from "@/lib/orderTracking";
import OrderStatusView from "../OrderStatusView";
import { loadOrderView } from "../orderView";

// Personalized and token-gated: never statically rendered or cached, and kept
// out of search results. Dynamic rendering makes Next send
// "Cache-Control: private, no-cache, no-store".
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const metadata: Metadata = {
  title: "Order Status | Magnolia Grove Consultants",
  robots: { index: false, follow: false, nocache: true },
  // The token lives in the URL; don't hand it to the carrier sites we link to.
  referrer: "no-referrer",
};

interface OrderPageProps {
  params: Promise<{ ref: string }>;
  searchParams: Promise<{ t?: string | string[] }>;
}

function clientIp(requestHeaders: Headers): string {
  const forwardedFor = requestHeaders.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0].trim();
  return requestHeaders.get("x-real-ip") ?? "unknown";
}

export default async function OrderPage({ params, searchParams }: OrderPageProps) {
  // Feature off: indistinguishable from any other missing page.
  if (!isOrderTrackingEnabled()) notFound();

  const [{ ref }, { t }, requestHeaders] = await Promise.all([params, searchParams, headers()]);

  const limit = await checkRateLimit(`order-status:${clientIp(requestHeaders)}`);
  if (!limit.success) {
    return (
      <section className="section-padding bg-cream-100">
        <div className="container-grove max-w-3xl">
          <span className="eyebrow">Order status</span>
          <h1 className="mt-3 text-4xl sm:text-5xl">Please try again shortly</h1>
          <p className="mt-4 text-base text-onyx/70">
            You have checked this page a lot in a short time. Wait a few minutes and open the link
            from your email again.
          </p>
        </div>
      </section>
    );
  }

  const id = parseOrderRefParam(ref);
  const token = Array.isArray(t) ? undefined : t;
  // A missing ref, a bad token, and an order that doesn't exist all look the
  // same, so the page can't be used to discover which references are real.
  if (id === undefined || !verifyOrderToken(id, token)) notFound();

  const order = await loadOrderView(id);
  if (!order) notFound();

  return <OrderStatusView order={order} />;
}
