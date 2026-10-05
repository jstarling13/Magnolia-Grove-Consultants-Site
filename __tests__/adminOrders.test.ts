// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  ATTENTION_LABELS,
  KNOWN_STATUS_CSV,
  ORDERS_PAGE_SIZE,
  buildOrderSheetText,
  buildOrderTimeline,
  buildOrdersCsv,
  buildSearchParts,
  computeAttentionFlags,
  csvCell,
  escapeLikePattern,
  formatAge,
  normalizeStatus,
  orderFilterToQuery,
  paginate,
  parseOrderFilter,
  parseOrderReference,
  readOrderItems,
  safeHttpUrl,
  summarizeItems,
  tallyStatusCounts,
  toOrderListItem,
  type OrderRecord,
} from "@/lib/adminOrders";
import { MERCH_ORDER_STATUSES } from "@/lib/merchOrders";

const NOW = Date.parse("2026-10-10T12:00:00.000Z");
const DAY = 24 * 60 * 60 * 1000;
const ago = (ms: number) => new Date(NOW - ms).toISOString();

function flagCodes(data: Record<string, unknown>, createdAt = ago(60_000)) {
  return computeAttentionFlags({ createdAt, data }, NOW).map((flag) => flag.code);
}

describe("computeAttentionFlags", () => {
  it("flags a paid order that has not been ordered in ESP", () => {
    expect(flagCodes({ status: "paid", paidAt: ago(DAY) })).toEqual(["paid_not_ordered"]);
  });

  it("does not flag paid orders once ESP is recorded or the order shipped", () => {
    expect(flagCodes({ status: "ordered_in_esp", paidAt: ago(DAY) })).toEqual([]);
    expect(flagCodes({ status: "paid", paidAt: ago(DAY), espOrderNumber: "ESP-1" })).toEqual([]);
    expect(
      flagCodes({
        status: "fulfilled",
        paidAt: ago(DAY),
        trackingNumber: "1Z999AA1",
        shippedAt: ago(1),
      })
    ).toEqual([]);
  });

  it("flags awaiting payment only after more than 3 days (from the quote time)", () => {
    const created = ago(10 * DAY);
    expect(
      flagCodes(
        { status: "awaiting_payment", quotedAt: ago(3 * DAY + 60_000), paymentUrl: "https://x" },
        created
      )
    ).toEqual(["awaiting_payment_stale"]);
    expect(
      flagCodes(
        { status: "awaiting_payment", quotedAt: ago(3 * DAY), paymentUrl: "https://x" },
        created
      )
    ).toEqual([]);
    expect(
      flagCodes(
        { status: "awaiting_payment", quotedAt: ago(DAY), paymentUrl: "https://x" },
        created
      )
    ).toEqual([]);
  });

  it("falls back to the created time when an awaiting order has no quotedAt", () => {
    expect(flagCodes({ status: "awaiting_payment" }, ago(4 * DAY))).toEqual([
      "awaiting_payment_stale",
    ]);
  });

  it("flags new orders only after more than a day", () => {
    expect(flagCodes({ status: "new" }, ago(DAY + 1000))).toEqual(["new_stale"]);
    expect(flagCodes({ status: "new" }, ago(DAY))).toEqual([]);
    expect(flagCodes({ status: "new" }, ago(2 * 60 * 60 * 1000))).toEqual([]);
    // Missing/unknown status counts as new.
    expect(flagCodes({}, ago(2 * DAY))).toEqual(["new_stale"]);
    expect(flagCodes({ status: "mystery" }, ago(2 * DAY))).toEqual(["new_stale"]);
  });

  it("flags quoted orders with no payment link", () => {
    expect(flagCodes({ status: "quoted" })).toEqual(["quoted_no_link"]);
    expect(flagCodes({ status: "quoted", paymentUrl: "  " })).toEqual(["quoted_no_link"]);
    expect(flagCodes({ status: "quoted", paymentUrl: "https://square.link/u/a" })).toEqual([]);
  });

  it("flags shipped orders without tracking", () => {
    expect(flagCodes({ status: "fulfilled", paidAt: ago(DAY), espOrderedAt: ago(DAY) })).toEqual([
      "shipped_no_tracking",
    ]);
    expect(
      flagCodes({ status: "fulfilled", paidAt: ago(DAY), shippedAt: ago(1), carrier: "UPS" })
    ).toEqual(["shipped_no_tracking"]);
  });

  it("never flags cancelled orders and can raise several flags at once", () => {
    expect(flagCodes({ status: "cancelled", paidAt: ago(DAY) })).toEqual([]);
    expect(flagCodes({ status: "paid", paidAt: ago(DAY), shippedAt: ago(1) })).toEqual([
      "paid_not_ordered",
      "shipped_no_tracking",
    ]);
  });

  it("stays quiet about time-based flags when the timestamp is unusable", () => {
    expect(flagCodes({ status: "new" }, "not a date")).toEqual([]);
  });

  it("attaches the human label", () => {
    const [flag] = computeAttentionFlags(
      { createdAt: ago(1), data: { status: "paid", paidAt: ago(1) } },
      NOW
    );
    expect(flag.label).toBe(ATTENTION_LABELS.paid_not_ordered);
  });
});

describe("buildOrderTimeline", () => {
  it("shows every stored step with its time and the rest as pending", () => {
    const steps = buildOrderTimeline("2026-10-01T10:00:00.000Z", {
      status: "awaiting_payment",
      quotedAt: "2026-10-02T10:00:00.000Z",
      quotedTotal: 912.5,
      paymentUrl: "https://square.link/u/abc",
    });
    expect(steps.map((s) => [s.key, s.done])).toEqual([
      ["created", true],
      ["quoted", true],
      ["link_sent", true],
      ["paid", false],
      ["esp_ordered", false],
      ["shipped", false],
    ]);
    expect(steps[1]).toMatchObject({ at: "2026-10-02T10:00:00.000Z", detail: "$912.50" });
    expect(steps[2].at).toBe("2026-10-02T10:00:00.000Z");
    expect(steps[3].at).toBeUndefined();
  });

  it("records manual payment, ESP order and shipment details", () => {
    const steps = buildOrderTimeline("2026-10-01T10:00:00.000Z", {
      status: "fulfilled",
      quotedAt: "2026-10-02T10:00:00.000Z",
      quotedTotal: 100,
      paymentUrl: "https://square.link/u/abc",
      paidAt: "2026-10-03T10:00:00.000Z",
      paidManually: true,
      espOrderedAt: "2026-10-04T10:00:00.000Z",
      espOrderNumber: "ESP-77",
      shippedAt: "2026-10-05T10:00:00.000Z",
      carrier: "UPS",
      trackingNumber: "1Z999AA1",
    });
    expect(steps.every((s) => s.done)).toBe(true);
    expect(steps.find((s) => s.key === "paid")?.detail).toMatch(/manually/i);
    expect(steps.find((s) => s.key === "esp_ordered")?.detail).toBe("ESP order ESP-77");
    expect(steps.find((s) => s.key === "shipped")).toMatchObject({
      at: "2026-10-05T10:00:00.000Z",
      detail: "UPS 1Z999AA1",
    });
  });

  it("does not invent times: a done step without a stored time has no date", () => {
    const steps = buildOrderTimeline("2026-10-01T10:00:00.000Z", { status: "ordered_in_esp" });
    const esp = steps.find((s) => s.key === "esp_ordered");
    expect(esp?.done).toBe(true);
    expect(esp?.at).toBeUndefined();
  });

  it("adds a cancelled step without a timestamp", () => {
    const steps = buildOrderTimeline("2026-10-01T10:00:00.000Z", { status: "cancelled" });
    expect(steps[steps.length - 1]).toEqual({ key: "cancelled", label: "Cancelled", done: true });
  });
});

describe("CSV", () => {
  it("escapes commas, quotes and line breaks", () => {
    expect(csvCell("plain")).toBe("plain");
    expect(csvCell("a,b")).toBe('"a,b"');
    expect(csvCell('say "hi"')).toBe('"say ""hi"""');
    expect(csvCell("two\nlines")).toBe('"two\nlines"');
    expect(csvCell(null)).toBe("");
    expect(csvCell(undefined)).toBe("");
    expect(csvCell(12.5)).toBe("12.5");
  });

  it("neutralizes spreadsheet formula injection", () => {
    expect(csvCell('=HYPERLINK("http://evil")')).toBe(`"'=HYPERLINK(""http://evil"")"`);
    expect(csvCell("+1 706 555 0100")).toBe("'+1 706 555 0100");
    expect(csvCell("-2+3")).toBe("'-2+3");
    expect(csvCell("@SUM(A1)")).toBe("'@SUM(A1)");
    expect(csvCell("\t=1+1")).toBe("'\t=1+1");
    expect(csvCell("\r=1+1")).toBe(`"'\r=1+1"`);
    // Only a leading character matters.
    expect(csvCell("a=b")).toBe("a=b");
  });

  const record: OrderRecord = {
    id: 42,
    createdAt: "2026-10-01T10:00:00.000Z",
    data: {
      firstName: "=cmd",
      lastName: "Lee",
      email: "pat@example.com",
      phone: "+1 706 555 0100",
      status: "fulfilled",
      total: 500,
      quotedTotal: 912.5,
      paidAt: "2026-10-03T10:00:00.000Z",
      shippedAt: "2026-10-05T10:00:00.000Z",
      carrier: "UPS",
      trackingNumber: "1Z999AA1",
      items: [
        {
          productId: "pen",
          name: "Metal, Pen",
          color: "Navy",
          quantity: 250,
          unitPrice: 1.5,
          lineTotal: 375,
          espUrl: "https://espplus.com/products/555990121",
          supplier: "Prime Line",
          productNo: "OD618",
        },
        { productId: "mug", name: "Mug", quantity: 100, unitPrice: 5, lineTotal: 500 },
      ],
    },
  };

  it("builds the requested columns and never includes ESP data", () => {
    const csv = buildOrdersCsv([record]);
    const [header, row] = csv.trimEnd().split("\r\n");
    expect(header).toBe(
      "ref,created,customer,email,phone,items,total,status,paidAt,shippedAt,carrier,tracking"
    );
    expect(row).toBe(
      [
        "MG-00042",
        "2026-10-01T10:00:00.000Z",
        "'=cmd Lee",
        "pat@example.com",
        "'+1 706 555 0100",
        '"Metal, Pen x 250 (Navy); Mug x 100"',
        "912.50",
        "Fulfilled",
        "2026-10-03T10:00:00.000Z",
        "2026-10-05T10:00:00.000Z",
        "UPS",
        "1Z999AA1",
      ].join(",")
    );
    expect(csv).not.toMatch(/espplus|Prime Line|OD618|supplier/i);
    expect(csv.endsWith("\r\n")).toBe(true);
  });

  it("uses the cart estimate when there is no quote and handles quote-request orders", () => {
    const csv = buildOrdersCsv([
      {
        id: 7,
        createdAt: "2026-10-01T10:00:00.000Z",
        data: { firstName: "A", lastName: "B", total: 50, product: "Koozies", quantity: "300" },
      },
    ]);
    const row = csv.trimEnd().split("\r\n")[1].split(",");
    expect(row[5]).toBe("Koozies x 300");
    expect(row[6]).toBe("50.00");
    expect(row[7]).toBe("New");
  });

  it("returns just the header for no rows", () => {
    expect(buildOrdersCsv([])).toBe(
      "ref,created,customer,email,phone,items,total,status,paidAt,shippedAt,carrier,tracking\r\n"
    );
  });
});

describe("filter parsing", () => {
  it("reads status, search and page from search params", () => {
    expect(parseOrderFilter({ status: "paid", q: "  pat  ", page: "3" })).toEqual({
      status: "paid",
      q: "pat",
      page: 3,
    });
    expect(parseOrderFilter(new URLSearchParams("status=quoted&q=MG-42"))).toEqual({
      status: "quoted",
      q: "MG-42",
      page: 1,
    });
  });

  it("rejects bad input", () => {
    expect(parseOrderFilter({ status: "drop table", page: "-4" })).toEqual({ q: "", page: 1 });
    expect(parseOrderFilter({ page: "abc" }).page).toBe(1);
    expect(parseOrderFilter({ page: "999999999" }).page).toBe(2000);
    expect(parseOrderFilter({ q: "a".repeat(500) }).q).toHaveLength(100);
    expect(parseOrderFilter({ q: "a\u0000b\nc" }).q).toBe("a b c");
    expect(parseOrderFilter({ status: ["paid", "new"] }).status).toBe("paid");
  });

  it("round-trips through a query string", () => {
    expect(orderFilterToQuery({ status: "paid", q: "pat lee", page: 2 })).toBe(
      "status=paid&q=pat+lee&page=2"
    );
    expect(orderFilterToQuery({ page: 1, q: "" })).toBe("");
  });

  it("recognizes order references and escapes LIKE wildcards", () => {
    expect(parseOrderReference("MG-00042")).toBe(42);
    expect(parseOrderReference("mg42")).toBe(42);
    expect(parseOrderReference("MG-")).toBeUndefined();
    expect(parseOrderReference("42")).toBeUndefined();
    expect(parseOrderReference("MG-1234567890123")).toBeUndefined();
    expect(escapeLikePattern("50%_off\\")).toBe("50\\%\\_off\\\\");
    expect(buildSearchParts("")).toEqual({ pattern: null, refId: null });
    expect(buildSearchParts("MG-00042")).toEqual({ pattern: "%MG-00042%", refId: 42 });
    expect(buildSearchParts("100%")).toEqual({ pattern: "%100\\%%", refId: null });
  });

  it("lists every known status in the SQL helper string", () => {
    for (const status of MERCH_ORDER_STATUSES) expect(KNOWN_STATUS_CSV).toContain(`,${status},`);
  });
});

describe("pagination", () => {
  it("computes ranges and clamps the page", () => {
    expect(paginate(60, 1)).toMatchObject({
      pageCount: 3,
      from: 1,
      to: 25,
      hasPrev: false,
      hasNext: true,
    });
    expect(paginate(60, 3)).toMatchObject({
      page: 3,
      from: 51,
      to: 60,
      hasNext: false,
      hasPrev: true,
    });
    expect(paginate(60, 9).page).toBe(3);
    expect(paginate(0, 1)).toMatchObject({ pageCount: 1, from: 0, to: 0, hasNext: false });
    expect(ORDERS_PAGE_SIZE).toBe(25);
  });
});

describe("status tallies", () => {
  it("folds null and unknown statuses into New and totals everything", () => {
    const { counts, all } = tallyStatusCounts([
      { status: "paid", n: 2 },
      { status: null, n: 1 },
      { status: "weird", n: 3 },
      { status: "new", n: "4" },
    ]);
    expect(counts.paid).toBe(2);
    expect(counts.new).toBe(8);
    expect(counts.cancelled).toBe(0);
    expect(all).toBe(10);
  });

  it("normalizes statuses", () => {
    expect(normalizeStatus("paid")).toBe("paid");
    expect(normalizeStatus(undefined)).toBe("new");
    expect(normalizeStatus("nope")).toBe("new");
  });
});

describe("list view model", () => {
  it("summarizes a cart order", () => {
    const item = toOrderListItem(
      {
        id: 42,
        createdAt: ago(3 * DAY),
        readAt: null,
        data: {
          firstName: "Pat",
          lastName: "Lee",
          email: "pat@example.com",
          status: "quoted",
          total: 500,
          items: [
            { name: "Pen", quantity: 250 },
            { name: "Mug", quantity: 100 },
          ],
        },
      },
      NOW
    );
    expect(item).toMatchObject({
      reference: "MG-00042",
      customer: "Pat Lee",
      status: "quoted",
      statusLabel: "Quoted",
      itemsLabel: "2 items",
      itemsDetail: "350 units",
      totalLabel: "$500.00",
      totalIsEstimate: true,
      age: "3d",
      unread: true,
    });
    expect(item.flags.map((f) => f.code)).toEqual(["quoted_no_link"]);
  });

  it("prefers the quoted total and falls back to the product text for quote requests", () => {
    const item = toOrderListItem(
      {
        id: 5,
        createdAt: ago(60_000),
        readAt: ago(1),
        data: { product: "Koozies", quantity: "300", total: 10, quotedTotal: 99, items: [] },
      },
      NOW
    );
    expect(item).toMatchObject({
      itemsLabel: "Koozies",
      itemsDetail: "Qty 300",
      totalLabel: "$99.00",
      totalIsEstimate: false,
      unread: false,
    });
  });

  it("formats ages", () => {
    expect(formatAge(ago(5 * 60_000), NOW)).toBe("5m");
    expect(formatAge(ago(5 * 3_600_000), NOW)).toBe("5h");
    expect(formatAge(ago(3 * DAY), NOW)).toBe("3d");
    expect(formatAge(ago(21 * DAY), NOW)).toBe("3w");
    expect(formatAge("nope", NOW)).toBe("");
  });
});

describe("items and the order sheet", () => {
  const data = {
    firstName: "Pat",
    lastName: "Lee",
    email: "pat@example.com",
    phone: "706-555-0100",
    notes: "Rush if possible",
    quotedTotal: 912.5,
    items: [
      {
        productId: "pen",
        name: "Metal Pen",
        color: "Navy",
        quantity: 250,
        espUrl: "https://espplus.com/products/555990121",
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
      { name: "", quantity: 1 },
      { name: "Bad", quantity: "x" },
      null,
    ],
  };

  it("keeps valid lines only", () => {
    const items = readOrderItems(data);
    expect(items.map((i) => i.name)).toEqual(["Metal Pen", "Mug"]);
    expect(readOrderItems({})).toEqual([]);
    expect(summarizeItems(data)).toBe("Metal Pen x 250 (Navy); Mug x 100");
  });

  it("builds a copyable sheet with contact, colors, ESP links and notes", () => {
    const sheet = buildOrderSheetText({
      id: 42,
      createdAt: "2026-10-01T14:00:00.000Z",
      data,
      items: readOrderItems(data),
    });
    expect(sheet).toContain("Backend order sheet - MG-00042");
    expect(sheet).toContain("Placed: Oct 1, 2026, 10:00 AM");
    expect(sheet).toContain("Name: Pat Lee");
    expect(sheet).toContain("Email: pat@example.com");
    expect(sheet).toContain("Phone: 706-555-0100");
    expect(sheet).toContain("1. 250 x Metal Pen");
    expect(sheet).toContain("Color: Navy");
    expect(sheet).toContain("ESP+ link: https://espplus.com/products/555990121");
    expect(sheet).toContain("ESP+ link: https://espplus.com/products?q=Mug (search link)");
    expect(sheet).toContain("Color: not specified");
    expect(sheet).toContain("Supplier: Prime Line");
    expect(sheet).toContain("Product no.: OD618");
    expect(sheet).toContain("Customer notes: Rush if possible");
    expect(sheet).toContain("Quoted total: $912.50");
  });

  it("only turns http(s) URLs into links", () => {
    expect(safeHttpUrl("https://espplus.com/products/1")).toBe("https://espplus.com/products/1");
    expect(safeHttpUrl("javascript:alert(1)")).toBeUndefined();
    expect(safeHttpUrl("")).toBeUndefined();
    expect(safeHttpUrl(undefined)).toBeUndefined();
  });
});
