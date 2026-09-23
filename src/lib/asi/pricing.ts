// ESP selling price is the base. The separate 5% surcharge belongs to the business.
// Supplier cost is paid when the operator manually places the ESP order.
export const BUSINESS_SURCHARGE_BASIS_POINTS = 500;

export function surchargeCents(espPriceCents: number): number {
  if (!Number.isSafeInteger(espPriceCents) || espPriceCents < 0) throw new Error("Invalid price");
  return Math.round((espPriceCents * BUSINESS_SURCHARGE_BASIS_POINTS) / 10_000);
}

export type QuoteInput = {
  quantity: number;
  espUnitPriceCents: number;
  supplierUnitCostCents: number;
  setupCostCents?: number;
  decorationCostCents?: number; // per unit
  shippingCostCents?: number;
};

export function quote(input: QuoteInput) {
  const { quantity, espUnitPriceCents, supplierUnitCostCents, setupCostCents = 0, decorationCostCents = 0, shippingCostCents = 0 } = input;
  if (!Number.isSafeInteger(quantity) || quantity <= 0) throw new Error("Invalid quantity");
  for (const value of [espUnitPriceCents, supplierUnitCostCents, setupCostCents, decorationCostCents, shippingCostCents]) {
    if (!Number.isSafeInteger(value) || value < 0) throw new Error("Invalid cost");
  }
  const merchandiseCents = quantity * espUnitPriceCents;
  const businessSurchargeCents = surchargeCents(merchandiseCents);
  const supplierCostCents = quantity * (supplierUnitCostCents + decorationCostCents) + setupCostCents + shippingCostCents;
  const estimatedMerchandiseGrossProfitCents = merchandiseCents - quantity * supplierUnitCostCents;
  const customerSubtotalCents = merchandiseCents + businessSurchargeCents + quantity * decorationCostCents + setupCostCents + shippingCostCents;
  if (![merchandiseCents, supplierCostCents, estimatedMerchandiseGrossProfitCents, customerSubtotalCents].every(Number.isSafeInteger)) throw new Error("Amount overflow");
  if (estimatedMerchandiseGrossProfitCents < 0) throw new Error("ESP price is below supplier cost");
  return { quantity, merchandiseCents, supplierCostCents, estimatedMerchandiseGrossProfitCents, businessSurchargeCents, customerSubtotalCents, currency: "USD" as const };
}
