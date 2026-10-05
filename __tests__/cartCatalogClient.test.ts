// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import {
  cartProductUrl,
  fetchAvailableProductIds,
  fetchCartProduct,
} from "@/lib/cartCatalogClient";

const product = {
  id: "mug",
  name: "Mug",
  category: "Drinkware",
  brand: "Essentials",
  tiers: [{ quantity: 1, price: 5 }],
};

const reply = (status: number, body: unknown = {}) =>
  vi.fn().mockResolvedValue({ ok: status >= 200 && status < 300, status, json: async () => body });

describe("fetchCartProduct", () => {
  it("requests the product's own file, with the id encoded", async () => {
    const fetchMock = reply(200, product);
    await fetchCartProduct("mug", fetchMock);
    expect(fetchMock).toHaveBeenCalledWith("/merchandise/mug/cart.json");
    expect(cartProductUrl("a b/c")).toBe("/merchandise/a%20b%2Fc/cart.json");
  });

  it("returns the product", async () => {
    expect(await fetchCartProduct("mug", reply(200, product))).toEqual({ kind: "ok", product });
  });

  it("treats a 404 as 'missing' (the product is gone)", async () => {
    expect(await fetchCartProduct("gone", reply(404))).toEqual({ kind: "missing" });
  });

  it("rejects on other statuses, network errors and bad data, so saved lines are never dropped", async () => {
    await expect(fetchCartProduct("mug", reply(500))).rejects.toThrow();
    await expect(
      fetchCartProduct("mug", vi.fn().mockRejectedValue(new TypeError("offline")))
    ).rejects.toThrow();
    await expect(
      fetchCartProduct(
        "mug",
        reply(200, { id: "other", name: "x", tiers: [{ quantity: 1, price: 1 }] })
      )
    ).rejects.toThrow();
    await expect(fetchCartProduct("mug", reply(200, { ...product, tiers: [] }))).rejects.toThrow();
    await expect(fetchCartProduct("mug", reply(200, null))).rejects.toThrow();
  });
});

describe("fetchAvailableProductIds", () => {
  it("returns the list", async () => {
    expect(await fetchAvailableProductIds(reply(200, ["a", "b"]))).toEqual(["a", "b"]);
  });
  it("rejects on a bad status or shape", async () => {
    await expect(fetchAvailableProductIds(reply(500))).rejects.toThrow();
    await expect(fetchAvailableProductIds(reply(200, { a: 1 }))).rejects.toThrow();
    await expect(fetchAvailableProductIds(reply(200, ["a", 2]))).rejects.toThrow();
  });
});
