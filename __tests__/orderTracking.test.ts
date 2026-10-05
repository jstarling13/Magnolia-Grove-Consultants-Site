import { createHmac } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildOrderTrackingUrl,
  createOrderToken,
  isOrderTrackingEnabled,
  maskEmail,
  parseOrderRef,
  verifyOrderToken,
} from "@/lib/orderTracking";

const SECRET = "test-secret-with-enough-length-0123456789";

describe("parseOrderRef", () => {
  it.each([
    ["MG-00042", 42],
    ["mg-00042", 42],
    ["Mg-00042", 42],
    ["  MG-00042  ", 42],
    ["\tMG-42\n", 42],
    ["MG-1", 1],
    ["MG-123456", 123456],
    ["MG-000000000042", 42],
    ["MG-2147483647", 2147483647],
  ])("accepts %j as %i", (input, id) => {
    expect(parseOrderRef(input)).toBe(id);
  });

  it.each([
    "",
    "   ",
    "42",
    "MG42",
    "MG-",
    "MG-0",
    "MG-00000",
    "MG--5",
    "MG-4.2",
    "MG-4e3",
    "MG-0x2A",
    "MG-42abc",
    "MG 42",
    "M G-42",
    "XX-00042",
    "MG-00042; DROP TABLE submissions",
    "MG-00042\nMG-00043",
    "MG-2147483648",
    "MG-9007199254740993",
    "MG-99999999999999999999999999",
    "MG-１２",
  ])("rejects %j", (input) => {
    expect(parseOrderRef(input)).toBeUndefined();
  });

  it("rejects non-strings", () => {
    for (const input of [undefined, null, 42, {}, ["MG-00042"]]) {
      expect(parseOrderRef(input)).toBeUndefined();
    }
  });
});

describe("order tokens", () => {
  beforeEach(() => {
    vi.stubEnv("ORDER_LINK_SECRET", SECRET);
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("is base64url(HMAC-SHA256(secret, canonical ref))", () => {
    const expected = createHmac("sha256", SECRET).update("MG-00042").digest("base64url");
    expect(createOrderToken(42)).toBe(expected);
    expect(createOrderToken(42)).toMatch(/^[A-Za-z0-9_-]{43}$/);
  });

  it("verifies its own token and no other order's", () => {
    const token = createOrderToken(42)!;
    expect(verifyOrderToken(42, token)).toBe(true);
    expect(verifyOrderToken(43, token)).toBe(false);
    expect(verifyOrderToken(4, token)).toBe(false);
    expect(verifyOrderToken(420, token)).toBe(false);
  });

  it("gives different orders different tokens", () => {
    expect(createOrderToken(1)).not.toBe(createOrderToken(2));
  });

  it("rejects tampered tokens, including every single-character change", () => {
    const token = createOrderToken(42)!;
    for (let i = 0; i < token.length; i++) {
      const swap = token[i] === "A" ? "B" : "A";
      const tampered = token.slice(0, i) + swap + token.slice(i + 1);
      expect(verifyOrderToken(42, tampered)).toBe(false);
    }
  });

  it("rejects malformed, truncated, padded, and non-string tokens", () => {
    const token = createOrderToken(42)!;
    const bad: unknown[] = [
      "",
      " ",
      token.slice(1),
      token.slice(0, -1),
      token + "A",
      `${token}=`,
      ` ${token}`,
      `${token} `,
      token.replace(/./, "+"),
      "x".repeat(10_000),
      undefined,
      null,
      42,
      {},
      [token],
    ];
    for (const candidate of bad) expect(verifyOrderToken(42, candidate)).toBe(false);
  });

  it("rejects a non-canonical encoding of the right bytes", () => {
    // The last base64url character of a 32-byte value carries two unused
    // bits; flipping them decodes to the same bytes but is a different string.
    const token = createOrderToken(42)!;
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
    const last = alphabet.indexOf(token[42]);
    const sibling = alphabet[last ^ 1];
    const variant = token.slice(0, 42) + sibling;
    expect(Buffer.from(variant, "base64url").equals(Buffer.from(token, "base64url"))).toBe(true);
    expect(verifyOrderToken(42, variant)).toBe(false);
  });

  it("rejects a token signed with a different secret", () => {
    const token = createOrderToken(42)!;
    vi.stubEnv("ORDER_LINK_SECRET", "a-completely-different-secret-value");
    expect(verifyOrderToken(42, token)).toBe(false);
  });

  it("uses timingSafeEqual and never compares tokens with ===/==", () => {
    // Node's ESM builtins can't be spied on under vitest, so guard the source
    // itself: a regression to a plain string comparison would fail here.
    const source = readFileSync(
      path.resolve(__dirname, "../src/lib/orderTracking.ts"),
      "utf8"
    ).replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, "");
    expect(source).toContain("timingSafeEqual(");
    expect(source).not.toMatch(
      /\b(provided|token|expected)\s*[!=]==?\s*(provided|token|expected)\b/
    );
  });

  it("does nothing for invalid order ids", () => {
    for (const id of [0, -1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 2]) {
      expect(createOrderToken(id)).toBeUndefined();
    }
  });
});

describe("when ORDER_LINK_SECRET is missing or weak", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it.each([undefined, "", "   ", "short-secret"])("is disabled for %j", (value) => {
    vi.stubEnv("ORDER_LINK_SECRET", value as string);
    expect(isOrderTrackingEnabled()).toBe(false);
    expect(createOrderToken(42)).toBeUndefined();
    expect(buildOrderTrackingUrl(42)).toBeUndefined();
    expect(verifyOrderToken(42, "A".repeat(43))).toBe(false);
  });

  it("is enabled with a long enough secret (surrounding whitespace ignored)", () => {
    vi.stubEnv("ORDER_LINK_SECRET", `  ${SECRET}  `);
    expect(isOrderTrackingEnabled()).toBe(true);
    expect(createOrderToken(42)).toBe(
      createHmac("sha256", SECRET).update("MG-00042").digest("base64url")
    );
  });
});

describe("buildOrderTrackingUrl", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("builds an absolute link whose token verifies", () => {
    vi.stubEnv("ORDER_LINK_SECRET", SECRET);
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://shop.example.com/");
    const url = new URL(buildOrderTrackingUrl(42)!);
    expect(url.origin).toBe("https://shop.example.com");
    expect(url.pathname).toBe("/orders/MG-00042");
    expect(verifyOrderToken(42, url.searchParams.get("t"))).toBe(true);
  });
});

describe("maskEmail", () => {
  it.each([
    ["pat@example.com", "p***@example.com"],
    ["  Pat.Lee@Example.com ", "P***@Example.com"],
    ["a@b.co", "a***@b.co"],
  ])("masks %j", (input, expected) => {
    expect(maskEmail(input)).toBe(expected);
  });

  it.each(["", "no-at-sign", "@example.com", "pat@", undefined, null, 5])(
    "hides unparseable %j entirely",
    (input) => {
      expect(maskEmail(input)).toBe("");
    }
  );
});
