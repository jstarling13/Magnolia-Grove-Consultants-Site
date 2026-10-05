import { contactOf, formatOrderDate, type OrderItem, type RawData } from "@/lib/adminOrders";

/**
 * The one-page "Backend order sheet". Invisible on screen; when the browser
 * prints, everything else on the page is `print:hidden` and this takes over.
 * ESP+ links are printed as text so the person placing the order can read or
 * retype them from paper.
 */
export default function OrderPrintSheet({
  reference,
  createdAt,
  data,
  items,
}: {
  reference: string;
  createdAt: string;
  data: RawData;
  items: OrderItem[];
}) {
  const contact = contactOf(data);
  const notes = typeof data.notes === "string" ? data.notes.trim() : "";
  const product = typeof data.product === "string" ? data.product.trim() : "";
  const quantity = typeof data.quantity === "string" ? data.quantity.trim() : "";

  return (
    <section
      aria-label="Backend order sheet"
      data-print-sheet
      className="hidden bg-white text-[11px] leading-snug text-black print:block"
    >
      <style>{`@media print { @page { size: letter; margin: 0.5in; } html, body { background: #fff !important; } }`}</style>
      <header className="flex items-end justify-between border-b-2 border-black pb-2">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest">
            Magnolia Grove Consultants
          </p>
          <h1 className="text-xl font-bold">Backend order sheet</h1>
        </div>
        <div className="text-right">
          <p className="text-base font-bold">{reference}</p>
          <p>Placed {formatOrderDate(createdAt) || "(date unknown)"}</p>
        </div>
      </header>

      <div className="mt-3 grid grid-cols-3 gap-4">
        <div>
          <p className="font-semibold uppercase tracking-wide">Customer / ship-to</p>
          <p>{contact.name || "Not given"}</p>
        </div>
        <div>
          <p className="font-semibold uppercase tracking-wide">Email</p>
          <p className="break-all">{contact.email || "Not given"}</p>
        </div>
        <div>
          <p className="font-semibold uppercase tracking-wide">Phone</p>
          <p>{contact.phone || "Not given"}</p>
        </div>
      </div>

      <table className="mt-3 w-full border-collapse text-left">
        <thead>
          <tr className="border-b border-black">
            <th className="py-1 pr-2 font-semibold">#</th>
            <th className="py-1 pr-2 font-semibold">Item</th>
            <th className="py-1 pr-2 font-semibold">Color</th>
            <th className="py-1 pr-2 text-right font-semibold">Qty</th>
            <th className="py-1 font-semibold">Supplier / ESP+ link</th>
          </tr>
        </thead>
        <tbody>
          {items.length === 0 && (
            <tr>
              <td className="py-1 pr-2">1</td>
              <td className="py-1 pr-2" colSpan={2}>
                {product || "No items recorded"}
              </td>
              <td className="py-1 pr-2 text-right">{quantity || "-"}</td>
              <td className="py-1">Quote request: no ESP+ link on file</td>
            </tr>
          )}
          {items.map((item, index) => (
            <tr
              key={`${item.productId ?? item.name}::${item.color ?? ""}::${index}`}
              className="border-b border-neutral-400 align-top"
            >
              <td className="py-1 pr-2">{index + 1}</td>
              <td className="py-1 pr-2 font-medium">{item.name}</td>
              <td className="py-1 pr-2">{item.color ?? "Not specified"}</td>
              <td className="py-1 pr-2 text-right font-semibold">{item.quantity}</td>
              <td className="py-1">
                {item.supplier && <div>Supplier: {item.supplier}</div>}
                {item.productNo && <div>Product no.: {item.productNo}</div>}
                {item.espUrl && (
                  <div className="break-all">
                    {item.espUrl}
                    {item.espKind === "search" ? " (search link)" : ""}
                  </div>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-3">
        <p className="font-semibold uppercase tracking-wide">Customer notes</p>
        <p className="whitespace-pre-wrap">{notes || "None"}</p>
      </div>
    </section>
  );
}
