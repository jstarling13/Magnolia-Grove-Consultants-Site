// @vitest-environment node
import fs from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import cleanupRows from "./fixtures/catalogVendorCleanup.fixture.json";
import {
  CATEGORY_RULES,
  THIRD_PARTY_CONSUMER_BRANDS,
  TAG_TO_CATEGORY,
  buildCatalog,
  buildDescription,
  buildNameVocab,
  categoryFromRules,
  cleanName,
  cleanRow,
  detectBrand,
  findSuspectPricing,
  findThirdPartyBrandProducts,
  fixNameTypos,
  fixSizeUnits,
  informativeSize,
  makeUniqueId,
  parseCategoryOverrides,
  parseKeepApart,
  parseNameOverrides,
  parseOverrides,
  stripVendorNameNoise,
  trimCutOffName,
} from "../scripts/lib/catalogClean.mjs";
import { CATEGORY_IMPRINT_DEFAULTS, merchandiseCategories } from "../src/config/merchandiseConfig";
import { buildCategoryMetadata } from "../src/lib/merchSeo";
import { categorySlug } from "../src/lib/merchSlug";

/**
 * Vendor-text name cleanup, description facts, keyword category rules, brand detection,
 * duplicate decisions and report-only price checks. The rows in
 * fixtures/catalogVendorCleanup.fixture.json are real raw scrape rows.
 */

const rows = cleanupRows as unknown[][];
const overridesFile = JSON.parse(
  await fs.readFile(path.join(__dirname, "../scripts/data/import-overrides.json"), "utf8")
);

function rawRow(espId: string): unknown[] {
  const found = rows.find((r) => String(r[0]).trim() === espId);
  if (!found) throw new Error(`fixture has no row ${espId}`);
  return found;
}

/** Display name and id the importer produces for one fixture row. */
function cleaned(espId: string, ctx: { vocab?: Set<string> } = {}) {
  const out = cleanRow(rawRow(espId), ctx);
  if (out.skip || !out.product) throw new Error(`row ${espId} skipped: ${out.skip}`);
  return {
    name: out.product.name,
    id: makeUniqueId(out.idName, espId, new Map()),
    description: out.product.description,
  };
}

describe("vendor ops text and typos are removed from the display name only", () => {
  // [espId, display name, id]. The id is what the ORIGINAL cleaned name produced before this
  // cleanup: ids, URLs and photo keys must never move.
  const cases: [string, string, string][] = [
    [
      "550127702",
      "USB Dual Port Car Portable Charger",
      "special-usb-dual-port-car-portable-charger-27702",
    ],
    ["552607205", "Broadview Card USB", "broadview-card-usb-quickship-07205"],
    [
      "555936041",
      '11" 13" 15" Laptop Sleeve Case with Stand',
      "in-stock-11-13-15-laptop-sleeve-case-with-stand-36041",
    ],
    [
      "554231742",
      "Business Card Magnets 20 Mil - Full Color Print",
      "best-value-business-card-magnets-20-mil-full-color-print-31742",
    ],
    [
      "551778346",
      "Foldable Nylon Fan (Printed in USA)",
      "foldable-nylon-fan-printed-in-usa-rush-78346",
    ],
    [
      "555012995",
      "Custom Temporary Tattoos - All Sizes",
      "new-custom-temporary-tattoos-all-sizes-12995",
    ],
    ["550251101", "Presentation Folders", "budget-presentation-folders-51101"],
    [
      "555938040",
      "Waterproof Disposable Plastic Tablecloth Roll 40\" x 100'",
      "waterproof-disposable-plastic-tablecloth-roll-40-x-100-38040",
    ],
    [
      "556520644",
      "24 oz. Red Cup Living® Reusable Beer Mug",
      "24-oz-red-cup-living-reuseable-beer-mug-20644",
    ],
    [
      "555917641",
      "Full Color Removable Kiss-Cut Sticker Sheet",
      "full-color-removeable-kiss-cut-sticker-sheet-17641",
    ],
    ["551848357", "16 oz The Party Cup", "usa-made-16-oz-the-party-cup-48357"],
    [
      "556295759",
      "Cotton Crew Dress Socks with All Over Design",
      "made-in-usa-cotton-crew-dress-socks-with-all-over-design-95759",
    ],
    [
      "5028378",
      "Custom CottonWeave™ Tapestry Throw Blanket, Size L",
      "custom-cottonweave-tapestry-throw-blanket-usa-made-size-l-28378",
    ],
  ];

  it.each(cases)("espId %s -> %s", (espId, name, id) => {
    const out = cleaned(espId);
    expect(out.name).toBe(name);
    expect(out.id).toBe(id);
  });

  it("keeps the USA claim in the description when the name loses it", () => {
    expect(cleaned("551848357").description).toMatch(/^Made in the USA\. /);
    expect(cleaned("556295759").description).toMatch(/Made in USA/);
  });

  it("only strips 'USA Made' when the supplier flags the product as made in the USA", () => {
    expect(stripVendorNameNoise("Made in the USA July 4th Socks")).toBe(
      "Made in the USA July 4th Socks"
    );
    expect(stripVendorNameNoise("Made in the USA July 4th Socks", { usa: true })).toBe(
      "July 4th Socks"
    );
    // a claim about one part of the product stays
    expect(
      stripVendorNameNoise("Richardson 112 Trucker Hat Cap with USA Made Leather Patch", {
        usa: true,
      })
    ).toBe("Richardson 112 Trucker Hat Cap with USA Made Leather Patch");
  });

  it("leaves real product words alone", () => {
    for (const name of [
      "Men's New Englander® Rain Jacket",
      "New Era® Tonal Camo Stretch Tech Mesh Cap",
      "Budget Planner",
      "Non-Woven Recycled Budget Shopper Tote",
      "Newport Mug",
      "Special Edition Mug",
    ]) {
      expect(stripVendorNameNoise(name)).toBe(name);
    }
  });

  it("keeps a name that would shrink to one word, so a nameOverrides entry can fix it", () => {
    expect(stripVendorNameNoise("Pricebuster Lanyard")).toBe("Pricebuster Lanyard");
    expect(stripVendorNameNoise("Price Buster Cap")).toBe("Price Buster Cap");
    const names = Object.fromEntries(
      parseNameOverrides(overridesFile).map((o) => [o.espId, o.name])
    );
    expect(names["550300716"]).toBe("5-Panel Unstructured Cotton Twill Cap");
    expect(names["200333580"]).toBe("Flat Polyester Silkscreen Lanyard");
  });

  it("spell-corrects only the small known list", () => {
    expect(fixNameTypos("Reuseable Bag")).toBe("Reusable Bag");
    expect(fixNameTypos("REMOVEABLE Sticker")).toBe("REMOVABLE Sticker");
    expect(fixNameTypos("Tablecloth 40'' x 100'")).toBe("Tablecloth 40\" x 100'");
  });
});

describe("names cut off by the supplier's 60 character field", () => {
  const vocab = buildNameVocab([
    "Insulated Bottle",
    "Carabiner Clip",
    "Sweatshirt",
    "Product Tote",
    "Large Bag",
  ]);
  const cut = (name: string, ellipsis = false) =>
    trimCutOffName(name, { rawLength: cleanName(name).length, ellipsis, vocab });

  it.each([
    [
      "Gildan® Ultra Cotton® 100% Cotton Long Sleeve T-Shirt wit",
      "Gildan® Ultra Cotton® 100% Cotton Long Sleeve T-Shirt",
    ],
    [
      "Grosche International Inc. 40 oz Aspen Vacuum Insulated S",
      "Grosche International Inc. 40 oz Aspen Vacuum Insulated",
    ],
    [
      "18 oz. Travel Stainless Steel Vacuum Insulated Coffee cup w",
      "18 oz. Travel Stainless Steel Vacuum Insulated Coffee cup",
    ],
    [
      "Vanilla-Scented Soy Wax Candle in Glass Jar w/Bamboo Lid La",
      "Vanilla-Scented Soy Wax Candle in Glass Jar w/Bamboo Lid",
    ],
    [
      "Water Bottle with Magnetic Phone Mount & Sip Straw Lid - Ins",
      "Water Bottle with Magnetic Phone Mount & Sip Straw Lid",
    ],
    [
      "Hand Sanitizer Antibacterial Gel in Flip-Top Bottle with Car",
      "Hand Sanitizer Antibacterial Gel in Flip-Top Bottle",
    ],
    [
      "Full-Size Multi-Functional Gaiter & Headwear - Domestic Prod",
      "Full-Size Multi-Functional Gaiter & Headwear - Domestic",
    ],
  ])("drops the dangling fragment: %s", (name, expected) => {
    expect(cut(name)).toBe(expected);
  });

  it("drops the word before a trailing ellipsis when it starts a longer word", () => {
    expect(cut("BELLA + CANVAS Unisex Sponge Fleece Full-Zip Hoodie Sweat...", true)).toBe(
      "BELLA + CANVAS Unisex Sponge Fleece Full-Zip Hoodie"
    );
  });

  it("leaves complete names, inch marks and short names alone", () => {
    for (const name of [
      "Custom JBL Vibe Beam 2 True Wireless Noise-Canceling Earbuds",
      "Sublimation Oval Running Belt w/ 2 Pockets 10.5x2.5x5 in",
      "Lapel Pin, 4 Color Process Printed with Clear Epoxy Dome",
      "Custom CottonWeave™ Tapestry Throw Blanket, Size L",
      "Insulated Mug w",
    ]) {
      expect(cut(name)).toBe(name);
    }
  });

  it("applies in the importer without changing the id", () => {
    expect(cleaned("555832581")).toMatchObject({
      name: "Gildan® Ultra Cotton® 100% Cotton Long Sleeve T-Shirt",
      id: "gildan-ultra-cotton-100-cotton-long-sleeve-t-shirt-wit-32581",
    });
    expect(cleaned("555802688").name).toBe(
      "Grosche International Inc. 40 oz Aspen Vacuum Insulated"
    );
    expect(cleaned("554265847").name).toBe(
      "Vanilla-Scented Soy Wax Candle in Glass Jar w/Bamboo Lid"
    );
  });
});

describe("description facts", () => {
  it("never writes the color count or the volume break (the swatches and price table show them)", () => {
    for (const espId of ["555581136", "555815749", "556210823"]) {
      expect(cleaned(espId).description).not.toMatch(/color option|Price per unit drops/i);
    }
  });

  it("builds a factual description for products that had only 'Priced at N units.'", () => {
    // Devon & Jones polo, S'well tumbler, Titleist, caps and sunglasses had no supplier text and no size
    expect(cleaned("555581136").description).toBe(
      "Devon & Jones Men's Short-Sleeve Polo Shirts. Priced at 50 units."
    );
    expect(cleaned("555815749").description).toBe(
      "S'well® Wine Tumbler - 14oz. Available in Angel Food, Onyx and Teakwood. Priced at 48 units."
    );
  });

  it("drops unit-less size fragments such as '2.25 D'", () => {
    expect(informativeSize("2.25 D")).toBe("");
    expect(informativeSize("31/2 D")).toBe("");
    expect(informativeSize("9")).toBe("");
    expect(informativeSize(`15 " x 23 "`)).toBe(`15" x 23"`);
    expect(informativeSize("XS, S, M, L, XL")).toBe("XS, S, M, L, XL");
    expect(cleaned("556210823").description).toBe(
      "2.25 Inch Round Custom Buttons. Priced at 100 units."
    );
  });

  it("keeps the 'Priced at N units.' tail contract", () => {
    expect(
      buildDescription({ rawDescription: "", sizes: "", minQty: 1, usa: 0, multiGrid: 0 })
    ).toBe("Priced at 1 unit.");
    expect(cleaned("556175245").description).toMatch(/ Priced at 1 unit\.$/);
  });

  it("fixes size unit typos only when the data makes the unit unambiguous", () => {
    // a third measurement under one foot after two foot measurements is a thickness in inches
    expect(fixSizeUnits("3 ' x 10 ' x 0.375 '")).toBe(`3' x 10' x 0.375"`);
    expect(cleaned("556175245").description).toBe(`Size: 3' x 10' x 0.375". Priced at 1 unit.`);
    // a size written only with doubled apostrophes is in inches
    expect(fixSizeUnits("3.3'' x 2.1''")).toBe(`3.3" x 2.1"`);
    // not unambiguous: left exactly as written
    expect(fixSizeUnits("6 ' x 10 ''")).toBe("6' x 10''");
    expect(fixSizeUnits("4' x 6' x 2'")).toBe("4' x 6' x 2'");
    expect(fixSizeUnits("0.375'")).toBe("0.375'");
  });
});

describe("keyword category rules", () => {
  // Every cluster the rules move, by display name. `from` is where the scraper put it.
  const clusters: { rule: string; from: string; to: string; names: string[] }[] = [
    {
      rule: "awards",
      from: "Gifts & Entertaining",
      to: "Awards & Recognition",
      names: [
        "Optic Crystal Octagon Tower Award - Medium",
        "Chairman's Tower Optical Crystal Award",
        '7" Blue Cathedral Soaring Acrylic Award',
        "Reston Plaque - Walnut Finish/Gold",
        "Millsboro Plaque - Walnut Finish/Silver",
        "Express Vibraprint® Plaque",
        "Custom Acrylic Desk Plaques with Metal Screw Posts",
        '1.5" Zinc Challenge Coin (No Color Fill)',
        "Custom Die Struck Challenge Coins - No Color",
        'Custom Coin, 1 1/2" Die Struck Brass with Soft Enamel',
        "Custom Lapel Pin, Die Struck with Soft Enamel Color Fill",
        "Express Custom Shape Acrylic Lapel Pins",
      ],
    },
    {
      rule: "pens",
      from: "Awards & Recognition",
      to: "Office & Writing",
      names: [
        "Waterman Expert Ballpoint Pen - Black with Gold Trim",
        "Cross Calais Lustrous Chrome Ball-Point Pen",
        "Gift Pen",
      ],
    },
    {
      rule: "cutting-boards",
      from: "Awards & Recognition",
      to: "Gifts & Entertaining",
      names: ["Bamboo Cutting Board for Kitchen Christmas Engraving Gift"],
    },
    {
      rule: "bumper-stickers",
      from: "Event & Signage",
      to: "Automotive",
      names: [
        "Oval Custom Bumper Sticker",
        "5 x 3 In Oval Perm Bumper Sticker",
        "5 In Circle Perm Bumper Sticker",
        '2.75" W x 15" H Bumper Sticker',
      ],
    },
    {
      rule: "lanyards-and-badges",
      from: "Event & Signage",
      to: "Lanyards & Badges",
      names: [
        '3/4" Silkscreen Lanyard with Breakaway Safety Release',
        "Lanyards Dye Sublimated Full Color",
        "Full-Color Sublimation Lanyards",
        '3/4" Polyester Lanyard',
      ],
    },
    {
      rule: "lanyards-and-badges",
      from: "Awards & Recognition",
      to: "Lanyards & Badges",
      names: [
        "Polyester/Badge Reel Lanyard Combo-B",
        "Lanyards with Badge Holder Combo Clear Vinyl",
        "Custom Name Badges",
      ],
    },
    {
      rule: "lanyards-and-badges",
      from: "Print & Collateral",
      to: "Lanyards & Badges",
      names: ["Digitally Printed Name Badge", "Engraved Name Badge", "Executive Name Badge"],
    },
    {
      rule: "promo-giveaways",
      from: "Event & Signage",
      to: "Promo Giveaways",
      names: [
        "Round Stress Ball",
        "Push Pop Stress Ball",
        "Bread Slice Hand Fan",
        "Portable Hand Held Fan",
        "ZoolAir Mini Handheld Fan",
        "Foldable Nylon Fan (Printed in USA)",
        "Hand Clapper Noise Maker",
        "Football Clapper Noise Maker",
        "Bottle Banger Noisemaker",
        "Giant Foam Fingers Hand",
        "Silicone Wristband Adult",
        "Printed Wristbands",
        "Debossed Silicone Bands",
        "Printed Chunky Bands",
        "1.25 Inch Round Custom Button",
        "LED Buttons Badge Glowing Pin",
        '3" Round Button 1-Piece w/Safety Pin',
      ],
    },
    {
      rule: "promo-giveaways",
      from: "Gifts & Entertaining",
      to: "Promo Giveaways",
      names: ["Push Pop Stress Reliever Keychain"],
    },
    {
      rule: "promo-giveaways",
      from: "Kids & Toys",
      to: "Promo Giveaways",
      names: [
        "Push Pop Square Stress Reliever Keychain",
        "Mini Pop Stress Ball",
        "Soccer Stress Ball",
      ],
    },
    {
      rule: "promo-giveaways",
      from: "Health & Wellness",
      to: "Promo Giveaways",
      names: ["2.5 Inch Round PU Foam Stress Ball"],
    },
    {
      rule: "promo-giveaways",
      from: "Seasonal & Holiday",
      to: "Promo Giveaways",
      names: ["USA Patriotic Hand Clapper Noise Maker", "USA Patriotic Folding Handheld Fan"],
    },
  ];

  for (const cluster of clusters) {
    it(`${cluster.rule}: ${cluster.from} -> ${cluster.to} (${cluster.names.length})`, () => {
      for (const name of cluster.names) {
        expect(categoryFromRules({ name, category: cluster.from }), name).toMatchObject({
          category: cluster.to,
          ruleId: cluster.rule,
        });
      }
    });
  }

  it("leaves look-alikes where the scraper put them", () => {
    const stay: [string, string][] = [
      ["Pen Holder Trophy Night Light", "Awards & Recognition"],
      ["Mini Portable Waterproof Bluetooth Speaker with Lanyard", "Tech Accessories"],
      ["Halloween Pumpkin Jack O Lantern with Lanyard", "Seasonal & Holiday"],
      ["Button Note Book", "Office & Writing"],
      ["Bamboo Cutting Board with Knife and Sharpener Gift Set", "Gifts & Entertaining"],
      ["Wide Brim Solar USB Rechargeable Fan Sun Hat", "Headwear"],
      ['Rally Towel, 15.5" x 13.25"', "Event & Signage"],
      ['Custom 18" x 24" Yard Signs', "Event & Signage"],
      ["Acrylic Nameplate", "Awards & Recognition"],
      ["Waterproof Floating Flashlight", "Knives & Tools"],
    ];
    for (const [name, category] of stay) {
      expect(categoryFromRules({ name, category }), name).toBeNull();
    }
  });

  it("only targets real site categories, with distinct slugs and unique SEO titles", () => {
    const known = new Set<string>(merchandiseCategories);
    for (const rule of CATEGORY_RULES) expect(known.has(rule.to), rule.to).toBe(true);
    for (const name of Object.values(TAG_TO_CATEGORY)) expect(known.has(name), name).toBe(true);
    expect(merchandiseCategories).toContain("Promo Giveaways");
    expect(merchandiseCategories).toContain("Lanyards & Badges");
    expect(TAG_TO_CATEGORY.giveaway).toBe("Promo Giveaways");
    expect(TAG_TO_CATEGORY.badges).toBe("Lanyards & Badges");
    expect(categorySlug("Promo Giveaways")).toBe("promo-giveaways");
    expect(categorySlug("Lanyards & Badges")).toBe("lanyards-badges");
    expect(new Set(merchandiseCategories.map(categorySlug)).size).toBe(
      merchandiseCategories.length
    );
    for (const name of merchandiseCategories) {
      expect(CATEGORY_IMPRINT_DEFAULTS[name], `imprint default for ${name}`).toBeDefined();
    }
    const titles = merchandiseCategories.map(
      (name) => buildCategoryMetadata(name, [], "https://example.com").title
    );
    expect(new Set(titles).size).toBe(titles.length);
  });

  it("lets an explicit categoryOverrides entry beat a rule", () => {
    const file = parseCategoryOverrides(overridesFile);
    const lite = file.find((o) => o.espId === "552649377");
    expect(lite?.category).toBe("Awards & Recognition");
    const row = [
      "9001",
      "PN",
      "Gift Pen",
      "",
      ["Black"],
      "",
      [[1, 5]],
      "123",
      "V",
      "asi/1",
      5,
      50,
      0,
      "awards",
      0,
    ];
    const [kept] = buildCatalog([row], {
      categoryOverrides: [{ espId: "9001", category: "Gifts & Entertaining", reason: "test" }],
    }).items;
    expect(kept.product.category).toBe("Gifts & Entertaining");
    const [ruled] = buildCatalog([row]).items;
    expect(ruled.product.category).toBe("Office & Writing");
  });
});

describe("brand detection", () => {
  const brands: [string, string][] = [
    ["Custom Apple AirPods Max (USB-C)", "Apple"],
    ["Custom Apple AirPods 4", "Apple"],
    ["Custom Beats by Dr. Dre Solo Buds", "Beats"],
    ["Overwrapped Hershey® Candy Bar", "Hershey"],
    ["Miniature Hershey Singles", "Hershey"],
    ["Overwrapped Snickers® Candy Bar", "Snickers"],
    ["Overwrapped PayDay® Candy Bar", "Payday"],
    ["1 oz. Color Choice M&M'S in Full Color Digibag", "M&M's"],
    ["Mini Tube with Mike and Ikes", "Mike and Ike"],
    ["Waterman Expert Ballpoint Pen - Black with Gold Trim", "Waterman"],
    ["Kershaw® Eris Pocket Knife", "Kershaw"],
    ["2 AA LED Mini Maglite® with Swiss Army® Knife", "Maglite"],
    ["Cedar Creek® Valor Pocket Knife", "Cedar Creek"],
    ["PERRY ELLIS® Mini Grid Woven Women's Dress Shirt", "Perry Ellis"],
    ["Bella Women's 1x1 Baby Rib Cap-Sleeve T-Shirt - Dark/All", "Bella+Canvas"],
    ["BELLA + CANVAS Unisex Heavyweight Tee", "Bella+Canvas"],
    ["Free Fly Youth Bamboo Shade Long Sleeve", "Free Fly"],
    ["Native Union Snapstand Qi2 Wireless Charger", "Native Union"],
    ["Toasteez 3In1 Handwarmers & Power Bank", "Toasteez"],
    ['Vynex® Heavy Duty 7.5" x 8" x 1/8" Hard Surface Mouse Pad', "Vynex"],
    ['Frame-It Flex® 7.5" x 8" x 1/8" Window/Photo Mouse Pad', "Frame-It"],
    ["Grosche International Inc. 40 oz Aspen Vacuum Insulated", "Grosche"],
    ["40 oz. Hydrapeak Voyager Travel Mug", "Hydrapeak"],
    ["20 oz. Himalayan Tumbler", "Himalayan"],
    ["20 oz. Full Color Himalayan Recycled Tumbler", "Himalayan"],
    ["30 oz. Full Color Intrepid Recycled Stainless Steel Tumbler", "Intrepid"],
    ["24 oz. Red Cup Living® Reusable Beer Mug", "Red Cup Living"],
    ["28 oz. Otterbox ® Elevation ® Growler Tumbler", "OtterBox"],
  ];
  it.each(brands)("%s -> %s", (name, brand) => {
    expect(detectBrand(name)).toBe(brand);
  });

  it("does not turn ordinary words into brands", () => {
    for (const name of [
      "Apple Cider Mix",
      "Apple Shaped Stress Ball",
      "Beats Per Minute Poster",
      "Alternative Fuel Mug",
      "Hand Fan",
    ]) {
      expect(detectBrand(name), name).toBe("Essentials");
    }
  });

  it("lists third-party consumer-brand products for the owner without hiding anything", () => {
    expect(THIRD_PARTY_CONSUMER_BRANDS).toEqual([
      "Apple",
      "Beats",
      "Hershey",
      "Snickers",
      "Payday",
      "M&M's",
      "Mike and Ike",
      "Maglite",
    ]);
    const item = (id: string, name: string) => ({
      id,
      product: { name, brand: detectBrand(name) },
    });
    const list = findThirdPartyBrandProducts([
      item("a", "Custom Apple AirPods 4"),
      item("b", "Gildan Ultra Cotton Tee"),
      item("c", "Overwrapped Snickers® Candy Bar"),
      item("d", "Kershaw® Eris Pocket Knife"),
    ] as never);
    expect(list.map((p: { id: string }) => p.id)).toEqual(["a", "c"]);
  });
});

describe("duplicate decisions on real rows", () => {
  const PROTECTED = [
    "550620426", // 20 oz Himalayan Tumbler: sourced color photos
    "553747541", // 20 oz Full Color Himalayan Recycled Tumbler: sourced color photos
    "553656072", // Push Pop Stress Reliever Keychain: sourced color photos
    "556620357", // Push Pop Square Stress Reliever Keychain: sourced color photos
    "553243362", // 11" Latex Party Balloon: sourced color photos
    "555322949", // 3/4" Silkscreen Lanyard with Breakaway Safety Release: sourced color photos
  ];
  const result = buildCatalog(rows, {
    dropEspIds: parseOverrides(overridesFile),
    keepApart: parseKeepApart(overridesFile),
    categoryOverrides: parseCategoryOverrides(overridesFile),
    nameOverrides: parseNameOverrides(overridesFile),
    protectedEspIds: PROTECTED,
    curated: [
      {
        id: "silkscreen-lanyard",
        name: '3/4" Silkscreen Breakaway Lanyard',
        category: "Lanyards & Badges",
      },
    ],
  });
  const keptEspIds = new Set(result.items.map((i: { link: { espId: string } }) => i.link.espId));

  // Every decision, one line each: [espIds that stay, espIds that go, why]
  const decisions: [string[], string[], string][] = [
    [
      ["555012956"],
      ["555012957", "554182953"],
      "Budget / Price Saver / Most Popular can coolers are one product from one vendor ($0.96 at 100 each); the ops words are gone from the names so the duplicate rule merges them, keeping the listing with the most colors",
    ],
    [
      ["551819714", "550033390"],
      ["5660307"],
      "dye-sublimated lanyards: one listing is dropped by the override (same product, near-equal vendors, 13 colors vs 1 and a lower price); the third vendor's full-color sublimation lanyard stays",
    ],
    [
      ["553243362"],
      ["554759186"],
      '11" latex party balloon has sourced color photos, so it beats the same balloon from another vendor',
    ],
    [
      ["550419207"],
      ["552243757"],
      'Soft Enamel Lapel Pin (best-rated vendor) and Soft Enamel Iron Lapel Pins are the same generic pin once "Price Buster" is removed',
    ],
    [
      ["550620426", "553747541"],
      [],
      "Himalayan 20 oz tumblers: different vendors/prices, BOTH have sourced color photos, so both stay",
    ],
    [
      ["553656072", "556620357"],
      [],
      "push-pop keychains: BOTH have sourced color photos and now share a category, so keepApart holds them",
    ],
    [
      ["555322949"],
      [],
      "3/4in silkscreen lanyard has sourced color photos and sits next to the curated silkscreen-lanyard: both stay",
    ],
    [
      ["4972504", "4972508", "6423807", "6423797"],
      [],
      "mouse pads differing by 1/8in vs 1/16in thickness (and Vynex vs Frame-It) are different products: all stay",
    ],
    [
      ["7382304", "5505430"],
      [],
      "All-White expanding flying disc is a distinct solid-white SKU at a different price: both stay",
    ],
  ];

  it.each(decisions)("keeps %j and drops %j", (kept, dropped) => {
    for (const espId of kept) expect(keptEspIds.has(espId), `kept ${espId}`).toBe(true);
    for (const espId of dropped) expect(keptEspIds.has(espId), `dropped ${espId}`).toBe(false);
  });

  it("never drops a product that has sourced color photos", () => {
    for (const espId of PROTECTED) expect(keptEspIds.has(espId), espId).toBe(true);
  });

  it("keeps ids stable: every kept id comes from the ORIGINAL cleaned name", () => {
    for (const item of result.items as { id: string; link: { espId: string } }[]) {
      const raw = rawRow(item.link.espId);
      const expected = makeUniqueId(cleanName(String(raw[2])), item.link.espId, new Map());
      expect(item.id).toBe(expected);
    }
  });

  it("puts the moved products in their new categories", () => {
    const byEsp = new Map(
      (result.items as { link: { espId: string }; product: { category: string } }[]).map((i) => [
        i.link.espId,
        i.product.category,
      ])
    );
    expect(byEsp.get("553656072")).toBe("Promo Giveaways");
    expect(byEsp.get("556210823")).toBe("Promo Giveaways");
    expect(byEsp.get("551819714")).toBe("Lanyards & Badges");
    expect(byEsp.get("550419207")).toBe("Awards & Recognition");
  });
});

describe("suspect pricing report (prices are never changed)", () => {
  const item = (id: string, name: string, category: string, tiers: [number, number][]) => ({
    id,
    link: { espId: `esp-${id}` },
    product: { name, category, tiers },
  });
  const printPeers = Array.from({ length: 6 }, (_, i) =>
    item(`peer-${i}`, `Door Hanger ${i}`, "Print & Collateral", [[100, 1.5 + i * 0.2]])
  );

  it("flags a small printed item priced like a per-1000 / per-pack figure", () => {
    const found = findSuspectPricing([
      ...printPeers,
      item("letterheads", 'Letterheads (8.5" x 11")', "Print & Collateral", [[50, 44.37]]),
    ] as never);
    expect(found).toHaveLength(1);
    expect(found[0]).toMatchObject({ id: "letterheads", per1000Suspect: true });
    expect(found[0].reasons).toEqual(
      expect.arrayContaining(["over-10x-category-median", "small-format-unit-price"])
    );
  });

  it("flags a first tier more than 10x the category median and a steep volume drop", () => {
    const peers = Array.from({ length: 6 }, (_, i) =>
      item(`mat-${i}`, `Mat ${i}`, "Home & Decor", [[1, 20 + i]])
    );
    const found = findSuspectPricing([
      ...peers,
      item("tent", "Event Tent", "Home & Decor", [[1, 900]]),
      item("steep", "Door Hanger", "Home & Decor", [
        [100, 1.8],
        [500, 0.6],
        [2500, 0.17],
      ]),
    ] as never);
    const byId = Object.fromEntries(found.map((f) => [f.id, f]));
    expect(byId.tent.reasons).toContain("over-10x-category-median");
    expect(byId.tent.per1000Suspect).toBe(false);
    expect(byId.steep.reasons).toContain("steep-volume-drop");
    expect(found.some((f) => f.id.startsWith("mat-"))).toBe(false);
  });

  it("leaves ordinary products alone and never carries prices to the client record", () => {
    expect(findSuspectPricing(printPeers as never)).toEqual([]);
  });

  it("does not drop the clearest suspects: the raw rows never say the prices are per-1000 or per-pack", () => {
    const dropped = new Set(parseOverrides(overridesFile).map((o) => o.espId));
    for (const espId of ["553087071", "554554202", "552610286"]) {
      expect(dropped.has(espId), espId).toBe(false);
      const raw = rawRow(espId);
      expect(`${raw[2]} ${raw[3]}`).not.toMatch(/per\s*(?:1,?000|thousand|pack|box|case)|\bM\b/i);
    }
  });
});
