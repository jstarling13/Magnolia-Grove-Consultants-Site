import { describe, expect, it } from "vitest";
import { selectRelated } from "@/lib/merchRelated";

interface P {
  id: string;
  category: string;
  brand: string;
  tiers: { quantity: number; price: number }[];
}

const p = (id: string, price: number, brand = "Essentials", category = "Apparel"): P => ({
  id,
  category,
  brand,
  tiers: [{ quantity: 10, price }],
});

describe("selectRelated", () => {
  const current = p("cur", 20, "Nike");

  it("excludes the product itself and other categories", () => {
    const result = selectRelated(current, [current, p("a", 21), p("mug", 20, "Nike", "Drinkware")]);
    expect(result.map((x) => x.id)).toEqual(["a"]);
  });

  it("prefers the same real brand, then the nearest starting price", () => {
    const result = selectRelated(current, [
      p("near-essentials", 20.5),
      p("far-nike", 90, "Nike"),
      p("near-nike", 22, "Nike"),
      p("mid", 30),
    ]);
    expect(result.map((x) => x.id)).toEqual(["near-nike", "far-nike", "near-essentials", "mid"]);
  });

  it("does not treat the generic Essentials brand as a brand match", () => {
    const generic = p("cur", 50);
    const result = selectRelated(generic, [p("cheap", 10), p("close", 48)]);
    expect(result.map((x) => x.id)).toEqual(["close", "cheap"]);
  });

  it("caps at four by default and honors a custom limit", () => {
    const pool = Array.from({ length: 10 }, (_, i) => p(`p${i}`, 20 + i));
    expect(selectRelated(current, pool)).toHaveLength(4);
    expect(selectRelated(current, pool, 2)).toHaveLength(2);
    expect(selectRelated(current, pool, 0)).toEqual([]);
  });

  it("returns what exists for tiny categories, and nothing for an only child", () => {
    expect(selectRelated(current, [current, p("only", 25)]).map((x) => x.id)).toEqual(["only"]);
    expect(selectRelated(current, [current])).toEqual([]);
    expect(selectRelated(current, [])).toEqual([]);
  });

  it("is deterministic: input order and ties never change the result", () => {
    const pool = [p("b", 25), p("a", 25), p("c", 15), p("d", 25), p("e", 25), p("f", 25)];
    const forward = selectRelated(current, pool).map((x) => x.id);
    const reversed = selectRelated(current, [...pool].reverse()).map((x) => x.id);
    expect(forward).toEqual(reversed);
    // Equal price gaps resolve by id.
    expect(forward).toEqual(["a", "b", "c", "d"]);
  });

  it("does not mutate its input", () => {
    const pool = [p("b", 30), p("a", 21)];
    const copy = [...pool];
    selectRelated(current, pool);
    expect(pool).toEqual(copy);
  });
});
