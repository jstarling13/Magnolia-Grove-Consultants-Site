import { beforeEach, describe, expect, it, vi } from "vitest";

async function loadWith(curated: object, imported: object = {}) {
  vi.resetModules();
  vi.doMock("@/lib/espLinks.curated.json", () => ({ default: curated }));
  vi.doMock("@/lib/espLinks.imported.json", () => ({ default: imported }));
  vi.doMock("../src/lib/espLinks.curated.json", () => ({ default: curated }));
  vi.doMock("../src/lib/espLinks.imported.json", () => ({ default: imported }));
  return import("@/lib/espLinks");
}

describe("getEspLink", () => {
  beforeEach(() => vi.resetModules());

  it("links straight to the ESP+ product page when the ESP id is known", async () => {
    const { getEspLink } = await loadWith({
      pen: { espId: "555990121", supplier: "Prime Line", asi: "asi/79530", productNo: "OD618" },
    });
    expect(getEspLink({ id: "pen", name: "Metal Pen" })).toEqual({
      url: "https://espplus.com/products/555990121",
      kind: "product",
      supplier: "Prime Line",
      asi: "asi/79530",
      productNo: "OD618",
    });
  });

  it("falls back to an ESP+ search when the product is unknown", async () => {
    const { getEspLink } = await loadWith({});
    expect(getEspLink({ id: "mystery", name: "Mystery Mug" })).toEqual({
      url: "https://espplus.com/products?q=Mystery%20Mug&searchType=products",
      kind: "search",
    });
  });

  it("keeps supplier details but searches when an entry has no ESP id", async () => {
    const { getEspLink } = await loadWith({ pen: { supplier: "Prime Line", productNo: "OD618" } });
    const link = getEspLink({ id: "pen", name: "Metal Pen" });
    expect(link.kind).toBe("search");
    expect(link.supplier).toBe("Prime Line");
    expect(link.productNo).toBe("OD618");
    expect(link.asi).toBeUndefined();
  });

  it("URL-encodes names containing quotes and ampersands", async () => {
    const { getEspLink } = await loadWith({});
    const { url } = getEspLink({ id: "x", name: `Ben & Jerry's 16" Tumbler` });
    expect(url).toBe(
      "https://espplus.com/products?q=Ben%20%26%20Jerry's%2016%22%20Tumbler&searchType=products"
    );
    const q = new URL(url).searchParams.get("q");
    expect(q).toBe(`Ben & Jerry's 16" Tumbler`);
  });

  it("ignores blank and malformed entries, and lets curated override imported", async () => {
    const { getEspLink } = await loadWith(
      { a: { espId: "222" }, b: null, c: { espId: "   ", supplier: 5 } },
      { a: { espId: "111", supplier: "Imported Co" }, c: { supplier: "Real Co" } }
    );
    expect(getEspLink({ id: "a", name: "A" })).toMatchObject({
      url: "https://espplus.com/products/222",
      supplier: "Imported Co",
    });
    expect(getEspLink({ id: "b", name: "B" }).kind).toBe("search");
    expect(getEspLink({ id: "c", name: "C" })).toMatchObject({ kind: "search", supplier: "Real Co" });
  });
});
