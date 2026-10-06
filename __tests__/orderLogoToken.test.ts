// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  LOGO_UPLOAD_TOKEN_TTL_MS,
  createLogoUploadToken,
  verifyLogoUploadToken,
} from "@/lib/orderLogoToken";
import { createClientSessionToken, verifyClientSessionToken } from "@/lib/clientAuth";
import { createSessionToken, verifySessionToken } from "@/lib/adminAuth";
import { createSignedToken } from "@/lib/signedToken";

const CLIENT_SECRET = "client-session-FAKE-secret-0123456789";
const ADMIN_SECRET = "admin-session-FAKE-secret-0123456789";

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-10-05T14:00:00.000Z"));
  vi.stubEnv("CLIENT_SESSION_SECRET", CLIENT_SECRET);
  vi.stubEnv("ADMIN_SESSION_SECRET", ADMIN_SECRET);
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("logo upload token", () => {
  it("is valid for the order it was issued for", () => {
    const token = createLogoUploadToken(42);
    expect(token).toBeTruthy();
    expect(verifyLogoUploadToken(token, 42)).toBe(true);
  });

  it("is refused for any other order", () => {
    const token = createLogoUploadToken(42);
    expect(verifyLogoUploadToken(token, 43)).toBe(false);
    expect(verifyLogoUploadToken(token, 4)).toBe(false);
    expect(verifyLogoUploadToken(token, 420)).toBe(false);
  });

  it("expires after 15 minutes", () => {
    expect(LOGO_UPLOAD_TOKEN_TTL_MS).toBe(15 * 60 * 1000);
    const token = createLogoUploadToken(7);
    vi.setSystemTime(Date.now() + LOGO_UPLOAD_TOKEN_TTL_MS - 1000);
    expect(verifyLogoUploadToken(token, 7)).toBe(true);
    vi.setSystemTime(Date.now() + 2000);
    expect(verifyLogoUploadToken(token, 7)).toBe(false);
  });

  it("is refused when tampered with", () => {
    const token = createLogoUploadToken(7)!;
    const [payload, signature] = token.split(".");
    const forged = Buffer.from(
      JSON.stringify({ ...JSON.parse(Buffer.from(payload, "base64url").toString()), order: "8" })
    ).toString("base64url");
    expect(verifyLogoUploadToken(`${forged}.${signature}`, 8)).toBe(false);
    expect(verifyLogoUploadToken(`${payload}.${signature}x`, 7)).toBe(false);
    expect(verifyLogoUploadToken("", 7)).toBe(false);
    expect(verifyLogoUploadToken(undefined, 7)).toBe(false);
    expect(verifyLogoUploadToken("garbage", 7)).toBe(false);
    expect(verifyLogoUploadToken({ token }, 7)).toBe(false);
  });

  it("cannot be made from a client login or admin session token, or the other way around", () => {
    const clientLogin = createClientSessionToken("pat@example.com");
    const adminLogin = createSessionToken("ben");
    expect(verifyLogoUploadToken(clientLogin, 1)).toBe(false);
    expect(verifyLogoUploadToken(adminLogin, 1)).toBe(false);

    const upload = createLogoUploadToken(1);
    expect(verifyClientSessionToken(upload!)).toBeNull();
    expect(verifySessionToken(upload!)).toBeNull();
  });

  it("is refused when signed for another purpose with the same secret", () => {
    const other = createSignedToken(
      "CLIENT_SESSION_SECRET",
      { purpose: "something-else", order: "5" },
      60_000
    );
    expect(verifyLogoUploadToken(other, 5)).toBe(false);
  });

  it("uses CLIENT_SESSION_SECRET, and falls back to ADMIN_SESSION_SECRET when it is unset", () => {
    const viaClient = createLogoUploadToken(9)!;
    vi.stubEnv("CLIENT_SESSION_SECRET", "");
    expect(verifyLogoUploadToken(viaClient, 9)).toBe(false); // client secret gone: not valid
    const viaAdmin = createLogoUploadToken(9)!;
    expect(viaAdmin).toBeTruthy();
    expect(verifyLogoUploadToken(viaAdmin, 9)).toBe(true);
  });

  it("is not available when neither secret is configured, and never uses ORDER_LINK_SECRET", () => {
    vi.stubEnv("CLIENT_SESSION_SECRET", "");
    vi.stubEnv("ADMIN_SESSION_SECRET", "");
    vi.stubEnv("ORDER_LINK_SECRET", "order-link-FAKE-secret-0123456789");
    expect(createLogoUploadToken(1)).toBeNull();
    expect(verifyLogoUploadToken("anything.else", 1)).toBe(false);
  });

  it("refuses to issue a token for a nonsense order id", () => {
    expect(createLogoUploadToken(0)).toBeNull();
    expect(createLogoUploadToken(-3)).toBeNull();
    expect(createLogoUploadToken(1.5)).toBeNull();
    expect(createLogoUploadToken(Number.NaN)).toBeNull();
  });
});
