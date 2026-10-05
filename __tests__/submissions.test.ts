// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ sql: vi.fn() }));
vi.mock("@/lib/db", () => ({ sql: mocks.sql }));

import { recordSubmission } from "@/lib/submissions";

describe("recordSubmission", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns the inserted id", async () => {
    mocks.sql.mockResolvedValue([{ id: 42 }]);
    expect(await recordSubmission("merch_order", { a: 1 })).toBe(42);
    const [strings, type, json] = mocks.sql.mock.calls[0];
    expect(strings.join("?")).toContain("RETURNING id");
    expect(type).toBe("merch_order");
    expect(json).toBe('{"a":1}');
  });

  it("accepts an id returned as a string", async () => {
    mocks.sql.mockResolvedValue([{ id: "17" }]);
    expect(await recordSubmission("lead", {})).toBe(17);
  });

  it("returns undefined, without throwing, when the insert fails", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.sql.mockRejectedValue(new Error("db down"));
    expect(await recordSubmission("lead", {})).toBeUndefined();
    spy.mockRestore();
  });

  it("returns undefined when no row comes back", async () => {
    mocks.sql.mockResolvedValue([]);
    expect(await recordSubmission("lead", {})).toBeUndefined();
  });
});
