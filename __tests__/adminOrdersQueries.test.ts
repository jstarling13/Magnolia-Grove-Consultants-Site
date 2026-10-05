// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  calls: [] as { text: string; values: unknown[] }[],
  results: [] as unknown[][],
}));

vi.mock("@/lib/db", () => ({
  sql: async (strings: TemplateStringsArray, ...values: unknown[]) => {
    mocks.calls.push({ text: strings.join("$?"), values });
    return mocks.results.shift() ?? [];
  },
}));
vi.mock("@/lib/espLinks", () => ({
  getEspLink: (product: { id: string; name: string }) =>
    product.id === "pen"
      ? {
          url: "https://espplus.com/products/555990121",
          kind: "product",
          supplier: "Prime Line",
          productNo: "OD618",
        }
      : { url: `https://espplus.com/products?q=${product.name}`, kind: "search" },
}));

import {
  getOrder,
  getStatusCounts,
  listOrders,
  listOrdersForExport,
  markOrderRead,
  readItemsWithBackendLinks,
} from "@/app/admin/orders/queries";
import { KNOWN_STATUS_CSV, ORDERS_EXPORT_LIMIT, ORDERS_PAGE_SIZE } from "@/lib/adminOrders";

const HOSTILE = `x'; DROP TABLE submissions; --`;

beforeEach(() => {
  mocks.calls.length = 0;
  mocks.results.length = 0;
});

describe("admin order queries", () => {
  it("never puts user text into SQL: it travels only as a bound parameter", async () => {
    mocks.results.push([], [{ n: 0 }]);
    await listOrders({ q: HOSTILE, status: "paid", page: 1 });
    mocks.results.push([]);
    await getStatusCounts(HOSTILE);
    mocks.results.push([]);
    await listOrdersForExport({ q: HOSTILE, page: 1 });

    expect(mocks.calls).toHaveLength(4);
    for (const call of mocks.calls) {
      expect(call.text).not.toContain("DROP TABLE");
      expect(call.text).toContain("type = 'merch_order'");
      expect(call.values).toContain(`%${HOSTILE}%`);
    }
    // The status filter is bound too.
    expect(mocks.calls[0].values).toContain("paid");
  });

  it("caps the page size and offsets by page", async () => {
    mocks.results.push([], [{ n: 80 }]);
    const result = await listOrders({ q: "", page: 3 });
    expect(result.total).toBe(80);
    const list = mocks.calls[0];
    expect(list.text).toMatch(/LIMIT \$\?::int OFFSET \$\?::int/);
    expect(list.values).toContain(ORDERS_PAGE_SIZE);
    expect(list.values).toContain(2 * ORDERS_PAGE_SIZE);
  });

  it("caps exports", async () => {
    mocks.results.push([]);
    await listOrdersForExport({ q: "", page: 1 });
    expect(mocks.calls[0].values).toContain(ORDERS_EXPORT_LIMIT);
  });

  it("binds the order reference id for MG- searches", async () => {
    mocks.results.push([], [{ n: 0 }]);
    await listOrders({ q: "MG-00042", page: 1 });
    expect(mocks.calls[0].values).toContain(42);
  });

  it("passes the known-status string so junk statuses count as new", async () => {
    mocks.results.push([
      { status: "paid", n: 2 },
      { status: "new", n: 1 },
    ]);
    const { counts, all } = await getStatusCounts("");
    expect(mocks.calls[0].values).toContain(KNOWN_STATUS_CSV);
    expect(counts.paid).toBe(2);
    expect(all).toBe(3);
  });

  it("maps rows to records", async () => {
    mocks.results.push(
      [
        {
          id: "9",
          data: { firstName: "Pat" },
          created_at: new Date("2026-10-01T10:00:00.000Z"),
          read_at: null,
        },
      ],
      [{ n: 1 }]
    );
    const { records } = await listOrders({ q: "", page: 1 });
    expect(records).toEqual([
      { id: 9, createdAt: "2026-10-01T10:00:00.000Z", readAt: null, data: { firstName: "Pat" } },
    ]);
  });

  it("looks up one order by id and rejects ids that are not positive integers", async () => {
    expect(await getOrder(0)).toBeNull();
    expect(await getOrder(-3)).toBeNull();
    expect(await getOrder(1.5)).toBeNull();
    expect(await getOrder(Number.NaN)).toBeNull();
    expect(mocks.calls).toHaveLength(0);

    mocks.results.push([]);
    expect(await getOrder(42)).toBeNull();
    expect(mocks.calls[0].text).toContain("type = 'merch_order'");
    expect(mocks.calls[0].values).toContain(42);
  });

  it("marks an order read only when unread", async () => {
    mocks.results.push([]);
    await markOrderRead(5);
    expect(mocks.calls[0].text).toContain("read_at IS NULL");
  });

  it("keeps stamped ESP fields and backfills older lines from the ESP link data", () => {
    const items = readItemsWithBackendLinks({
      items: [
        { productId: "pen", name: "Pen", quantity: 1 },
        { productId: "mug", name: "Mug", quantity: 2 },
        {
          productId: "pen",
          name: "Pen",
          quantity: 3,
          espUrl: "https://espplus.com/products/stamped",
          espKind: "product",
          supplier: "Stamped Supplier",
        },
        { name: "No product id", quantity: 4 },
      ],
    });
    expect(items[0]).toMatchObject({
      espUrl: "https://espplus.com/products/555990121",
      espKind: "product",
      supplier: "Prime Line",
      productNo: "OD618",
    });
    expect(items[1]).toMatchObject({ espKind: "search" });
    expect(items[2]).toMatchObject({
      espUrl: "https://espplus.com/products/stamped",
      supplier: "Stamped Supplier",
    });
    expect(items[3].espUrl).toBeUndefined();
  });
});
