// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { FakeSubmissionsDb } from "./helpers/fakeSubmissionsDb";

const mocks = vi.hoisted(() => ({ admin: true, db: undefined as unknown as { sql: unknown } }));

vi.mock("@/lib/db", () => ({
  sql: (strings: TemplateStringsArray, ...values: unknown[]) =>
    (mocks.db.sql as (...args: unknown[]) => unknown)(strings, ...values),
}));
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: () => ({ value: "token" }) }),
}));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`REDIRECT:${url}`);
  },
}));
vi.mock("@/lib/adminAuth", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/adminAuth")>()),
  ADMIN_SESSION_COOKIE: "admin",
}));
vi.mock("@/lib/adminSessions", () => ({
  getVerifiedAdminSession: async () => (mocks.admin ? { username: "ben", issuedAt: 0 } : null),
}));

import { GET } from "@/app/admin/orders/[id]/files/[fileId]/route";
import {
  addOrderFile,
  getOrderFile,
  listOrderFiles,
  __resetOrderFilesForTests,
} from "@/lib/orderFiles";
import { middleware } from "@/middleware";

const PNG = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 9, 9, 9]);
const SVG = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>');
const PDF = Buffer.from("%PDF-1.7 test");

let db: FakeSubmissionsDb;
let pngId: number;
let svgId: number;
let pdfId: number;

const call = (orderId: number | string, fileId: number | string, query = "") =>
  GET(new Request(`https://site.test/admin/orders/${orderId}/files/${fileId}${query}`), {
    params: Promise.resolve({ id: String(orderId), fileId: String(fileId) }),
  });

beforeEach(async () => {
  mocks.admin = true;
  db = new FakeSubmissionsDb();
  mocks.db = db;
  __resetOrderFilesForTests();
  const add = async (filename: string, mime: string, bytes: Uint8Array) => {
    const result = await addOrderFile(7, { filename, mime, bytes });
    if (!result.ok) throw new Error("seed failed");
    return result.id;
  };
  pngId = await add("Logo Final.png", "image/png", PNG);
  svgId = await add("mark.svg", "image/svg+xml", SVG);
  pdfId = await add("vector.pdf", "application/pdf", PDF);
});

describe("order_files storage", () => {
  it("creates the table and index once, then lists metadata without bytes", async () => {
    expect(db.countQueries(/^CREATE TABLE IF NOT EXISTS order_files/)).toBe(1);
    const create = db.queries.find((q) => /^CREATE TABLE IF NOT EXISTS order_files/.test(q.text))!;
    // The shape the task asked for.
    expect(create.text).toContain("id SERIAL PRIMARY KEY");
    expect(create.text).toContain("order_id INTEGER NOT NULL");
    expect(create.text).toContain("filename TEXT NOT NULL");
    expect(create.text).toContain("mime TEXT NOT NULL");
    expect(create.text).toContain("size INTEGER NOT NULL");
    expect(create.text).toContain("data BYTEA NOT NULL");
    expect(create.text).toContain("created_at TIMESTAMPTZ NOT NULL DEFAULT now()");

    const files = await listOrderFiles(7);
    expect(files.map((f) => f.filename)).toEqual(["Logo Final.png", "mark.svg", "vector.pdf"]);
    expect(files[0]).toMatchObject({ mime: "image/png", size: PNG.length });
    expect(Object.keys(files[0])).not.toContain("data");
    expect(await listOrderFiles(8)).toEqual([]);
  });

  it("only hands a file out for the order it belongs to", async () => {
    expect(await getOrderFile(7, pngId)).toMatchObject({ filename: "Logo Final.png" });
    expect(await getOrderFile(8, pngId)).toBeNull();
    expect(await getOrderFile(7, 999)).toBeNull();
    expect([...(await getOrderFile(7, pngId))!.data]).toEqual([...PNG]);
  });

  it("passes every value as a bound parameter", () => {
    const insert = db.queries.find((q) => /^INSERT INTO order_files/.test(q.text))!;
    expect(insert.text).not.toContain("Logo Final");
    expect(insert.values).toContain("Logo Final.png");
  });
});

describe("GET /admin/orders/[id]/files/[fileId]", () => {
  it("is refused without an admin session and reveals nothing", async () => {
    mocks.admin = false;
    const response = await call(7, pngId);
    expect(response.status).toBe(401);
    expect(await response.text()).not.toMatch(/PNG|Logo Final/);
    expect(db.countQueries(/FROM order_files WHERE id/)).toBe(0);
    expect((await call(7, pngId, "?preview=1")).status).toBe(401);
  });

  it("downloads as an attachment, as octet-stream, with nosniff, whatever the file type", async () => {
    for (const [id, name] of [
      [pngId, "Logo Final.png"],
      [svgId, "mark.svg"],
      [pdfId, "vector.pdf"],
    ] as const) {
      const response = await call(7, id);
      expect(response.status).toBe(200);
      expect(response.headers.get("content-type")).toBe("application/octet-stream");
      expect(response.headers.get("content-disposition")).toMatch(/^attachment; /);
      expect(response.headers.get("content-disposition")).toContain(`filename="${name}"`);
      expect(response.headers.get("x-content-type-options")).toBe("nosniff");
      expect(response.headers.get("cache-control")).toBe("private, no-store");
      expect(response.headers.get("content-security-policy")).toContain("default-src 'none'");
    }
    const body = Buffer.from(await (await call(7, pngId)).arrayBuffer());
    expect([...body]).toEqual([...PNG]);
  });

  it("never serves an SVG as image/svg+xml or inline", async () => {
    const download = await call(7, svgId);
    expect(download.headers.get("content-type")).not.toMatch(/svg/);
    const preview = await call(7, svgId, "?preview=1");
    expect(preview.status).toBe(415);
    expect(preview.headers.get("content-type")).not.toMatch(/svg|image/);
    expect(preview.headers.get("content-disposition")).toBeNull();
  });

  it("offers a preview for raster images only, inline with a safe image type", async () => {
    const response = await call(7, pngId, "?preview=1");
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("image/png");
    expect(response.headers.get("content-disposition")).toMatch(/^inline; /);
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    expect((await call(7, pdfId, "?preview=1")).status).toBe(415);
  });

  it("encodes awkward file names in the header", async () => {
    const result = await addOrderFile(9, {
      filename: 'Café "Logo"\r\nX-Evil: 1.png',
      mime: "image/png",
      bytes: PNG,
    });
    if (!result.ok) throw new Error("seed failed");
    const header = (await call(9, result.id)).headers.get("content-disposition")!;
    expect(header).not.toMatch(/[\r\n]/);
    expect(header).toContain("filename*=UTF-8''");
    expect(header.match(/"/g)).toHaveLength(2);
  });

  it("answers 404 for another order's file, unknown ids and malformed ids", async () => {
    expect((await call(8, pngId)).status).toBe(404);
    expect((await call(7, 999)).status).toBe(404);
    expect((await call("7;DROP", pngId)).status).toBe(404);
    expect((await call(7, "1 OR 1=1")).status).toBe(404);
  });

  it("answers 500 without internals when the database fails", async () => {
    db.failNext(/encode\(data/);
    const response = await call(7, pngId);
    expect(response.status).toBe(500);
    expect(await response.text()).not.toMatch(/connection refused/);
  });
});

describe("no public access", () => {
  it("the admin file path is behind the admin sign-in middleware (redirects to login without a cookie)", () => {
    vi.stubEnv("ADMIN_SESSION_SECRET", "admin-session-FAKE-secret-0123456789");
    const response = middleware(new NextRequest(`https://site.test/admin/orders/7/files/${pngId}`));
    expect(response.status).toBeGreaterThanOrEqual(300);
    expect(response.status).toBeLessThan(400);
    expect(response.headers.get("location")).toMatch(/\/admin\/login$/);
    vi.unstubAllEnvs();
  });

  it("no route under /api serves stored logo files", async () => {
    const { readdirSync, readFileSync, statSync } = await import("node:fs");
    const { join } = await import("node:path");
    const offenders: string[] = [];
    const walk = (dir: string) => {
      for (const entry of readdirSync(dir)) {
        const full = join(dir, entry);
        if (statSync(full).isDirectory()) walk(full);
        else if (/route\.ts$/.test(entry) && /getOrderFile/.test(readFileSync(full, "utf8"))) {
          offenders.push(full);
        }
      }
    };
    walk(join(process.cwd(), "src/app/api"));
    walk(join(process.cwd(), "src/app/orders"));
    walk(join(process.cwd(), "src/app/account"));
    expect(offenders).toEqual([]);
  });
});
