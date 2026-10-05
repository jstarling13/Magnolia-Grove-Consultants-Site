import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from "vitest";

vi.hoisted(() => {
  process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID = "G-TEST123";
});

import {
  PURCHASE_STORAGE_KEY,
  buildCartLineChange,
  buildCartSnapshot,
  buildItem,
  buildPurchase,
  buildSearch,
  buildSelectColor,
  buildSelectItem,
  buildViewItem,
  buildViewItemList,
  resetSearchTracking,
  scheduleSearchEvent,
  setActiveList,
  trackAddToCart,
  trackBeginCheckout,
  trackGenerateLead,
  trackMerchPurchaseOnce,
  trackMerchPurchaseWhenReady,
  trackRemoveFromCart,
  trackSelectColor,
  trackSelectItem,
  trackViewCart,
  trackViewItem,
  trackViewItemList,
  MAX_LIST_ITEMS,
  SEARCH_DEBOUNCE_MS,
  type ListableProduct,
} from "@/lib/merchAnalytics";

// A fuller object than analytics should ever read, to prove nothing extra leaks.
const MUG = {
  id: "mug-1",
  name: "Travel Mug",
  category: "Drinkware",
  brand: "Essentials",
  tiers: [
    { quantity: 12, price: 9.5 },
    { quantity: 48, price: 7.25 },
  ],
  espCost: 3.1,
  supplier: "Acme Promo",
  espProductId: "ESP-999",
  priceTiers: [{ quantity: 12, price: 3.1 }],
} as ListableProduct;

const VEST = {
  id: "vest-1",
  name: "Quarter Zip Vest",
  category: "Apparel",
  brand: "Peter Millar",
  tiers: [{ quantity: 6, price: 100 }],
} as ListableProduct;

const FORBIDDEN = /esp|supplier|cost|vendor|acme|3\.1\b/i;

describe("item builders", () => {
  it("builds the GA4 item shape with a clean color as item_variant", () => {
    expect(
      buildItem(VEST, { price: 100, quantity: 6, color: "Navy  show more", index: 2 })
    ).toEqual({
      item_id: "vest-1",
      item_name: "Quarter Zip Vest",
      item_category: "Apparel",
      item_brand: "Peter Millar",
      item_variant: "Navy",
      price: 100,
      quantity: 6,
      index: 2,
    });
  });

  it("omits item_brand for Essentials and item_variant when there is no color", () => {
    const item = buildItem(MUG, { price: 9.5 });
    expect(item).not.toHaveProperty("item_brand");
    expect(item).not.toHaveProperty("item_variant");
    expect(item).not.toHaveProperty("quantity");
  });

  it("floors quantity to at least 1 and rounds price to cents", () => {
    const item = buildItem(MUG, { price: 7.254, quantity: 0 });
    expect(item.price).toBe(7.25);
    expect(item.quantity).toBe(1);
  });

  it("never carries supplier or ESP data from a fuller product object", () => {
    const payloads = [
      buildViewItemList("Drinkware", [MUG]),
      buildSelectItem("Drinkware", MUG, { color: "Black" }),
      buildViewItem(MUG),
      buildCartLineChange({ product: MUG, quantity: 12, unitPrice: 9.5 }),
      buildCartSnapshot([{ product: MUG, quantity: 12, unitPrice: 9.5 }]),
    ];
    for (const payload of payloads) expect(JSON.stringify(payload)).not.toMatch(FORBIDDEN);
  });
});

describe("event payloads", () => {
  it("view_item_list names the list, indexes items, and uses the customer starting price", () => {
    const payload = buildViewItemList("Drinkware", [MUG, VEST]);
    expect(payload.item_list_id).toBe("drinkware");
    expect(payload.item_list_name).toBe("Drinkware");
    expect(payload.items.map((item) => [item.item_id, item.price, item.index])).toEqual([
      ["mug-1", 9.5, 0],
      ["vest-1", 100, 1],
    ]);
    expect(payload.items[0].item_list_name).toBe("Drinkware");
  });

  it("view_item_list caps the number of items", () => {
    const many = Array.from({ length: 100 }, (_, i) => ({ ...MUG, id: `p${i}` }));
    expect(buildViewItemList("All products", many).items).toHaveLength(MAX_LIST_ITEMS);
  });

  it("select_item carries the list and the chosen color", () => {
    const payload = buildSelectItem("Apparel", VEST, { color: "Navy", index: 3 });
    expect(payload.item_list_name).toBe("Apparel");
    expect(payload.items[0]).toMatchObject({ item_id: "vest-1", item_variant: "Navy", index: 3 });
  });

  it("view_item has currency, the starting price as value, and one item", () => {
    expect(buildViewItem(VEST)).toEqual({
      currency: "USD",
      value: 100,
      items: [
        {
          item_id: "vest-1",
          item_name: "Quarter Zip Vest",
          item_category: "Apparel",
          item_brand: "Peter Millar",
          price: 100,
        },
      ],
    });
  });

  it("select_color is item_id plus the clean color", () => {
    expect(buildSelectColor("vest-1", "Navy   Blue")).toEqual({
      item_id: "vest-1",
      color: "Navy Blue",
    });
  });

  it("add_to_cart / remove_from_cart value is unit price times quantity, color is the variant", () => {
    const payload = buildCartLineChange({
      product: VEST,
      color: "Navy",
      quantity: 12,
      unitPrice: 90,
    });
    expect(payload).toEqual({
      currency: "USD",
      value: 1080,
      items: [
        {
          item_id: "vest-1",
          item_name: "Quarter Zip Vest",
          item_category: "Apparel",
          item_brand: "Peter Millar",
          item_variant: "Navy",
          price: 90,
          quantity: 12,
        },
      ],
    });
  });

  it("cart snapshots use the given estimated total, or sum the lines", () => {
    const lines = [
      { product: VEST, color: "Navy", quantity: 6, unitPrice: 100 },
      { product: MUG, quantity: 12, unitPrice: 9.5 },
    ];
    expect(buildCartSnapshot(lines).value).toBe(714);
    expect(buildCartSnapshot(lines, 750.5).value).toBe(750.5);
    expect(buildCartSnapshot(lines).items.map((item) => item.index)).toEqual([0, 1]);
    expect(buildCartSnapshot(lines).currency).toBe("USD");
  });

  it("purchase carries no invented value, items or transaction id", () => {
    expect(buildPurchase()).toEqual({ store: "merch" });
  });

  it("search trims, collapses whitespace, and ignores one-character terms", () => {
    expect(buildSearch("  red   mug ")).toEqual({ search_term: "red mug" });
    expect(buildSearch("a")).toBeUndefined();
    expect(buildSearch("   ")).toBeUndefined();
  });
});

describe("senders with gtag present", () => {
  let gtag: Mock;

  beforeEach(() => {
    gtag = vi.fn();
    window.gtag = gtag as unknown as Window["gtag"];
    setActiveList(undefined);
  });
  afterEach(() => {
    delete window.gtag;
  });

  it("sends each funnel event with its GA4 name", () => {
    const line = { product: VEST, color: "Navy", quantity: 6, unitPrice: 100 };
    trackViewItemList("Apparel", [VEST]);
    trackSelectItem(VEST, { color: "Navy" });
    trackViewItem(VEST);
    trackSelectColor("vest-1", "Navy");
    trackAddToCart(line);
    trackRemoveFromCart(line);
    trackViewCart([line], 600);
    trackBeginCheckout([line], 600);
    trackGenerateLead([line], 600);
    expect(gtag.mock.calls.map((call) => [call[0], call[1]])).toEqual([
      ["event", "view_item_list"],
      ["event", "select_item"],
      ["event", "view_item"],
      ["event", "select_color"],
      ["event", "add_to_cart"],
      ["event", "remove_from_cart"],
      ["event", "view_cart"],
      ["event", "begin_checkout"],
      ["event", "generate_lead"],
    ]);
    const lead = gtag.mock.calls[8][2];
    expect(lead).toMatchObject({ currency: "USD", value: 600 });
    expect(lead.items[0].item_variant).toBe("Navy");
  });

  it("select_item names the active list, falls back to the category, and tags related cards", () => {
    trackSelectItem(VEST);
    setActiveList("All products");
    trackSelectItem(VEST);
    trackSelectItem(VEST, { related: true });
    expect(gtag.mock.calls.map((call) => call[2].item_list_name)).toEqual([
      "Apparel",
      "All products",
      "Related products",
    ]);
  });

  it("skips empty lists and empty carts", () => {
    trackViewItemList("Apparel", []);
    trackViewCart([]);
    trackBeginCheckout([]);
    trackGenerateLead([]);
    expect(gtag).not.toHaveBeenCalled();
  });

  it("never throws when gtag itself throws", () => {
    gtag.mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(() => trackViewItem(VEST)).not.toThrow();
    expect(() => trackAddToCart({ product: VEST, quantity: 1, unitPrice: 100 })).not.toThrow();
    expect(trackMerchPurchaseOnce()).toBe(false);
  });
});

describe("no-op without gtag", () => {
  beforeEach(() => {
    delete window.gtag;
    window.sessionStorage.clear();
  });

  it("does nothing and does not throw when window.gtag is absent", () => {
    expect(() => {
      trackViewItemList("Apparel", [VEST]);
      trackSelectItem(VEST);
      trackViewItem(VEST);
      trackSelectColor("vest-1", "Navy");
      trackAddToCart({ product: VEST, quantity: 1, unitPrice: 100 });
      trackGenerateLead([{ product: VEST, quantity: 1, unitPrice: 100 }]);
    }).not.toThrow();
    expect(trackMerchPurchaseOnce()).toBe(false);
  });

  it("does not mark the purchase as reported when gtag was missing, so it can retry", () => {
    trackMerchPurchaseOnce();
    expect(window.sessionStorage.getItem(PURCHASE_STORAGE_KEY)).toBeNull();
  });

  it("sends nothing when NEXT_PUBLIC_GA_MEASUREMENT_ID is unset, even if gtag exists", async () => {
    vi.resetModules();
    vi.stubEnv("NEXT_PUBLIC_GA_MEASUREMENT_ID", "");
    const gtag: Mock = vi.fn();
    window.gtag = gtag as unknown as Window["gtag"];
    try {
      const fresh = await import("@/lib/merchAnalytics");
      fresh.trackViewItem(VEST);
      fresh.trackAddToCart({ product: VEST, quantity: 1, unitPrice: 100 });
      expect(fresh.trackMerchPurchaseOnce()).toBe(false);
      fresh.trackMerchPurchaseWhenReady()();
      expect(gtag).not.toHaveBeenCalled();
    } finally {
      delete window.gtag;
      vi.unstubAllEnvs();
      vi.resetModules();
    }
  });
});

describe("purchase dedupe", () => {
  let gtag: Mock;

  beforeEach(() => {
    gtag = vi.fn();
    window.gtag = gtag as unknown as Window["gtag"];
    window.sessionStorage.clear();
  });
  afterEach(() => {
    delete window.gtag;
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("sends once per tab session, then ignores later page loads", () => {
    expect(trackMerchPurchaseOnce()).toBe(true);
    expect(trackMerchPurchaseOnce()).toBe(false);
    expect(trackMerchPurchaseOnce()).toBe(false);
    expect(gtag).toHaveBeenCalledTimes(1);
    expect(gtag).toHaveBeenCalledWith("event", "purchase", { store: "merch" });
  });

  it("does not fire on a reload", () => {
    vi.spyOn(performance, "getEntriesByType").mockReturnValue([
      { type: "reload" } as unknown as PerformanceEntry,
    ]);
    expect(trackMerchPurchaseOnce()).toBe(false);
    expect(gtag).not.toHaveBeenCalled();
  });

  it("sends nothing when sessionStorage is unavailable (cannot dedupe)", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("denied");
    });
    expect(trackMerchPurchaseOnce()).toBe(false);
    expect(gtag).not.toHaveBeenCalled();
  });

  it("retries until gtag loads, then sends exactly once", () => {
    vi.useFakeTimers();
    delete window.gtag;
    const cancel = trackMerchPurchaseWhenReady(10, 500);
    vi.advanceTimersByTime(1200);
    expect(gtag).not.toHaveBeenCalled();
    window.gtag = gtag as unknown as Window["gtag"];
    vi.advanceTimersByTime(500);
    expect(gtag).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(10_000);
    expect(gtag).toHaveBeenCalledTimes(1);
    cancel();
  });

  it("stops retrying after the attempts run out and when cancelled", () => {
    vi.useFakeTimers();
    delete window.gtag;
    trackMerchPurchaseWhenReady(3, 100);
    vi.advanceTimersByTime(1000);
    window.gtag = gtag as unknown as Window["gtag"];
    vi.advanceTimersByTime(1000);
    expect(gtag).not.toHaveBeenCalled();

    delete window.gtag;
    const cancel = trackMerchPurchaseWhenReady(10, 100);
    cancel();
    window.gtag = gtag as unknown as Window["gtag"];
    vi.advanceTimersByTime(2000);
    expect(gtag).not.toHaveBeenCalled();
  });
});

describe("search debounce", () => {
  let gtag: Mock;

  beforeEach(() => {
    vi.useFakeTimers();
    resetSearchTracking();
    gtag = vi.fn();
    window.gtag = gtag as unknown as Window["gtag"];
  });
  afterEach(() => {
    resetSearchTracking();
    delete window.gtag;
    vi.useRealTimers();
  });

  it("sends only the last term once the shopper stops typing", () => {
    scheduleSearchEvent("mu");
    vi.advanceTimersByTime(300);
    scheduleSearchEvent("mug");
    vi.advanceTimersByTime(300);
    scheduleSearchEvent("red mug");
    vi.advanceTimersByTime(SEARCH_DEBOUNCE_MS - 1);
    expect(gtag).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(gtag).toHaveBeenCalledTimes(1);
    expect(gtag).toHaveBeenCalledWith("event", "search", { search_term: "red mug" });
  });

  it("does not repeat the same term back to back", () => {
    scheduleSearchEvent("mug");
    vi.advanceTimersByTime(SEARCH_DEBOUNCE_MS);
    scheduleSearchEvent("mug");
    vi.advanceTimersByTime(SEARCH_DEBOUNCE_MS);
    expect(gtag).toHaveBeenCalledTimes(1);
  });

  it("clearing the box cancels a pending search", () => {
    scheduleSearchEvent("mug");
    scheduleSearchEvent("");
    vi.advanceTimersByTime(SEARCH_DEBOUNCE_MS * 2);
    expect(gtag).not.toHaveBeenCalled();
  });
});
