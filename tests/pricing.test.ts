import { strict as assert } from "node:assert";
import { test } from "node:test";
import { surchargeCents, quote } from "../src/lib/asi/pricing";

test("$0.60 supplier cost and $1.00 ESP selling price becomes $1.05", () => assert.deepEqual(
  quote({ quantity: 1, espUnitPriceCents: 100, supplierUnitCostCents: 60 }),
  { quantity: 1, merchandiseCents: 100, supplierCostCents: 60, estimatedMerchandiseGrossProfitCents: 40, businessSurchargeCents: 5, customerSubtotalCents: 105, currency: "USD" }
));
test("5% is added to the ESP selling price", () => {
  assert.equal(surchargeCents(1000), 50);
});
test("negative and fractional inputs fail", () => {
  assert.throws(() => surchargeCents(-1));
  assert.throws(() => quote({ quantity: 1.5, espUnitPriceCents: 100, supplierUnitCostCents: 60 }));
});
