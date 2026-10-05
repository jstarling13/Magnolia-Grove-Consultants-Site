import { safeHttpUrl, type OrderItem } from "@/lib/adminOrders";

function money(value: number | undefined): string {
  return value === undefined ? "-" : `$${value.toFixed(2)}`;
}

/** Admin-only: the Backend column carries the ESP+ link, supplier and product number. */
export default function OrderItemsTable({
  items,
  fallbackText,
}: {
  items: OrderItem[];
  /** Shown for quote-request orders that have no cart lines. */
  fallbackText?: string;
}) {
  if (items.length === 0) {
    return <p className="text-sm text-onyx/70">{fallbackText || "No items were recorded."}</p>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead className="border-b border-gold/25 text-xs uppercase tracking-wide text-onyx/60">
          <tr>
            <th scope="col" className="py-2 pr-3 font-medium">
              Item
            </th>
            <th scope="col" className="py-2 pr-3 font-medium">
              Color
            </th>
            <th scope="col" className="py-2 pr-3 text-right font-medium">
              Qty
            </th>
            <th scope="col" className="py-2 pr-3 text-right font-medium">
              Unit
            </th>
            <th scope="col" className="py-2 pr-3 text-right font-medium">
              Line total
            </th>
            <th scope="col" className="py-2 font-medium">
              Backend (ESP+)
            </th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, index) => {
            const href = safeHttpUrl(item.espUrl);
            return (
              <tr
                key={`${item.productId ?? item.name}::${item.color ?? ""}::${index}`}
                className="border-b border-gold/15 align-top last:border-b-0"
              >
                <td className="py-2.5 pr-3 text-onyx">{item.name}</td>
                <td className="py-2.5 pr-3 text-onyx/80">{item.color ?? "Not specified"}</td>
                <td className="py-2.5 pr-3 text-right tabular-nums text-onyx">
                  {item.quantity.toLocaleString("en-US")}
                </td>
                <td className="py-2.5 pr-3 text-right tabular-nums text-onyx/80">
                  {money(item.unitPrice)}
                </td>
                <td className="py-2.5 pr-3 text-right tabular-nums text-onyx">
                  {money(item.lineTotal)}
                </td>
                <td className="py-2.5 text-xs text-onyx/70">
                  {href ? (
                    <a
                      href={href}
                      target="_blank"
                      rel="noreferrer"
                      className="font-medium text-gold-dark underline underline-offset-2 hover:text-onyx"
                    >
                      Open in ESP+
                    </a>
                  ) : (
                    <span>No link</span>
                  )}
                  {href && item.espKind === "search" && " (search link)"}
                  {item.supplier && <div>Supplier: {item.supplier}</div>}
                  {item.productNo && <div>Product no. {item.productNo}</div>}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
