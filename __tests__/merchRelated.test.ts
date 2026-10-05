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

describe("selectRelated relevance", () => {
  interface N extends P {
    name: string;
  }
  const n = (id: string, name: string, price: number, brand = "Essentials"): N => ({
    ...p(id, price, brand),
    name,
  });

  const gildanTee = n("gildan-tee", "Gildan Ultra Cotton T-Shirt", 9.5, "Gildan");

  it("shows similar items before an unrelated one, even a cheaper nearer-priced one", () => {
    const pool = [
      n("plush-dog", '6" Plush Big Paw Dog with Shirt', 9.4),
      n("rain-jacket", "Packable Lightweight Rain Jacket With Hood", 9.6),
      n("port-tee", "Port & Company Core Cotton T-Shirt", 12, "Port & Company"),
      n("gildan-ls", "Gildan Ultra Cotton Long Sleeve T-Shirt", 14, "Gildan"),
    ];
    const ids = selectRelated(gildanTee, pool).map((x) => x.id);
    expect(ids.slice(0, 2).sort()).toEqual(["gildan-ls", "port-tee"]);
    expect(ids.indexOf("plush-dog")).toBeGreaterThan(1);
    expect(ids.indexOf("rain-jacket")).toBeGreaterThan(1);
  });

  it("treats tee, tshirt and t-shirt as the same kind of product", () => {
    const pool = [
      n("hat", "Wool Beanie", 9.5),
      n("tee", "Dye-sublimated V-Neck Tee", 30),
      n("tshirt", "Crew TShirts", 40),
    ];
    expect(
      selectRelated(gildanTee, pool, 2)
        .map((x) => x.id)
        .sort()
    ).toEqual(["tee", "tshirt"]);
  });

  it("ranks a near-identical name first, then the same brand, then the unrelated", () => {
    const pool = [
      n("same-brand-other", "Gildan Heavy Blend Hooded Sweatshirt", 25, "Gildan"),
      n("lookalike", "Ultra Cotton T-Shirt", 25),
      n("loose", "Canvas Apron", 9.5),
    ];
    expect(selectRelated(gildanTee, pool).map((x) => x.id)).toEqual([
      "lookalike",
      "same-brand-other",
      "loose",
    ]);
  });

  it("ignores sizes, filler words and the brand's own name when comparing names", () => {
    const a = n("a", "Women's 5.4 oz Cotton Tee", 10);
    const b = n("b", "Gildan Unisex Cotton Tee", 10, "Gildan");
    const c = n("c", "Women's 5.4 oz Wool Scarf", 10);
    // a shares "cotton" and "tee" with the current name; c shares only filler and the size.
    const result = selectRelated(n("cur", "Men's 3.4 oz Cotton Tee", 10), [c, a, b]);
    expect(result.map((x) => x.id)).toEqual(["a", "b", "c"]);
  });

  it("is deterministic and order-independent with names in play", () => {
    const pool = [
      n("b", "Cotton Tee", 10),
      n("a", "Cotton Tee", 10),
      n("c", "Cotton Tee Long Sleeve", 10),
      n("d", "Apron", 10),
    ];
    const forward = selectRelated(gildanTee, pool).map((x) => x.id);
    expect(selectRelated(gildanTee, [...pool].reverse()).map((x) => x.id)).toEqual(forward);
    expect(forward.slice(0, 2)).toEqual(["a", "b"]);
  });

  it("copes with missing or empty names and a one-item category", () => {
    const noName = { ...p("no-name", 9.5), name: undefined };
    expect(selectRelated(gildanTee, [noName]).map((x) => x.id)).toEqual(["no-name"]);
    expect(selectRelated({ ...gildanTee, name: "" }, [n("x", "", 9)]).map((x) => x.id)).toEqual([
      "x",
    ]);
    expect(selectRelated(gildanTee, [gildanTee])).toEqual([]);
  });
});
