// @vitest-environment node
/**
 * The logo attachment flow, end to end against the real route code with the
 * outside world faked (same harness as the order lifecycle test):
 *
 *   1. POST /api/merchant/cart-checkout (JSON, hasLogo: true) -> order + upload token
 *   2. POST /api/merchant/order-logo (multipart, orderRef + token + file)
 *
 * The order always stands; every logo failure leaves it untouched.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { createResendModuleMock } from "../helpers/emailOutbox";
import {
  ADMIN_COOKIE_NAME,
  BACKEND_LEAK_PATTERN,
  advanceClock,
  beginTest,
  cartBody,
  cartRequest,
  endTest,
  loadApp,
  placeOrder,
  world,
  type App,
} from "../helpers/lifecycleHarness";
import { MAX_LOGO_BYTES } from "@/lib/orderLogo";
import { LOGO_UPLOAD_TOKEN_TTL_MS } from "@/lib/orderLogoToken";

vi.mock("@/lib/db", () => ({
  sql: (strings: TemplateStringsArray, ...values: unknown[]) => world.db.sql(strings, ...values),
}));
vi.mock("@/lib/ratelimit", () => ({
  checkRateLimit: (identifier: string) => world.limiter.check(identifier),
}));
vi.mock("resend", () => createResendModuleMock(() => world.outbox));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) =>
      name === ADMIN_COOKIE_NAME && world.adminCookie
        ? { name, value: world.adminCookie }
        : undefined,
  }),
}));

const PNG = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3, 4]);
const SVG = Buffer.from(
  '<svg xmlns="http://www.w3.org/2000/svg"><rect width="1" height="1"/></svg>'
);

let app: App;
let route: (request: NextRequest) => Promise<Response>;
/** Accepts the pending request from uploadRequest so call sites stay short. */
const upload = async (request: Promise<NextRequest> | NextRequest) => route(await request);
let routeModule: Record<string, unknown>;

beforeEach(async () => {
  beginTest();
  app = await loadApp();
  routeModule = (await import("@/app/api/merchant/order-logo/route")) as Record<string, unknown>;
  route = routeModule.POST as typeof route;
});
afterEach(endTest);

/** The order-creation step the browser performs first, returning what it needs for step two. */
async function placeOrderWithLogo(overrides: Record<string, unknown> = {}) {
  const response = await app.checkout(cartRequest(cartBody({ hasLogo: true, ...overrides })));
  const json = (await response.json()) as {
    success: boolean;
    orderRef: string;
    logoUploadToken?: string;
  };
  expect(response.status).toBe(200);
  return {
    orderRef: json.orderRef,
    token: json.logoUploadToken as string,
    id: Number(json.orderRef.replace(/^MG-0*/, "")),
  };
}

interface UploadOptions {
  orderRef?: string;
  token?: string;
  file?: { name: string; data: Uint8Array | Buffer; type?: string } | null;
  ip?: string;
  extra?: [string, string | Blob][];
}

async function uploadRequest(options: UploadOptions): Promise<NextRequest> {
  const form = new FormData();
  if (options.orderRef !== undefined) form.append("orderRef", options.orderRef);
  if (options.token !== undefined) form.append("token", options.token);
  if (options.file !== null) {
    const file = options.file ?? { name: "logo.png", data: PNG };
    form.append(
      "file",
      new Blob([new Uint8Array(file.data)], { type: file.type ?? "application/octet-stream" }),
      file.name
    );
  }
  for (const [name, value] of options.extra ?? []) form.append(name, value);
  // Serialize to plain bytes first: handing a FormData straight to a Request makes undici
  // keep feeding a stream the route has already cancelled when it refuses an oversize body.
  const encoded = new Response(form);
  return new NextRequest("http://localhost/api/merchant/order-logo", {
    method: "POST",
    headers: {
      "x-forwarded-for": options.ip ?? "203.0.113.9",
      "content-type": encoded.headers.get("content-type")!,
    },
    body: Buffer.from(await encoded.arrayBuffer()),
  });
}

const stored = () => world.db.orderFiles;

describe("order creation with a logo", () => {
  it("returns an upload token only when the shopper says a logo is coming", async () => {
    const withLogo = await placeOrderWithLogo();
    expect(withLogo.token).toMatch(/^[\w-]+\.[\w-]+$/);

    const response = await app.checkout(cartRequest(cartBody()));
    const json = await response.json();
    expect(json.success).toBe(true);
    expect(json).not.toHaveProperty("logoUploadToken");
  });

  it("does not put the file, or anything file-like, into the stored order", async () => {
    const { id } = await placeOrderWithLogo();
    expect(JSON.stringify(world.db.data(id))).not.toMatch(/logoUploadToken|data:image|hasLogo/);
  });

  it("tells the customer what happens next, and asks for a reply with the logo only when none is coming", async () => {
    await placeOrderWithLogo();
    const withLogo = world.outbox.toCustomers.at(-1)!;
    expect(withLogo.html).toContain(
      "We have your request MG-00001. We will place your logo on your items and email you a final quote with shipping and other costs."
    );
    expect(withLogo.html).not.toContain("Reply to this email with your logo");

    await placeOrder(app);
    const without = world.outbox.toCustomers.at(-1)!;
    expect(without.html).toContain(
      "Reply to this email with your logo (vector PDF, AI, EPS or PNG)."
    );
  });

  it("says in the business email that a logo is coming, or that none was attached", async () => {
    await placeOrderWithLogo();
    expect(world.outbox.toBusiness.at(-1)!.html).toContain("The customer is attaching a logo");
    await placeOrder(app);
    expect(world.outbox.toBusiness.at(-1)!.html).toContain("No logo attached");
  });

  it("issues no token (and the emails say no logo) when no signing secret exists", async () => {
    vi.stubEnv("ADMIN_SESSION_SECRET", "");
    vi.stubEnv("CLIENT_SESSION_SECRET", "");
    const response = await app.checkout(cartRequest(cartBody({ hasLogo: true })));
    const json = await response.json();
    expect(response.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json).not.toHaveProperty("logoUploadToken");
    expect(world.outbox.toCustomers.at(-1)!.html).toContain("Reply to this email with your logo");
  });
});

describe("POST /api/merchant/order-logo", () => {
  it("stores the logo and tells the business where to find it", async () => {
    const { orderRef, token, id } = await placeOrderWithLogo();
    const before = world.outbox.toBusiness.length;

    const response = await upload(uploadRequest({ orderRef, token }));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ success: true, filename: "logo.png" });

    expect(stored()).toHaveLength(1);
    expect(stored()[0]).toMatchObject({
      order_id: id,
      filename: "logo.png",
      mime: "image/png",
      size: PNG.length,
    });
    expect([...stored()[0].data]).toEqual([...PNG]);

    const emails = world.outbox.toBusiness;
    expect(emails).toHaveLength(before + 1);
    const pointer = emails.at(-1)!;
    expect(pointer.subject).toBe(`${orderRef}: Logo attached`);
    expect(pointer.html).toContain("Logo attached");
    expect(pointer.html).toContain("logo.png");
    expect(pointer.html).toContain(`/admin/orders/${id}`);
    expect(pointer.text).toContain("Logo attached: logo.png");
    // A pointer only: nothing from the file travels in the email.
    expect(pointer.html).not.toContain(Buffer.from(PNG).toString("base64"));
    // And never anything for the customer.
    expect(world.outbox.toCustomers).toHaveLength(1);
    expect(pointer.html).not.toMatch(BACKEND_LEAK_PATTERN);
  });

  it("ignores the content type the client claims and the path in the file name", async () => {
    const { orderRef, token } = await placeOrderWithLogo();
    const response = await upload(
      uploadRequest({
        orderRef,
        token,
        file: { name: "../../etc/Logo Final.png", data: PNG, type: "text/html" },
      })
    );
    expect(response.status).toBe(200);
    expect(stored()[0]).toMatchObject({ filename: "Logo Final.png", mime: "image/png" });
  });

  it("accepts a safe SVG and records it as an SVG", async () => {
    const { orderRef, token } = await placeOrderWithLogo();
    const response = await upload(
      uploadRequest({ orderRef, token, file: { name: "mark.svg", data: SVG } })
    );
    expect(response.status).toBe(200);
    expect(stored()[0]).toMatchObject({ mime: "image/svg+xml" });
  });

  describe("rejections leave the order alone and store nothing", () => {
    it.each([
      ["no token", (o: { orderRef: string }) => ({ orderRef: o.orderRef })],
      ["a garbage token", (o: { orderRef: string }) => ({ orderRef: o.orderRef, token: "x.y" })],
      ["no order reference", (o: { token: string }) => ({ token: o.token })],
      [
        "a malformed order reference",
        (o: { token: string }) => ({ orderRef: "MG-1; DROP TABLE", token: o.token }),
      ],
    ])("%s", async (_name, build) => {
      const placed = await placeOrderWithLogo();
      const response = await upload(uploadRequest(build(placed)));
      expect(response.status).toBe(403);
      expect(stored()).toHaveLength(0);
      expect(world.db.data(placed.id).status).toBe("new");
    });

    it("a token issued for a different order", async () => {
      const first = await placeOrderWithLogo();
      const second = await placeOrderWithLogo();
      const response = await upload(
        uploadRequest({ orderRef: second.orderRef, token: first.token })
      );
      expect(response.status).toBe(403);
      expect(stored()).toHaveLength(0);
    });

    it("an expired token", async () => {
      const { orderRef, token } = await placeOrderWithLogo();
      advanceClock(LOGO_UPLOAD_TOKEN_TTL_MS + 1000);
      const response = await upload(uploadRequest({ orderRef, token }));
      expect(response.status).toBe(403);
      expect((await response.json()).error).toMatch(/reply to your confirmation email/i);
      expect(stored()).toHaveLength(0);
    });

    it("a valid token for an order that does not exist", async () => {
      const { createLogoUploadToken } = await import("@/lib/orderLogoToken");
      const token = createLogoUploadToken(999)!;
      const response = await upload(uploadRequest({ orderRef: "MG-00999", token }));
      expect(response.status).toBe(404);
      expect(stored()).toHaveLength(0);
    });

    it("no file", async () => {
      const { orderRef, token } = await placeOrderWithLogo();
      const response = await upload(uploadRequest({ orderRef, token, file: null }));
      expect(response.status).toBe(400);
    });

    it("a file field that is plain text", async () => {
      const { orderRef, token } = await placeOrderWithLogo();
      const response = await upload(
        uploadRequest({ orderRef, token, file: null, extra: [["file", "not a file"]] })
      );
      expect(response.status).toBe(400);
      expect(stored()).toHaveLength(0);
    });

    it("two files in one request", async () => {
      const { orderRef, token } = await placeOrderWithLogo();
      const response = await upload(
        uploadRequest({
          orderRef,
          token,
          extra: [["file", new Blob([new Uint8Array(PNG)], { type: "image/png" })]],
        })
      );
      expect(response.status).toBe(400);
      expect(stored()).toHaveLength(0);
    });

    it.each([
      ["a disallowed extension", { name: "logo.gif", data: PNG }, 400],
      ["an executable", { name: "logo.exe", data: Buffer.from("MZ....") }, 400],
      [
        "bytes that are not the named type",
        { name: "logo.png", data: Buffer.from("<html>hi</html>") },
        400,
      ],
      ["a PNG renamed to .jpg", { name: "logo.jpg", data: PNG }, 400],
      ["an empty file", { name: "logo.png", data: new Uint8Array(0) }, 400],
      [
        "an SVG with a script",
        {
          name: "logo.svg",
          data: Buffer.from(
            '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'
          ),
        },
        400,
      ],
      [
        "an SVG with an event handler",
        {
          name: "logo.svg",
          data: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" onload="x()"/>'),
        },
        400,
      ],
      [
        "an SVG with an external reference",
        {
          name: "logo.svg",
          data: Buffer.from(
            '<svg xmlns="http://www.w3.org/2000/svg"><image href="https://evil.example/a.png"/></svg>'
          ),
        },
        400,
      ],
    ])("%s", async (_name, file, status) => {
      const { orderRef, token } = await placeOrderWithLogo();
      const response = await upload(uploadRequest({ orderRef, token, file }));
      expect(response.status).toBe(status);
      expect((await response.json()).success).toBe(false);
      expect(stored()).toHaveLength(0);
      expect(world.db.data(1).status).toBe("new");
    });

    it("a file over 4 MB", async () => {
      const { orderRef, token } = await placeOrderWithLogo();
      const big = new Uint8Array(MAX_LOGO_BYTES + 1);
      big.set(PNG);
      const response = await upload(
        uploadRequest({ orderRef, token, file: { name: "big.png", data: big } })
      );
      expect(response.status).toBe(413);
      expect((await response.json()).error).toMatch(/4 MB/);
      expect(stored()).toHaveLength(0);
    });

    it("a body far over the cap is cut off while streaming, whatever Content-Length says", async () => {
      const { orderRef, token } = await placeOrderWithLogo();
      const huge = new Uint8Array(MAX_LOGO_BYTES + 200 * 1024);
      huge.set(PNG);
      const response = await upload(
        uploadRequest({ orderRef, token, file: { name: "huge.png", data: huge } })
      );
      expect(response.status).toBe(413);
      expect(stored()).toHaveLength(0);
    });

    it("a request that is not multipart", async () => {
      const { orderRef, token } = await placeOrderWithLogo();
      const response = await upload(
        new NextRequest("http://localhost/api/merchant/order-logo", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ orderRef, token }),
        })
      );
      expect(response.status).toBe(415);
    });
  });

  it("keeps at most 3 files per order", async () => {
    const { orderRef, token } = await placeOrderWithLogo();
    for (let i = 1; i <= 3; i++) {
      const ok = await upload(
        uploadRequest({ orderRef, token, file: { name: `logo${i}.png`, data: PNG } })
      );
      expect(ok.status).toBe(200);
    }
    const fourth = await upload(
      uploadRequest({ orderRef, token, file: { name: "logo4.png", data: PNG } })
    );
    expect(fourth.status).toBe(409);
    expect(stored()).toHaveLength(3);
  });

  it("does not let a second order's files count against the first", async () => {
    const first = await placeOrderWithLogo();
    const second = await placeOrderWithLogo();
    for (let i = 0; i < 3; i++) {
      await upload(uploadRequest({ ...first, file: { name: `a${i}.png`, data: PNG } }));
    }
    const response = await upload(
      uploadRequest({ orderRef: second.orderRef, token: second.token })
    );
    expect(response.status).toBe(200);
    expect(stored().filter((f) => f.order_id === second.id)).toHaveLength(1);
  });

  it("rate limits by address", async () => {
    const { orderRef, token } = await placeOrderWithLogo();
    const statuses: number[] = [];
    for (let i = 0; i < 6; i++) {
      const response = await upload(
        uploadRequest({ orderRef, token, ip: "198.51.100.5", file: { name: "x.gif", data: PNG } })
      );
      statuses.push(response.status);
    }
    expect(statuses.slice(0, 5).every((s) => s === 400)).toBe(true);
    expect(statuses[5]).toBe(429);
  });

  it("answers 500, stores nothing and sends nothing when the database fails, and the order stands", async () => {
    const { orderRef, token, id } = await placeOrderWithLogo();
    const before = world.outbox.toBusiness.length;
    world.db.failNext(/^INSERT INTO order_files/);
    const response = await upload(uploadRequest({ orderRef, token }));
    expect(response.status).toBe(500);
    expect(stored()).toHaveLength(0);
    expect(world.outbox.toBusiness).toHaveLength(before);
    expect(world.db.data(id).status).toBe("new");
    const logged = vi.mocked(console.error).mock.calls.flat().join(" ");
    expect(logged).toContain(`order ${id}`);
  });

  it("still succeeds when the pointer email to the business cannot be sent", async () => {
    const { orderRef, token } = await placeOrderWithLogo();
    world.outbox.rejectNext({ when: (email) => /Logo attached/.test(email.subject) });
    const response = await upload(uploadRequest({ orderRef, token }));
    expect(response.status).toBe(200);
    expect(stored()).toHaveLength(1);
  });

  it("creates the order_files table on first use, idempotently", async () => {
    const { orderRef, token } = await placeOrderWithLogo();
    await upload(uploadRequest({ orderRef, token }));
    await upload(uploadRequest({ orderRef, token }));
    expect(world.db.countQueries(/^CREATE TABLE IF NOT EXISTS order_files/)).toBe(1);
  });

  it("has no GET or other handler: uploaded files are never served from a public route", () => {
    const methods = Object.keys(routeModule).filter((key) =>
      ["GET", "HEAD", "PUT", "PATCH", "DELETE", "OPTIONS"].includes(key)
    );
    expect(methods).toEqual([]);
  });
});
