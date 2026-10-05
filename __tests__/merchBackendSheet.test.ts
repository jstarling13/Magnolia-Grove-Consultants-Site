import { describe, expect, it } from "vitest";
import { buildBackendOrderSheet, describeLineColor } from "@/lib/merchBackendSheet";

describe("describeLineColor", () => {
  it("names the color, or says it was not specified for legacy lines", () => {
    expect(describeLineColor("Navy Blue")).toBe("Color: Navy Blue");
    expect(describeLineColor(undefined)).toBe("Color: not specified");
    expect(describeLineColor("  ")).toBe("Color: not specified");
  });
});

describe("buildBackendOrderSheet", () => {
  it("lists the color under each line, one line per color of the same product", () => {
    const sheet = buildBackendOrderSheet({ orderId: 12, customerName: "Pat Lee" }, [
      { name: "Galway Vest", color: "Navy", quantity: 6, supplier: "Peter Millar" },
      { name: "Galway Vest", color: "Black", quantity: 12 },
      { name: "Old Order Pen", quantity: 250 },
    ]);
    const lines = sheet.split("\n");
    expect(lines).toContain("1. 6 x Galway Vest");
    expect(lines).toContain("   Color: Navy");
    expect(lines).toContain("2. 12 x Galway Vest");
    expect(lines).toContain("   Color: Black");
    expect(lines).toContain("3. 250 x Old Order Pen");
    expect(lines).toContain("   Color: not specified");
  });
});
