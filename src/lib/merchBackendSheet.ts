/**
 * Plain-text "backend order sheet" for a merch order: what the business needs
 * to place the supplier order in ESP+. Admin-only — it is built from the
 * server-stamped line item fields and must never be shown to customers.
 */

export interface BackendSheetItem {
  name: string;
  quantity: number;
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

export function buildBackendOrderSheet(order: BackendSheetOrder, items: BackendSheetItem[]): string {
  const lines: string[] = [];
  const header = ["Backend order sheet"];
  if (order.orderId !== undefined) header.push(`Order #${order.orderId}`);
  if (order.customerName) header.push(order.customerName);
  lines.push(header.join(" - "), "");

  items.forEach((item, index) => {
    lines.push(`${index + 1}. ${item.quantity} x ${item.name}`);
    if (item.espUrl) {
      lines.push(`   ESP+ link: ${item.espUrl}${item.espKind === "search" ? " (search link)" : ""}`);
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
