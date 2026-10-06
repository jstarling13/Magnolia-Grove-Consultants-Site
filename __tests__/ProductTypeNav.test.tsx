import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import CategoryProductGrid from "@/components/merchandise/CategoryProductGrid";
import ProductCatalog from "@/components/merchandise/ProductCatalog";
import { LogoProvider } from "@/components/merchandise/LogoContext";
import { TypeChips, TypeSections } from "@/components/merchandise/ProductTypeNav";
import {
  blockKey,
  blockTotalsFor,
  groupCardsByType,
  summarizeCardTypes,
  type CatalogProduct,
} from "@/lib/merchCatalog";

const AREA = { top: 40, left: 50, width: 20 };

function card(id: number, type: string, brand: string, category = "Apparel"): CatalogProduct {
  return {
    id: `p-${id}`,
    name: `${brand} ${type} ${id}`,
    category,
    brand,
    type,
    description: `Description ${id}`,
    tiers: [{ quantity: 50, price: id }],
    imprintArea: AREA,
  };
}

// In the order the server sends them: Polos (Peter Millar x3, Nike x2, Essentials x2),
// then T-Shirts (all Essentials), then Hoodies (Nike x1, Essentials x1).
const CARDS: CatalogProduct[] = [
  ...[1, 2, 3].map((i) => card(i, "Polos", "Peter Millar")),
  ...[4, 5].map((i) => card(i, "Polos", "Nike")),
  ...[6, 7].map((i) => card(i, "Polos", "Essentials")),
  ...[8, 9, 10].map((i) => card(i, "T-Shirts", "Essentials")),
  card(11, "Hoodies & Sweatshirts", "Nike"),
  card(12, "Hoodies & Sweatshirts", "Essentials"),
];

describe("grouping cards by type and brand block", () => {
  it("makes one group per type and one block per brand run", () => {
    const groups = groupCardsByType(CARDS, "Apparel");
    expect(groups.map((g) => [g.type, g.total, g.showBrands])).toEqual([
      ["Polos", 7, true],
      ["T-Shirts", 3, false],
      ["Hoodies & Sweatshirts", 2, true],
    ]);
    expect(groups[0].blocks.map((b) => [b.brand, b.total])).toEqual([
      ["Peter Millar", 3],
      ["Nike", 2],
      ["Essentials", 2],
    ]);
  });

  it("uses the server's full counts while only the first cards are here", () => {
    const first = CARDS.slice(0, 4);
    const known = {
      types: summarizeCardTypes(CARDS),
      blockTotals: blockTotalsFor(CARDS, "Apparel", 4),
    };
    const [polos] = groupCardsByType(first, "Apparel", known);
    expect(polos.total).toBe(7);
    expect(polos.showBrands).toBe(true);
    expect(polos.blocks.map((b) => [b.brand, b.items.length, b.total])).toEqual([
      ["Peter Millar", 3, 3],
      ["Nike", 1, 2],
    ]);
    expect(Object.keys(blockTotalsFor(CARDS, "Apparel", 4))).toEqual([
      blockKey("Apparel", "Polos", "Peter Millar"),
      blockKey("Apparel", "Polos", "Nike"),
    ]);
  });

  it("counts cards without a type as Other", () => {
    const [group] = groupCardsByType([{ ...card(1, "x", "Nike"), type: undefined }], "Apparel");
    expect(group.type).toBe("Other");
  });
});

describe("TypeSections", () => {
  function renderSections(level: 2 | 3 = 2) {
    return render(
      <LogoProvider>
        <TypeSections
          items={CARDS}
          category="Apparel"
          typeLevel={level}
          idPrefix="t"
          known={{
            types: summarizeCardTypes(CARDS),
            blockTotals: blockTotalsFor(CARDS, "Apparel"),
          }}
        />
      </LogoProvider>
    );
  }

  it("shows a sub-heading per type with its count", () => {
    renderSections();
    expect(screen.getByRole("heading", { level: 2, name: "Polos (7)" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "T-Shirts (3)" })).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 2, name: "Hoodies & Sweatshirts (2)" })
    ).toBeInTheDocument();
  });

  it("shows a smaller heading per brand block, Essentials last, in a type with several brands", () => {
    renderSections();
    const polos = screen.getByRole("group", { name: "Polos (7)" });
    expect(
      within(polos)
        .getAllByRole("heading", { level: 3 })
        .map((h) => h.textContent)
    ).toEqual(["Peter Millar (3)", "Nike (2)", "Essentials (2)"]);
    // the cards sit one level further down
    expect(within(polos).getAllByRole("heading", { level: 4 })).toHaveLength(7);
  });

  it("skips the brand heading when a type has a single brand block", () => {
    renderSections();
    const tees = screen.getByRole("group", { name: "T-Shirts (3)" });
    expect(within(tees).queryByRole("heading", { level: 3, name: /^Essentials \(/ })).toBeNull();
    // with no brand heading the cards are directly under the type heading
    expect(within(tees).getAllByRole("heading", { level: 3 })).toHaveLength(3);
    expect(within(tees).getAllByRole("article")).toHaveLength(3);
  });

  it("keeps the card heading below the type heading on the hub too", () => {
    renderSections(3);
    expect(screen.getByRole("heading", { level: 3, name: "Polos (7)" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 4, name: "Peter Millar (3)" })).toBeInTheDocument();
    const tees = screen.getByRole("group", { name: "T-Shirts (3)" });
    expect(within(tees).getAllByRole("heading", { level: 4 })).toHaveLength(3);
  });

  it("keeps each brand's cards contiguous, in the given order", () => {
    renderSections();
    const names = screen.getAllByRole("article").map((a) => a.querySelector("a")?.textContent);
    expect(names).toEqual(CARDS.map((c) => c.name));
  });
});

describe("TypeChips", () => {
  const TYPES = summarizeCardTypes(CARDS);

  it("shows one chip per type with its count and presses the chosen one", () => {
    const onSelect = vi.fn();
    render(<TypeChips types={TYPES} active="T-Shirts" allValue="All" onSelect={onSelect} />);
    const group = screen.getByRole("group", { name: "Shop by type" });
    const chips = within(group).getAllByRole("button");
    expect(chips.map((c) => c.textContent)).toEqual([
      "Polos7",
      "T-Shirts3",
      "Hoodies & Sweatshirts2",
    ]);
    expect(screen.getByRole("button", { name: /T-Shirts/ })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
    expect(screen.getByRole("button", { name: /Polos/ })).toHaveAttribute("aria-pressed", "false");
  });

  it("selects a type on click and clears it when the active chip is pressed again", () => {
    const onSelect = vi.fn();
    const { rerender } = render(
      <TypeChips types={TYPES} active="All" allValue="All" onSelect={onSelect} />
    );
    fireEvent.click(screen.getByRole("button", { name: /Polos/ }));
    expect(onSelect).toHaveBeenLastCalledWith("Polos");
    rerender(<TypeChips types={TYPES} active="Polos" allValue="All" onSelect={onSelect} />);
    fireEvent.click(screen.getByRole("button", { name: /Polos/ }));
    expect(onSelect).toHaveBeenLastCalledWith("All");
  });

  it("makes every chip a 44px target and leaves empty types out", () => {
    render(
      <TypeChips
        types={[...TYPES, { label: "Vests", count: 0, blocks: 0 }]}
        active="All"
        allValue="All"
        onSelect={() => undefined}
      />
    );
    for (const chip of screen.getAllByRole("button"))
      expect(chip.className).toContain("min-h-[44px]");
    expect(screen.queryByRole("button", { name: /Vests/ })).toBeNull();
  });

  it("renders nothing when there is only one type to choose", () => {
    const { container } = render(
      <TypeChips types={[TYPES[0]]} active="All" allValue="All" onSelect={() => undefined} />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("is a plain row of buttons: it can scroll sideways without trapping focus", () => {
    render(
      <TypeChips
        types={TYPES}
        active="All"
        allValue="All"
        layout="scroll"
        onSelect={() => undefined}
      />
    );
    for (const chip of screen.getAllByRole("button")) expect(chip).not.toHaveAttribute("tabindex");
  });
});

describe("CategoryProductGrid with types", () => {
  beforeEach(() => {
    window.history.replaceState(null, "", "/merchandise/category/apparel");
  });

  function renderGrid() {
    return render(
      <LogoProvider>
        <CategoryProductGrid
          products={CARDS}
          category="Apparel"
          types={summarizeCardTypes(CARDS)}
          blockTotals={blockTotalsFor(CARDS, "Apparel")}
        />
      </LogoProvider>
    );
  }

  it("shows the sectioned view by default: type headings and brand headings", () => {
    renderGrid();
    expect(screen.getByRole("heading", { level: 2, name: "Polos (7)" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 3, name: "Peter Millar (3)" })).toBeInTheDocument();
    expect(screen.getAllByRole("article")).toHaveLength(CARDS.length);
  });

  it("filters to a type, writes it to the URL and offers a removable chip", () => {
    renderGrid();
    fireEvent.click(screen.getByRole("button", { name: /^Polos/ }));
    expect(window.location.search).toContain("type=Polos");
    expect(screen.getAllByRole("article")).toHaveLength(7);
    expect(screen.queryByRole("heading", { name: /T-Shirts/ })).toBeNull();
    // still organised: the type heading and its brand blocks
    expect(screen.getByRole("heading", { level: 2, name: "Polos (7)" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Remove filter: Type: Polos" }));
    expect(window.location.search).not.toContain("type=");
    expect(screen.getAllByRole("article")).toHaveLength(CARDS.length);
  });

  it("restores a shared link and Clear all removes the type", () => {
    window.history.replaceState(null, "", "/merchandise/category/apparel?type=T-Shirts");
    renderGrid();
    expect(screen.getAllByRole("article")).toHaveLength(3);
    expect(screen.getByRole("button", { name: /^T-Shirts/ })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
    fireEvent.click(screen.getAllByRole("button", { name: "Clear all" })[0]);
    expect(window.location.search).toBe("");
    expect(screen.getAllByRole("article")).toHaveLength(CARDS.length);
  });

  it("ignores a type that is not one of the category's", () => {
    window.history.replaceState(null, "", "/merchandise/category/apparel?type=Nope");
    renderGrid();
    expect(screen.getAllByRole("article")).toHaveLength(CARDS.length);
  });

  it("goes flat when sorted: no type or brand headings", () => {
    renderGrid();
    fireEvent.change(screen.getByLabelText("Sort products"), { target: { value: "price-desc" } });
    expect(screen.queryByRole("heading", { name: /Polos \(/ })).toBeNull();
    expect(screen.queryByRole("heading", { name: /Peter Millar \(/ })).toBeNull();
    expect(screen.getAllByRole("article")[0]).toHaveTextContent(
      "Essentials Hoodies & Sweatshirts 12"
    );
  });

  it("with a brand chosen, still groups that brand's products by type", () => {
    renderGrid();
    fireEvent.change(screen.getByLabelText("Filter by brand"), { target: { value: "Nike" } });
    expect(screen.getAllByRole("article")).toHaveLength(3);
    expect(screen.getByRole("heading", { level: 2, name: "Polos (2)" })).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 2, name: "Hoodies & Sweatshirts (1)" })
    ).toBeInTheDocument();
    // one brand: no brand sub-headings
    expect(screen.queryByRole("heading", { level: 3, name: /Nike \(/ })).toBeNull();
    // and the chips count what that brand has
    expect(screen.getByRole("button", { name: /^Polos/ })).toHaveTextContent("2");
    expect(screen.queryByRole("button", { name: /^T-Shirts/ })).toBeNull();
  });

  it("without types (older data) behaves as before: a flat grid and no chips", () => {
    const plain = CARDS.map(({ type: _type, ...rest }) => rest);
    render(
      <LogoProvider>
        <CategoryProductGrid products={plain} category="Apparel" />
      </LogoProvider>
    );
    expect(screen.queryByRole("group", { name: "Shop by type" })).toBeNull();
    expect(screen.getAllByRole("article")).toHaveLength(plain.length);
  });
});

describe("ProductCatalog with types", () => {
  const DRINKS = [
    card(101, "Tumblers", "Yeti", "Drinkware"),
    card(102, "Tumblers", "Essentials", "Drinkware"),
    card(103, "Coffee Mugs", "Essentials", "Drinkware"),
  ];
  const ALL = [...CARDS, ...DRINKS];

  beforeEach(() => {
    window.history.replaceState(null, "", "/merchandise");
  });

  function renderHub() {
    const types = {
      Apparel: summarizeCardTypes(CARDS),
      Drinkware: summarizeCardTypes(DRINKS),
    };
    return render(
      <LogoProvider>
        <ProductCatalog
          products={ALL}
          categories={["Apparel", "Drinkware"]}
          types={types}
          blockTotals={{
            ...blockTotalsFor(CARDS, "Apparel"),
            ...blockTotalsFor(DRINKS, "Drinkware"),
          }}
        />
      </LogoProvider>
    );
  }

  it("shows a Shop by type row in each category section", () => {
    renderHub();
    const apparel = screen.getByRole("region", { name: "Apparel" });
    expect(
      within(apparel).getByRole("group", { name: "Shop Apparel by type" })
    ).toBeInTheDocument();
    const drinkware = screen.getByRole("region", { name: "Drinkware" });
    expect(
      within(within(drinkware).getByRole("group", { name: "Shop Drinkware by type" }))
        .getAllByRole("button")
        .map((b) => b.textContent)
    ).toEqual(["Tumblers2", "Coffee Mugs1"]);
  });

  it("shows type and brand headings inside the sections in the default view", () => {
    renderHub();
    const apparel = screen.getByRole("region", { name: "Apparel" });
    expect(
      within(apparel).getByRole("heading", { level: 3, name: "Polos (7)" })
    ).toBeInTheDocument();
    expect(
      within(apparel).getByRole("heading", { level: 4, name: "Peter Millar (3)" })
    ).toBeInTheDocument();
  });

  it("a type chip focuses that category and type, in the URL", () => {
    renderHub();
    const drinkware = screen.getByRole("region", { name: "Drinkware" });
    fireEvent.click(within(drinkware).getByRole("button", { name: /^Coffee Mugs/ }));
    expect(window.location.search).toContain("category=Drinkware");
    expect(window.location.search).toContain("type=Coffee+Mugs");
    expect(screen.queryByRole("region", { name: "Apparel" })).toBeNull();
    expect(
      within(screen.getByRole("region", { name: "Drinkware" })).getAllByRole("article")
    ).toHaveLength(1);
    fireEvent.click(screen.getByRole("button", { name: "Remove filter: Type: Coffee Mugs" }));
    expect(window.location.search).toContain("category=Drinkware");
    expect(window.location.search).not.toContain("type=");
  });

  it("picking another category drops the type, and a shared link restores it", () => {
    window.history.replaceState(null, "", "/merchandise?category=Apparel&type=T-Shirts");
    renderHub();
    expect(
      within(screen.getByRole("region", { name: "Apparel" })).getAllByRole("article")
    ).toHaveLength(3);
    fireEvent.click(screen.getByRole("button", { name: /^Drinkware/ }));
    expect(window.location.search).toContain("category=Drinkware");
    expect(window.location.search).not.toContain("type=");
  });

  it("is flat with a sort other than relevance", () => {
    renderHub();
    fireEvent.change(screen.getByLabelText("Sort products"), { target: { value: "price-asc" } });
    expect(screen.queryByRole("heading", { name: /Polos \(/ })).toBeNull();
    expect(screen.queryByRole("group", { name: /Shop .* by type/ })).toBeNull();
  });
});
