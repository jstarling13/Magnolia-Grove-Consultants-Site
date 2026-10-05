// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  MAX_WEBHOOK_BODY_BYTES,
  computeSquareSignature,
  readBodyWithLimit,
  verifySquareSignature,
} from "@/lib/squareWebhook";

const KEY = "test-signature-key";
const URL_ = "https://example.test/api/webhooks/square";
const BODY = JSON.stringify({ type: "payment.updated", event_id: "evt_1", data: { id: "p1" } });

describe("verifySquareSignature", () => {
  const good = computeSquareSignature(KEY, URL_, BODY);

  it("computes base64 HMAC-SHA256 over notificationUrl + rawBody", () => {
    expect(good).toMatch(/^[A-Za-z0-9+/]{43}=$/);
  });

  it("accepts a valid signature", () => {
    expect(
      verifySquareSignature({
        signatureKey: KEY,
        notificationUrl: URL_,
        rawBody: BODY,
        signature: good,
      })
    ).toBe(true);
  });

  it("rejects a signature made with the wrong key", () => {
    const bad = computeSquareSignature("other-key", URL_, BODY);
    expect(
      verifySquareSignature({
        signatureKey: KEY,
        notificationUrl: URL_,
        rawBody: BODY,
        signature: bad,
      })
    ).toBe(false);
  });

  it("rejects a tampered body", () => {
    expect(
      verifySquareSignature({
        signatureKey: KEY,
        notificationUrl: URL_,
        rawBody: BODY.replace("p1", "p2"),
        signature: good,
      })
    ).toBe(false);
  });

  it("rejects when the notification URL differs, even by a trailing slash", () => {
    expect(
      verifySquareSignature({
        signatureKey: KEY,
        notificationUrl: URL_ + "/",
        rawBody: BODY,
        signature: good,
      })
    ).toBe(false);
  });

  it("rejects missing or empty signature, key or url", () => {
    const base = { signatureKey: KEY, notificationUrl: URL_, rawBody: BODY };
    expect(verifySquareSignature({ ...base, signature: null })).toBe(false);
    expect(verifySquareSignature({ ...base, signature: undefined })).toBe(false);
    expect(verifySquareSignature({ ...base, signature: "" })).toBe(false);
    expect(verifySquareSignature({ ...base, signatureKey: "", signature: good })).toBe(false);
    expect(verifySquareSignature({ ...base, notificationUrl: "", signature: good })).toBe(false);
  });

  it("handles signatures of the wrong length or garbage without throwing", () => {
    const base = { signatureKey: KEY, notificationUrl: URL_, rawBody: BODY };
    expect(verifySquareSignature({ ...base, signature: "abc" })).toBe(false);
    expect(verifySquareSignature({ ...base, signature: good + good })).toBe(false);
    expect(verifySquareSignature({ ...base, signature: "\u0000￿" })).toBe(false);
  });

  it("matches a vector computed independently with openssl", () => {
    // printf '%s' 'https://example.test/hookbody' | openssl dgst -sha256 -hmac key -binary | base64
    expect(computeSquareSignature("key", "https://example.test/hook", "body")).toBe(
      "RPz/e7Zdsvr2PCnEJyAXfj3CMUpd/Ynq+N7fIND1wt4="
    );
  });
});

describe("readBodyWithLimit", () => {
  it("reads a normal body", async () => {
    const req = new Request("https://x.test", { method: "POST", body: BODY });
    expect(await readBodyWithLimit(req)).toEqual({ ok: true, text: BODY });
  });

  it("rejects when content-length declares too much", async () => {
    const req = new Request("https://x.test", {
      method: "POST",
      body: "x",
      headers: { "content-length": String(MAX_WEBHOOK_BODY_BYTES + 1) },
    });
    expect(await readBodyWithLimit(req)).toEqual({ ok: false, reason: "too_large" });
  });

  it("rejects an oversized streamed body with no content-length", async () => {
    const big = "a".repeat(MAX_WEBHOOK_BODY_BYTES + 1);
    const req = new Request("https://x.test", { method: "POST", body: big });
    req.headers.delete("content-length");
    expect(await readBodyWithLimit(req)).toEqual({ ok: false, reason: "too_large" });
  });

  it("allows a body exactly at the limit", async () => {
    const edge = "a".repeat(MAX_WEBHOOK_BODY_BYTES);
    const req = new Request("https://x.test", { method: "POST", body: edge });
    const result = await readBodyWithLimit(req);
    expect(result.ok).toBe(true);
  });
});
