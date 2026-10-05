import { contactDetails } from "@/config/siteConfig";
import { TIMELINE_STEPS, type OrderView } from "./orderView";

const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

function formatDate(iso: string | undefined): string | undefined {
  if (!iso) return undefined;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "America/New_York",
  });
}

const STEP_MESSAGES = [
  "We have your request and are confirming decoration, shipping, and sales tax. We will email you a final quote with a secure link to pay.",
  "Your final quote is ready. Check your email for the secure link to pay. We place your order as soon as payment clears.",
  "We have received your payment and are placing your order with our supplier.",
  "Your order is in production. We will email you tracking details as soon as it ships.",
  "Your order has shipped.",
] as const;

const phone = contactDetails.find((detail) => detail.label === "Phone");
const email = contactDetails.find((detail) => detail.label === "Email");

export function ContactLine({ orderRef }: { orderRef: string }) {
  return (
    <p className="text-sm leading-relaxed text-onyx/70">
      Questions about your order? Reach us at{" "}
      {email?.href ? (
        <a className="font-semibold text-onyx underline" href={email.href}>
          {email.value}
        </a>
      ) : (
        email?.value
      )}
      {phone ? (
        <>
          {" "}
          or{" "}
          <a className="font-semibold text-onyx underline" href={phone.href}>
            {phone.value}
          </a>
        </>
      ) : null}{" "}
      and mention {orderRef}.
    </p>
  );
}

export default function OrderStatusView({ order }: { order: OrderView }) {
  const requested = formatDate(order.dates.received);
  return (
    <section className="section-padding bg-cream-100">
      <div className="container-grove max-w-3xl">
        <span className="eyebrow">Order status</span>
        <h1 className="mt-3 text-4xl sm:text-5xl">Order {order.ref}</h1>
        <p className="mt-3 text-sm text-onyx/60">
          {requested ? `Requested ${requested}. ` : ""}
          {order.maskedEmail ? `Updates are sent to ${order.maskedEmail}.` : ""}
        </p>

        {order.cancelled ? (
          <div className="mt-8 rounded-lg border border-gold/30 bg-cream p-6 shadow-card">
            <h2 className="text-xl">This order has been cancelled</h2>
            <p className="mt-2 text-sm leading-relaxed text-onyx/80">
              No further action is needed. If you were not expecting this, or you would like to
              start a new request, we are glad to help.
            </p>
          </div>
        ) : (
          <>
            <p className="mt-8 text-base leading-relaxed text-onyx/80">
              {STEP_MESSAGES[order.currentStep]}
            </p>
            <ol className="mt-6 rounded-lg border border-gold/20 bg-cream p-6 shadow-card">
              {TIMELINE_STEPS.map((step, index) => {
                const done = index < order.currentStep;
                const current = index === order.currentStep;
                const date = formatDate(order.dates[step.key]);
                return (
                  <li
                    key={step.key}
                    aria-current={current ? "step" : undefined}
                    data-state={current ? "current" : done ? "done" : "upcoming"}
                    className="relative flex gap-4 pb-6 last:pb-0"
                  >
                    {index < TIMELINE_STEPS.length - 1 && (
                      <span
                        aria-hidden="true"
                        className={`absolute left-[7px] top-5 h-full w-px ${done ? "bg-gold" : "bg-onyx/15"}`}
                      />
                    )}
                    <span
                      aria-hidden="true"
                      className={`relative mt-1 h-[15px] w-[15px] shrink-0 rounded-full border-2 ${
                        current
                          ? "border-gold-dark bg-gold-dark ring-4 ring-gold/30"
                          : done
                            ? "border-gold bg-gold"
                            : "border-onyx/25 bg-cream"
                      }`}
                    />
                    <div>
                      <p
                        className={`text-sm font-semibold ${
                          current ? "text-onyx" : done ? "text-onyx/80" : "text-onyx/40"
                        }`}
                      >
                        {step.label}
                        {current && (
                          <span className="ml-2 text-xs font-semibold uppercase tracking-wide text-gold-dark">
                            Current
                          </span>
                        )}
                      </p>
                      {date && (current || done) && (
                        <p className="mt-0.5 text-xs text-onyx/60">{date}</p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          </>
        )}

        {order.shipment && (
          <div className="mt-6 rounded-lg border border-gold/20 bg-cream p-6 shadow-card">
            <h2 className="text-xl">Shipping</h2>
            <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-6 gap-y-1 text-sm">
              <dt className="text-onyx/60">Carrier</dt>
              <dd className="text-onyx">{order.shipment.carrier}</dd>
              <dt className="text-onyx/60">Tracking number</dt>
              <dd className="break-all text-onyx">{order.shipment.trackingNumber}</dd>
            </dl>
            {order.shipment.trackingUrl ? (
              <a
                href={order.shipment.trackingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-5 inline-block rounded-full bg-gold px-6 py-2.5 text-sm font-semibold uppercase tracking-wide text-onyx transition hover:bg-gold-bright"
              >
                Track your package
              </a>
            ) : (
              <p className="mt-4 text-xs text-onyx/60">
                Use the tracking number above on {order.shipment.carrier}&apos;s website to follow
                your package.
              </p>
            )}
          </div>
        )}

        {order.items.length > 0 && (
          <div className="mt-6 rounded-lg border border-gold/20 bg-cream p-6 shadow-card">
            <h2 className="text-xl">Items</h2>
            <table className="mt-3 w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-gold/25 text-left text-xs uppercase tracking-wide text-onyx/60">
                  <th className="pb-2 font-semibold">Item</th>
                  <th className="pb-2 text-right font-semibold">Qty</th>
                  <th className="pb-2 text-right font-semibold">Line total</th>
                </tr>
              </thead>
              <tbody>
                {order.items.map((item, index) => (
                  <tr key={index} className="align-top">
                    <td className="py-2 pr-4 text-onyx">
                      {item.name}
                      {item.color && <div className="text-xs text-onyx/60">{item.color}</div>}
                    </td>
                    <td className="py-2 text-right text-onyx">{item.quantity}</td>
                    <td className="py-2 text-right text-onyx">
                      {item.lineTotal !== undefined ? money.format(item.lineTotal) : ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {order.total && (
              <div className="mt-4 border-t border-gold/25 pt-4">
                <p className="flex justify-between text-sm font-semibold text-onyx">
                  <span>
                    {order.total.kind === "quoted" ? "Quoted total" : "Estimated subtotal"}
                  </span>
                  <span>{money.format(order.total.amount)}</span>
                </p>
                <p className="mt-1 text-xs text-onyx/60">
                  {order.total.kind === "quoted"
                    ? "Final price, including decoration, shipping, and sales tax."
                    : "An estimate at the quantity tier for each product. It does not yet include decoration, shipping, or sales tax."}
                </p>
              </div>
            )}
          </div>
        )}

        <div className="mt-8">
          <ContactLine orderRef={order.ref} />
        </div>
      </div>
    </section>
  );
}
