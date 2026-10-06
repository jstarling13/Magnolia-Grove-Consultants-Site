import { describe, expect, it } from "vitest";
import {
  buildFaqJsonLd,
  buildGoodToKnow,
  categoryCopy,
  computeCategoryFacts,
  formatPrice,
  getCategoryCopy,
  MANY_COLORS,
  type FactProduct,
} from "@/config/categoryCopy";
import { getImprintArea, products } from "@/config/merchandiseConfig";
import { toCatalogProduct } from "@/lib/merchCatalog";
import { serializeJsonLd } from "@/lib/merchSeo";
import { getStorefrontCategories } from "@/lib/merchStorefront";

const categories = getStorefrontCategories();

function liveProducts(category: string) {
  return products
    .filter((product) => product.category === category)
    .map((product) => toCatalogProduct(product, getImprintArea(product)));
}

const BANNED = [
  /turnaround/i,
  /guarantee/i,
  /free shipping/i,
  /\bdays?\b/i,
  /\bweeks?\b/i,
  /\bproofs?\b/i,
  /\brefunds?\b/i,
  /\breturns?\b/i,
  /\bwarrant/i,
  /\bin stock\b/i,
  /\bbest\b/i,
];

/** Intros may say "volunteer days"; every other promise word still applies. */
const BANNED_OUTSIDE_FAQ = BANNED.filter((pattern) => !/days|weeks/.test(pattern.source));

describe("category copy coverage", () => {
  it("has copy for every storefront category and nothing extra", () => {
    expect(categories.length).toBeGreaterThan(0);
    for (const category of categories) expect(getCategoryCopy(category), category).toBeDefined();
    expect(Object.keys(categoryCopy).sort()).toEqual([...categories].sort());
  });

  it("has unique, bounded titles and descriptions", () => {
    const descriptions = categories.map((c) => categoryCopy[c].description);
    const titles = categories.map((c) => categoryCopy[c].title);
    expect(new Set(descriptions).size).toBe(descriptions.length);
    expect(new Set(titles).size).toBe(titles.length);
    for (const category of categories) {
      const copy = categoryCopy[category];
      expect(copy.description.length, category).toBeLessThanOrEqual(155);
      expect(copy.description.length, category).toBeGreaterThan(60);
      expect(copy.title.length, category).toBeLessThanOrEqual(50);
    }
  });

  it("has unique intros of two or three sentences", () => {
    const intros = categories.map((c) => categoryCopy[c].intro);
    expect(new Set(intros).size).toBe(intros.length);
    for (const category of categories) {
      const sentences = categoryCopy[category].intro.split(/(?<=\.)\s+/);
      expect(sentences.length, category).toBeGreaterThanOrEqual(2);
      expect(sentences.length, category).toBeLessThanOrEqual(3);
    }
  });

  it("has three FAQ items per category, each question unique within its page", () => {
    for (const category of categories) {
      const { faqs } = categoryCopy[category];
      expect(faqs).toHaveLength(3);
      expect(new Set(faqs.map((f) => f.question)).size, category).toBe(3);
      for (const faq of faqs) {
        expect(faq.question.trim().endsWith("?")).toBe(true);
        expect(faq.answer.trim().length).toBeGreaterThan(40);
      }
    }
  });
});

describe("copy never promises what the store does not define", () => {
  it("keeps banned promise words out of every FAQ answer", () => {
    for (const category of categories) {
      for (const faq of categoryCopy[category].faqs) {
        for (const pattern of BANNED) {
          expect(`${faq.question} ${faq.answer}`, `${category}: ${pattern}`).not.toMatch(pattern);
        }
      }
    }
  });

  it("keeps banned words out of intros, titles and descriptions", () => {
    for (const category of categories) {
      const { intro, title, description } = categoryCopy[category];
      for (const pattern of BANNED_OUTSIDE_FAQ) {
        expect(`${intro} ${title} ${description}`, `${category}: ${pattern}`).not.toMatch(pattern);
      }
    }
  });

  it("has no emojis or superlative filler in any copy", () => {
    const all = categories
      .flatMap((c) => {
        const copy = categoryCopy[c];
        return [
          copy.title,
          copy.description,
          copy.intro,
          ...copy.faqs.flatMap((f) => [f.question, f.answer]),
        ];
      })
      .join("\n");
    expect(all).not.toMatch(/\p{Extended_Pictographic}/u);
    expect(all).not.toMatch(
      /\b(?:world-class|premier|unbeatable|cheapest|number one|#1|amazing)\b/i
    );
  });

  it("only makes the standard-size claim in categories that have such products", () => {
    for (const category of categories) {
      const text = categoryCopy[category].faqs.map((f) => f.answer).join(" ");
      if (/priced for a standard size/.test(text)) {
        expect(
          products.some((p) => p.category === category && p.priceNote),
          category
        ).toBe(true);
      }
    }
  });

  it("only mentions a sizes box for categories that offer one", () => {
    for (const category of categories) {
      const text = categoryCopy[category].faqs.map((f) => f.answer).join(" ");
      if (/Sizes and quantities/.test(text)) expect(["Apparel", "Headwear"]).toContain(category);
    }
  });
});

describe("computeCategoryFacts", () => {
  const item = (tiers: [number, number][], extra: Partial<FactProduct> = {}): FactProduct => ({
    tiers: tiers.map(([quantity, price]) => ({ quantity, price })),
    colors: undefined,
    brand: "Essentials",
    description: "A thing.",
    ...extra,
  });

  it("computes figures from the products it is given", () => {
    const facts = computeCategoryFacts([
      item(
        [
          [10, 5],
          [100, 4],
        ],
        { description: "Made in USA. Priced at 10 units." }
      ),
      item([[50, 20]], {
        colors: Array.from({ length: MANY_COLORS }, (_, i) => `c${i}`),
        brand: "Nike",
      }),
      item(
        [
          [25, 1.5],
          [500, 1.5],
        ],
        { brand: "Nike" }
      ),
    ]);
    expect(facts.count).toBe(3);
    expect(facts.lowestFirstTierPrice).toBe(1.5);
    expect(facts.highestFirstTierPrice).toBe(20);
    expect(facts.typicalMinimumQuantity).toBe(25);
    expect(facts.lowestMinimumQuantity).toBe(10);
    expect(facts.quantityBreakCount).toBe(1);
    expect(facts.madeInUsaCount).toBe(1);
    expect(facts.manyColorsCount).toBe(1);
    expect(facts.namedBrandCount).toBe(1);
  });

  it("handles an empty list", () => {
    const facts = computeCategoryFacts([]);
    expect(facts.count).toBe(0);
    expect(facts.typicalMinimumQuantity).toBe(0);
  });

  it("does not count lookalike phrases as Made in USA", () => {
    const facts = computeCategoryFacts([
      item([[1, 1]], { description: "Imprinted in USA studio." }),
      item([[1, 1]], { description: "Made in China." }),
    ]);
    expect(facts.madeInUsaCount).toBe(0);
  });
});

describe("buildGoodToKnow", () => {
  it("returns three bullets for every category, with figures that match the live data", () => {
    for (const category of categories) {
      const items = liveProducts(category);
      const facts = computeCategoryFacts(items);
      const bullets = buildGoodToKnow(categoryCopy[category].highlights, facts);
      expect(bullets, category).toHaveLength(3);
      for (const bullet of bullets) expect(bullet.trim().length).toBeGreaterThan(10);

      // Independent recomputation of the headline numbers from the raw tiers.
      const firsts = items.map((p) => p.tiers[0]);
      expect(facts.count).toBe(items.length);
      expect(bullets[0]).toContain(formatPrice(Math.min(...firsts.map((t) => t.price))));
      expect(bullets[0]).toContain(formatPrice(Math.max(...firsts.map((t) => t.price))));
      expect(bullets[0]).toContain(items.length.toLocaleString("en-US"));
      const sorted = firsts.map((t) => t.quantity).sort((a, b) => a - b);
      expect(bullets[1]).toContain(
        `${sorted[Math.floor((sorted.length - 1) / 2)].toLocaleString("en-US")} unit`
      );
    }
  });

  it("falls back to a data-driven third bullet when no highlight applies", () => {
    const facts = computeCategoryFacts([
      {
        tiers: [{ quantity: 12, price: 3 }],
        colors: undefined,
        brand: "Essentials",
        description: "x",
      },
    ]);
    const bullets = buildGoodToKnow(["usa", "colors", "brands"], facts);
    expect(bullets[2]).toBe("The lowest minimum order here is 12 units.");
    expect(bullets[0]).toContain("$3.00");
    expect(bullets[0]).toMatch(/^1 product is listed/);
  });

  it("never hard-codes numbers into the written copy", () => {
    for (const category of categories) {
      const { intro, faqs } = categoryCopy[category];
      // The only digits allowed are the worked sizes example and file-type names.
      const prose = [intro, ...faqs.map((f) => f.answer)].join(" ").replace(/24 M, 60 L/g, "");
      expect(prose, category).not.toMatch(/\d/);
    }
  });
});

describe("FAQPage JSON-LD", () => {
  it("serializes, parses and mirrors the visible questions and answers", () => {
    for (const category of categories) {
      const { faqs } = categoryCopy[category];
      const parsed = JSON.parse(serializeJsonLd(buildFaqJsonLd(faqs)));
      expect(parsed["@context"]).toBe("https://schema.org");
      expect(parsed["@type"]).toBe("FAQPage");
      expect(parsed.mainEntity).toHaveLength(3);
      parsed.mainEntity.forEach(
        (
          q: { "@type": string; name: string; acceptedAnswer: { "@type": string; text: string } },
          i: number
        ) => {
          expect(q["@type"]).toBe("Question");
          expect(q.name).toBe(faqs[i].question);
          expect(q.acceptedAnswer["@type"]).toBe("Answer");
          expect(q.acceptedAnswer.text).toBe(faqs[i].answer);
        }
      );
    }
  });
});

describe("category page metadata", () => {
  it("uses the written title and description for every category", async () => {
    const { generateMetadata } = await import("@/app/(marketing)/merchandise/category/[slug]/page");
    const { categorySlug } = await import("@/lib/merchSlug");
    const seen = new Set<string>();
    for (const category of categories) {
      const meta = await generateMetadata({
        params: Promise.resolve({ slug: categorySlug(category) }),
      });
      const copy = categoryCopy[category];
      expect(meta.title).toBe(`${copy.title} | Magnolia Grove Consultants`);
      expect(meta.description).toBe(copy.description);
      expect(meta.openGraph?.description).toBe(copy.description);
      expect(String(meta.description).length).toBeLessThanOrEqual(155);
      seen.add(String(meta.title));
    }
    expect(seen.size).toBe(categories.length);
  });
});
