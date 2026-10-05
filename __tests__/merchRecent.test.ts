import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  RECENT_MAX,
  RECENT_STORAGE_KEY,
  addRecent,
  parseRecent,
  readRecent,
  recordRecentView,
  writeRecent,
} from "@/lib/merchRecent";

describe("parseRecent", () => {
  it("returns an empty list for missing or corrupt values", () => {
    expect(parseRecent(null)).toEqual([]);
    expect(parseRecent(undefined)).toEqual([]);
    expect(parseRecent("")).toEqual([]);
    expect(parseRecent("{not json")).toEqual([]);
    expect(parseRecent('{"a":1}')).toEqual([]);
    expect(parseRecent('"just-a-string"')).toEqual([]);
    expect(parseRecent("42")).toEqual([]);
  });

  it("keeps only valid, unique string ids and caps the length", () => {
    expect(parseRecent(JSON.stringify(["a", 7, null, "", "a", "b c", "<script>", "ok-1"]))).toEqual(
      ["a", "ok-1"]
    );
    const many = Array.from({ length: 30 }, (_, i) => `p${i}`);
    expect(parseRecent(JSON.stringify(many))).toEqual(many.slice(0, RECENT_MAX));
  });
});

describe("addRecent", () => {
  it("puts the newest first and moves repeats to the front", () => {
    expect(addRecent(["b", "c"], "a")).toEqual(["a", "b", "c"]);
    expect(addRecent(["a", "b", "c"], "c")).toEqual(["c", "a", "b"]);
  });

  it("drops the oldest beyond the maximum", () => {
    const full = Array.from({ length: RECENT_MAX }, (_, i) => `p${i}`);
    const next = addRecent(full, "new");
    expect(next).toHaveLength(RECENT_MAX);
    expect(next[0]).toBe("new");
    expect(next).not.toContain(`p${RECENT_MAX - 1}`);
  });

  it("ignores an invalid id and does not mutate the input", () => {
    const list = ["a"];
    expect(addRecent(list, "bad id!")).toEqual(["a"]);
    addRecent(list, "b");
    expect(list).toEqual(["a"]);
  });
});

describe("storage round trip", () => {
  beforeEach(() => window.localStorage.clear());

  it("uses the documented key and survives a record/read cycle", () => {
    recordRecentView("one");
    recordRecentView("two");
    recordRecentView("one");
    expect(JSON.parse(window.localStorage.getItem(RECENT_STORAGE_KEY)!)).toEqual(["one", "two"]);
    expect(readRecent()).toEqual(["one", "two"]);
  });

  it("recovers from corrupt stored data", () => {
    window.localStorage.setItem(RECENT_STORAGE_KEY, "}{ broken");
    expect(readRecent()).toEqual([]);
    expect(recordRecentView("fresh")).toEqual(["fresh"]);
    expect(readRecent()).toEqual(["fresh"]);
  });

  it("does not throw when storage is unavailable or full", () => {
    const broken = {
      getItem: vi.fn(() => {
        throw new Error("denied");
      }),
      setItem: vi.fn(() => {
        throw new Error("quota");
      }),
    } as unknown as Storage;
    expect(readRecent(broken)).toEqual([]);
    expect(() => writeRecent(["a"], broken)).not.toThrow();
    expect(recordRecentView("a", broken)).toEqual(["a"]);
    expect(readRecent(null)).toEqual([]);
    expect(() => writeRecent(["a"], null)).not.toThrow();
  });
});
