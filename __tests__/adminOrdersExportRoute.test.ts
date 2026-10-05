// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  admin: true,
  records: [] as unknown[],
  filters: [] as unknown[],
  fail: false,
}));

vi.mock("next/headers", () => ({
  cookies: async () => ({ get: () => ({ value: "token" }) }),
}));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`REDIRECT:${url}`);
  },
}));
vi.mock("@/lib/adminAuth", () => ({
  ADMIN_SESSION_COOKIE: "admin",
  verifySessionToken: () => (mocks.admin ? { username: "ben" } : null),
}));
vi.mock("@/app/admin/orders/queries", () => ({
  listOrdersForExport: async (filter: unknown) => {
    mocks.filters.push(filter);
    if (mocks.fail) throw new Error("db down");
    return mocks.records;
  },
}));

import { GET } from "@/app/admin/orders/export/route";
import { requireAdminPage } from "@/app/admin/orders/guard";

beforeEach(() => {
  mocks.admin = true;
  mocks.fail = false;
  mocks.records = [];
  mocks.filters.length = 0;
});

describe("GET /admin/orders/export", () => {
  it("rejects requests without an admin session and never queries", async () => {
    mocks.admin = false;
    const response = await GET(new Request("https://example.com/admin/orders/export"));
    expect(response.status).toBe(401);
    expect(mocks.filters).toHaveLength(0);
    expect(await response.text()).not.toContain("MG-");
  });

  it("returns a CSV attachment for the current filter", async () => {
    mocks.records = [
      {
        id: 42,
        createdAt: "2026-10-01T10:00:00.000Z",
        data: { firstName: "=Evil", lastName: "Lee", status: "paid", quotedTotal: 10 },
      },
    ];
    const response = await GET(
      new Request("https://example.com/admin/orders/export?status=paid&q=lee&page=4")
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/csv");
    expect(response.headers.get("content-disposition")).toMatch(
      /^attachment; filename="merch-orders-paid-\d{4}-\d{2}-\d{2}\.csv"$/
    );
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(mocks.filters[0]).toEqual({ status: "paid", q: "lee", page: 4 });
    const bytes = new Uint8Array(await response.clone().arrayBuffer());
    // UTF-8 byte order mark so Excel reads the file as UTF-8.
    expect([...bytes.slice(0, 3)]).toEqual([0xef, 0xbb, 0xbf]);
    const body = await response.text();
    expect(body).toContain("ref,created,customer");
    expect(body).toContain("MG-00042");
    expect(body).toContain("'=Evil Lee");
  });

  it("ignores junk filter values", async () => {
    await GET(new Request("https://example.com/admin/orders/export?status=bogus"));
    expect(mocks.filters[0]).toEqual({ q: "", page: 1 });
  });

  it("fails closed with a generic error when the query throws", async () => {
    mocks.fail = true;
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const response = await GET(new Request("https://example.com/admin/orders/export"));
    expect(response.status).toBe(500);
    expect(await response.text()).not.toContain("db down");
    spy.mockRestore();
  });
});

describe("requireAdminPage", () => {
  it("sends signed-out visitors to the login screen", async () => {
    mocks.admin = false;
    await expect(requireAdminPage()).rejects.toThrow("REDIRECT:/admin/login");
  });

  it("returns the session for an admin", async () => {
    await expect(requireAdminPage()).resolves.toEqual({ username: "ben" });
  });
});
