// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";

async function load(configured = true) {
  vi.resetModules();
  vi.stubEnv("SQUARE_ACCESS_TOKEN", configured ? "sq0atp-FAKE" : "");
  vi.stubEnv("SQUARE_LOCATION_ID", configured ? "LOC_FAKE" : "");
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
  return import("@/lib/square");
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("deletePaymentLink", () => {
  it("sends an authenticated DELETE for the link", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const { deletePaymentLink } = await load();
    expect(await deletePaymentLink("LINK_1")).toEqual({ ok: true });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toMatch(/\/v2\/online-checkout\/payment-links\/LINK_1$/);
    expect(init.method).toBe("DELETE");
    expect(init.headers.Authorization).toBe("Bearer sq0atp-FAKE");
  });

  it("treats a link Square no longer has (404) as already deleted", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("{}", { status: 404 })));
    const { deletePaymentLink } = await load();
    expect(await deletePaymentLink("LINK_1")).toEqual({ ok: true });
  });

  it.each([500, 400, 401])("reports an error for HTTP %i", async (status) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("{}", { status })));
    const { deletePaymentLink } = await load();
    expect(await deletePaymentLink("LINK_1")).toEqual({ ok: false, error: "square_api_error" });
  });

  it("reports an error when the request itself fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network")));
    const { deletePaymentLink } = await load();
    expect(await deletePaymentLink("LINK_1")).toEqual({ ok: false, error: "square_api_error" });
  });

  it("makes no request for an id that could alter the URL path", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const { deletePaymentLink } = await load();
    for (const bad of ["", "../orders/X", "a/b", "a?b=1", "x".repeat(200)]) {
      expect(await deletePaymentLink(bad)).toMatchObject({ ok: false });
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("does nothing when Square is not configured", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const { deletePaymentLink } = await load(false);
    expect(await deletePaymentLink("LINK_1")).toEqual({ ok: false, error: "not_configured" });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("createPaymentLink redirect", () => {
  it("never puts the buyer's email in the redirect URL", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ payment_link: { id: "L", url: "u" } })));
    vi.stubGlobal("fetch", fetchMock);
    const { createPaymentLink } = await load();
    await createPaymentLink({
      organizationName: "Org",
      memo: "m",
      amountCents: 100,
      buyerEmail: "pat@example.com",
      redirectSource: "merch",
    });
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.checkout_options.redirect_url).toMatch(/\/thank-you\?source=merch$/);
    expect(body.checkout_options.redirect_url).not.toMatch(/pat|email|%40|@/i);
    expect(body.pre_populated_data.buyer_email).toBe("pat@example.com"); // Square's own page still prefills it
  });
});
