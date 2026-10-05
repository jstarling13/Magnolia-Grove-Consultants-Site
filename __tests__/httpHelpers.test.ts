// @vitest-environment node
import { describe, expect, it } from "vitest";
import { getClientIp, readJsonBody, MAX_JSON_BODY_BYTES } from "@/lib/http";

function req(body: BodyInit | null, headers: Record<string, string> = {}) {
  return new Request("http://localhost/api/x", { method: "POST", body, headers });
}

describe("readJsonBody", () => {
  it("parses a normal JSON body", async () => {
    const result = await readJsonBody(req(JSON.stringify({ a: 1 })));
    expect(result).toEqual({ ok: true, body: { a: 1 } });
  });

  it("rejects malformed JSON with 400", async () => {
    const result = await readJsonBody(req("{not json"));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.response.status).toBe(400);
  });

  it("rejects an empty body with 400", async () => {
    const result = await readJsonBody(req(null));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.response.status).toBe(400);
  });

  it("rejects a declared oversized body with 413 before reading it", async () => {
    const result = await readJsonBody(
      req("{}", { "content-length": String(MAX_JSON_BODY_BYTES + 1) })
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.response.status).toBe(413);
  });

  it("rejects an oversized body that under-declares or omits its length", async () => {
    const big = JSON.stringify({ pad: "x".repeat(MAX_JSON_BODY_BYTES + 10) });
    const result = await readJsonBody(req(big, { "content-length": "10" }), MAX_JSON_BODY_BYTES);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.response.status).toBe(413);
  });

  it("honors a custom limit", async () => {
    const result = await readJsonBody(req(JSON.stringify({ pad: "x".repeat(100) })), 50);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.response.status).toBe(413);
  });

  it("does not leak parser details in the error body", async () => {
    const result = await readJsonBody(req("{bad"));
    if (result.ok) throw new Error("expected failure");
    const json = await result.response.json();
    expect(json).toEqual({ success: false, error: "Invalid request body." });
  });
});

describe("getClientIp", () => {
  it("prefers the platform header, then x-real-ip, then the first forwarded hop", () => {
    expect(
      getClientIp(req(null, { "x-vercel-forwarded-for": "1.1.1.1", "x-real-ip": "2.2.2.2" }))
    ).toBe("1.1.1.1");
    expect(getClientIp(req(null, { "x-real-ip": "2.2.2.2", "x-forwarded-for": "3.3.3.3" }))).toBe(
      "2.2.2.2"
    );
    expect(getClientIp(req(null, { "x-forwarded-for": "3.3.3.3, 4.4.4.4" }))).toBe("3.3.3.3");
    expect(getClientIp(req(null))).toBe("unknown");
  });
});
