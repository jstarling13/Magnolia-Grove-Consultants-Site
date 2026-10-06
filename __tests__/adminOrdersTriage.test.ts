// @vitest-environment node
/**
 * Day-to-day order handling: sort, the "needs action" views, search by company,
 * the ESP+ reorder text and the CSV export of the filtered list.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  calls: [] as { text: string; values: unknown[] }[],
  results: [] as unknown[][],
  admin: true,
  records: [] as unknown[],
  filters: [] as unknown[],
}));

vi.mock("@/lib/db", () => ({
  sql: async (strings: TemplateStringsArray, ...values: unknown[]) => {
    mocks.calls.push({ text: strings.join("$?"), values });
    return mocks.results.shift() ?? [];
  },
}));
vi.mock("@/lib/espLinks", () => ({
  getEspLink: () => ({ url: "https://espplus.com/x", kind: "search" }),
}));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => ({ value: "token" }) }) }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
vi.mock("@/lib/adminAuth", () => ({ ADMIN_SESSION_COOKIE: "admin" }));
vi.mock("@/lib/adminSessions", () => ({
  getVerifiedAdminSession: async () => (mocks.admin ? { username: "ben", issuedAt: 0 } : null),
}));

import {
  buildOrdersCsv,
  isPaidNotOrdered,
  matchesOrderView,
  orderFilterToQuery,
  parseOrderFilter,
  readOrderItems,
} from "@/lib/adminOrders";
import { buildEspReorderText } from "@/lib/merchBackendSheet";
import { getActionCounts, listOrders, listOrdersForExport } from "@/app/admin/orders/queries";
import { GET } from "@/app/admin/orders/export/route";

beforeEach(() => {
  mocks.calls.length = 0;
  mocks.results.length = 0;
  mocks.admin = true;
});

describe("filter: sort and needs-action view", () => {
  it("parses sort and view, dropping junk and the default sort", () => {
    expect(parseOrderFilter(new URLSearchParams("sort=largest&view=action"))).toEqual({
      q: "",
      page: 1,
      sort: "largest",
      view: "action",
    });
    expect(
      parseOrderFilter(new URLSearchParams("sort=oldest&view=paid_not_ordered"))
    ).toMatchObject({
      sort: "oldest",
      view: "paid_not_ordered",
    });
    expect(parseOrderFilter(new URLSearchParams("sort=newest"))).toEqual({ q: "", page: 1 });
    expect(parseOrderFilter(new URLSearchParams("sort=bogus&view=%27%3BDROP"))).toEqual({
      q: "",
      page: 1,
    });
  });

  it("round-trips through the query string", () => {
    const filter = {
      status: "paid" as const,
      view: "action" as const,
      q: "mug",
      sort: "largest" as const,
      page: 2,
    };
    expect(parseOrderFilter(new URLSearchParams(orderFilterToQuery(filter)))).toEqual(filter);
    expect(orderFilterToQuery({ sort: "newest" })).toBe("");
  });
});

describe("needs-action definition", () => {
  const paid = { status: "paid", paidAt: "2026-10-01T00:00:00.000Z" };
  it("paid-not-ordered: paid, no ESP record, not finished or cancelled", () => {
    expect(isPaidNotOrdered(paid)).toBe(true);
    expect(isPaidNotOrdered({ ...paid, espOrderNumber: "PO-1" })).toBe(false);
    expect(isPaidNotOrdered({ ...paid, espOrderedAt: "2026-10-02T00:00:00.000Z" })).toBe(false);
    expect(isPaidNotOrdered({ ...paid, status: "ordered_in_esp" })).toBe(false);
    expect(isPaidNotOrdered({ ...paid, status: "fulfilled" })).toBe(false);
    expect(isPaidNotOrdered({ ...paid, status: "cancelled" })).toBe(false);
    expect(isPaidNotOrdered({ status: "awaiting_payment" })).toBe(false);
  });

  it("the action view is new orders plus paid-not-ordered", () => {
    expect(matchesOrderView({ status: "new" }, "action")).toBe(true);
    expect(matchesOrderView({}, "action")).toBe(true); // missing status counts as new
    expect(matchesOrderView(paid, "action")).toBe(true);
    expect(matchesOrderView({ status: "quoted" }, "action")).toBe(false);
    expect(matchesOrderView({ status: "new" }, "paid_not_ordered")).toBe(false);
    expect(matchesOrderView(paid, "paid_not_ordered")).toBe(true);
  });
});

describe("queries", () => {
  it("binds sort and view as parameters and orders by them", async () => {
    mocks.results.push([], [{ n: 0 }]);
    await listOrders({ q: "", page: 1, sort: "largest", view: "action" });
    const list = mocks.calls[0];
    expect(list.values).toContain("largest");
    expect(list.values).toContain("action");
    expect(list.text).toMatch(/ORDER BY/);
    expect(list.text).toContain("quotedTotal");
    expect(mocks.calls[1].values).toContain("action"); // the total count uses the same view
  });

  it("defaults to newest and the export honours sort and view", async () => {
    mocks.results.push([], [{ n: 0 }]);
    await listOrders({ q: "", page: 1 });
    expect(mocks.calls[0].values).toContain("newest");
    expect(mocks.calls[0].values).toContain(null); // no view

    mocks.results.push([]);
    await listOrdersForExport({ q: "", page: 1, sort: "oldest", view: "paid_not_ordered" });
    expect(mocks.calls[2].values).toEqual(expect.arrayContaining(["oldest", "paid_not_ordered"]));
  });

  it("searches the company field as well", async () => {
    mocks.results.push([], [{ n: 0 }]);
    await listOrders({ q: "Acme", page: 1 });
    expect(mocks.calls[0].text).toContain("data->>'company' ILIKE");
  });

  it("counts action orders for the current search", async () => {
    mocks.results.push([{ action: 5, paid_not_ordered: "2" }]);
    expect(await getActionCounts("acme")).toEqual({ action: 5, paidNotOrdered: 2 });
    expect(mocks.calls[0].values).toContain("%acme%");
    mocks.results.push([]);
    expect(await getActionCounts("")).toEqual({ action: 0, paidNotOrdered: 0 });
  });
});

describe("CSV export of the filtered list", () => {
  const order = {
    id: 42,
    createdAt: "2026-10-01T10:00:00.000Z",
    data: {
      firstName: "Pat",
      lastName: "Lee",
      email: "pat@example.com",
      status: "fulfilled",
      quotedTotal: 912.5,
      paidAt: "2026-10-02T10:00:00.000Z",
      carrier: "UPS",
      trackingNumber: "1Z999AA10123456784",
      espOrderNumber: "PO-SECRET-1",
      paymentUrl: "https://checkout.square.test/pay/SECRET",
      paymentLinkId: "LINK_SECRET",
      auditLog: [{ at: "2026-10-02T10:00:00.000Z", by: "ben", kind: "status" }],
      items: [
        {
          name: "Pen",
          quantity: 250,
          espUrl: "https://espplus.com/products/1",
          supplier: "Prime Line",
          productNo: "OD618",
        },
      ],
    },
  };

  it("has reference, date, status, customer, total, paid date and tracking", () => {
    const [header, row] = buildOrdersCsv([order]).trim().split("\r\n");
    expect(header.split(",")).toEqual(
      expect.arrayContaining([
        "ref",
        "created",
        "status",
        "customer",
        "total",
        "paidAt",
        "tracking",
      ])
    );
    expect(row).toContain("MG-00042");
    expect(row).toContain("Fulfilled");
    expect(row).toContain("912.50");
    expect(row).toContain("2026-10-02T10:00:00.000Z");
    expect(row).toContain("1Z999AA10123456784");
  });

  it("never includes supplier, ESP, payment-link or audit data", () => {
    const csv = buildOrdersCsv([order]);
    for (const secret of [
      "PO-SECRET-1",
      "SECRET",
      "LINK_SECRET",
      "espplus",
      "Prime Line",
      "OD618",
      "auditLog",
    ]) {
      expect(csv).not.toContain(secret);
    }
  });

  it("route passes the whole filter, including view and sort, and names the file for the view", async () => {
    mocks.results.push([]);
    const response = await GET(
      new Request("https://example.com/admin/orders/export?view=action&sort=largest&q=acme&page=3")
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("content-disposition")).toMatch(
      /merch-orders-action-\d{4}-\d{2}-\d{2}\.csv/
    );
    // The query ran with the parsed filter (bound, not inlined).
    expect(mocks.calls[0].values).toEqual(expect.arrayContaining(["largest", "action", "%acme%"]));
  });

  it("route refuses without an admin session", async () => {
    mocks.admin = false;
    const response = await GET(new Request("https://example.com/admin/orders/export"));
    expect(response.status).toBe(401);
    expect(mocks.calls).toHaveLength(0);
  });
});

describe("ESP+ reorder text", () => {
  const items = readOrderItems({
    items: [
      {
        name: "Nike Polo",
        color: "Navy",
        quantity: 72,
        sizes: "24 M, 24 L, 24 XL",
        imprintNotes: "Left chest, white ink",
        espUrl: "https://espplus.com/products/555",
        espKind: "product",
        supplier: "Prime Line",
        productNo: "OD618",
      },
      {
        name: "Mug",
        quantity: 100,
        espUrl: "https://espplus.com/products?q=Mug",
        espKind: "search",
      },
      { name: "Old line", quantity: 5 },
    ],
  });

  it("lists product, color, quantity, sizes, imprint notes and the ESP+ link per line", () => {
    const text = buildEspReorderText("MG-00007", items);
    expect(text).toContain("ESP+ reorder - MG-00007");
    expect(text).toContain("1. Nike Polo");
    expect(text).toContain("Color: Navy");
    expect(text).toContain("Quantity: 72");
    expect(text).toContain("Sizes: 24 M, 24 L, 24 XL");
    expect(text).toContain("Imprint notes: Left chest, white ink");
    expect(text).toContain("ESP+ link: https://espplus.com/products/555");
    expect(text).toContain("Supplier: Prime Line");
    expect(text).toContain("Product no.: OD618");
  });

  it("is honest about missing details and search-only links", () => {
    const text = buildEspReorderText("MG-00007", items);
    expect(text).toContain("2. Mug");
    expect(text).toContain("Color: not specified");
    expect(text).toContain("(search link, find the exact product)");
    expect(text).toContain("3. Old line");
    expect(text).toContain("ESP+ link: none on file");
    expect(text).toContain("Sizes: none given");
  });

  it("carries no customer contact details or prices", () => {
    const text = buildEspReorderText("MG-00007", items);
    expect(text).not.toMatch(/@|\$|phone|email/i);
  });
});
