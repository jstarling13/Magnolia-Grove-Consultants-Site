/**
 * Plain-text "backend order sheet" for a merch order: what the business needs
 * to place the supplier order in ESP+. Admin-only — it is built from the
 * server-stamped line item fields and must never be shown to customers.
 */

export interface BackendSheetItem {
  name: string;
  /** Color the customer chose; absent on legacy lines and uncolored products. */
  color?: string;
  quantity: number;
  /** Customer-entered size breakdown and imprint notes. */
  sizes?: string;
  imprintNotes?: string;
  espUrl?: string;
  espKind?: "product" | "search";
  supplier?: string;
  productNo?: string;
}

export interface BackendSheetOrder {
  orderId?: number;
  customerName?: string;
  notes?: string;
  quotedTotal?: number;
}

/** Back-office wording for a line's color, including lines saved without one. */
export function describeLineColor(color: string | undefined): string {
  const value = color?.trim();
  return value ? `Color: ${value}` : "Color: not specified";
}

export function buildBackendOrderSheet(
  order: BackendSheetOrder,
  items: BackendSheetItem[]
): string {
  const lines: string[] = [];
  const header = ["Backend order sheet"];
  if (order.orderId !== undefined) header.push(`Order #${order.orderId}`);
  if (order.customerName) header.push(order.customerName);
  lines.push(header.join(" - "), "");

  items.forEach((item, index) => {
    lines.push(`${index + 1}. ${item.quantity} x ${item.name}`);
    lines.push(`   ${describeLineColor(item.color)}`);
    if (item.sizes?.trim()) lines.push(`   Sizes and quantities: ${item.sizes.trim()}`);
    if (item.imprintNotes?.trim()) lines.push(`   Imprint notes: ${item.imprintNotes.trim()}`);
    if (item.espUrl) {
      lines.push(
        `   ESP+ link: ${item.espUrl}${item.espKind === "search" ? " (search link)" : ""}`
      );
    }
    if (item.supplier) lines.push(`   Supplier: ${item.supplier}`);
    if (item.productNo) lines.push(`   Product no.: ${item.productNo}`);
  });

  lines.push("", `Customer notes: ${order.notes?.trim() ? order.notes.trim() : "None"}`);
  if (typeof order.quotedTotal === "number") {
    lines.push(`Quoted total: $${order.quotedTotal.toFixed(2)}`);
  }
  return lines.join("\n");
}

/**
 * Plain text for re-ordering an order's lines from the supplier in ESP+: per
 * line the product, color, quantity, sizes and imprint notes, and the internal
 * ESP+ link. No customer contact or pricing, so it can be pasted straight into
 * a supplier order or note. Admin-only (the link is backend data).
 */
export function buildEspReorderText(reference: string, items: BackendSheetItem[]): string {
  const lines: string[] = [`ESP+ reorder - ${reference}`, ""];
  if (items.length === 0) lines.push("No lines recorded.");
  items.forEach((item, index) => {
    lines.push(`${index + 1}. ${item.name}`);
    lines.push(`   ${describeLineColor(item.color)}`);
    lines.push(`   Quantity: ${item.quantity}`);
    lines.push(`   Sizes: ${item.sizes?.trim() || "none given"}`);
    lines.push(`   Imprint notes: ${item.imprintNotes?.trim() || "none given"}`);
    if (item.supplier) lines.push(`   Supplier: ${item.supplier}`);
    if (item.productNo) lines.push(`   Product no.: ${item.productNo}`);
    lines.push(
      item.espUrl
        ? `   ESP+ link: ${item.espUrl}${item.espKind === "search" ? " (search link, find the exact product)" : ""}`
        : "   ESP+ link: none on file"
    );
    if (index < items.length - 1) lines.push("");
  });
  return lines.join("\n");
}
