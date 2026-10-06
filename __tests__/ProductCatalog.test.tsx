import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ProductCatalog from "@/components/merchandise/ProductCatalog";
import { LogoProvider } from "@/components/merchandise/LogoContext";
import type { CatalogProduct } from "@/lib/merchCatalog";

const AREA = { top: 40, left: 50, width: 20 };

function make(
  id: number,
  category: string,
  overrides: Partial<CatalogProduct> = {}
): CatalogProduct {
  return {
    id: `p-${id}`,
    name: `Product ${String(id).padStart(3, "0")}`,
    category,
    brand: "Essentials",
    description: `Description for ${id}`,
    tiers: [{ quantity: 50, price: id }],
    imprintArea: AREA,
    ...overrides,
  };
}

// 30 apparel (one with a real brand + colors) and 5 drinkware.
const apparel = Array.from({ length: 30 }, (_, i) =>
  make(
    i + 1,
    "Apparel",
    i === 0 ? { brand: "Nike", name: "Nike Tee", colors: ["Navy Blue", "Red", "Black/Gray"] } : {}
  )
);
const drinkware = Array.from({ length: 5 }, (_, i) =>
  make(100 + i, "Drinkware", { name: `Mug ${i}` })
);
const PRODUCTS = [...apparel, ...drinkware];
const CATEGORIES = ["Apparel", "Drinkware", "Bags"];

function renderCatalog(products = PRODUCTS) {
  return render(
    <LogoProvider>
      <ProductCatalog products={products} categories={CATEGORIES} />
    </LogoProvider>
  );
}

function section(name: string) {
  return screen.getByRole("region", { name });
}

function cardCount(name: string) {
  return within(section(name)).queryAllByRole("article").length;
}

describe("ProductCatalog progressive disclosure", () => {
  beforeEach(() => {
    window.history.replaceState(null, "", "/merchandise");
  });

  it("starts each category at 8 cards with a 'Show more' control", () => {
    renderCatalog();
    expect(cardCount("Apparel")).toBe(8);
    expect(cardCount("Drinkware")).toBe(5);
    expect(screen.getByText("Showing 8 of 30")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Show 22 more Apparel products" })
    ).toBeInTheDocument();
    // Drinkware fits in one page: no controls.
    expect(within(section("Drinkware")).queryByRole("button", { name: /Show/ })).toBeNull();
  });

  it("reveals the next batch, never more than remain, then 'Show fewer' collapses", () => {
    renderCatalog();
    fireEvent.click(screen.getByRole("button", { name: /Show 22 more Apparel/ }));
    expect(cardCount("Apparel")).toBe(30);
    expect(screen.getByText("Showing 30 of 30")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /more Apparel/ })).toBeNull();

    window.HTMLElement.prototype.scrollIntoView = vi.fn();
    fireEvent.click(screen.getByRole("button", { name: "Show fewer" }));
    expect(cardCount("Apparel")).toBe(8);
  });

  it("filters to one category via the chips and starts deeper (24)", () => {
    renderCatalog();
    fireEvent.click(screen.getByRole("button", { name: /^Apparel/ }));
    expect(screen.queryByRole("region", { name: "Drinkware" })).toBeNull();
    expect(cardCount("Apparel")).toBe(24);
    expect(screen.getByRole("status")).toHaveTextContent("Showing 30 products in Apparel");
    expect(screen.getByRole("button", { name: /^Apparel/ })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
  });

  it("shows result counts on the chips", () => {
    renderCatalog();
    expect(screen.getByRole("button", { name: /^All/ })).toHaveTextContent("35");
    expect(screen.getByRole("button", { name: /^Drinkware/ })).toHaveTextContent("5");
    expect(screen.getByRole("button", { name: /^Bags/ })).toBeDisabled();
  });
});

describe("ProductCatalog search, sort and empty state", () => {
  beforeEach(() => {
    window.history.replaceState(null, "", "/merchandise");
    vi.useFakeTimers();
  });
  afterEach(() => vi.useRealTimers());

  function type(value: string) {
    fireEvent.change(screen.getByRole("searchbox", { name: "Search products" }), {
      target: { value },
    });
  }

  it("debounces search input", () => {
    renderCatalog();
    type("mug");
    expect(screen.getByRole("status")).toHaveTextContent("Showing 35 products");
    act(() => {
      vi.advanceTimersByTime(250);
    });
    expect(screen.getByRole("status")).toHaveTextContent("Showing 5 products");
  });

  it("searches colors too", () => {
    renderCatalog();
    type("navy");
    act(() => {
      vi.advanceTimersByTime(250);
    });
    expect(screen.getByRole("status")).toHaveTextContent("Showing 1 product");
  });

  it("shows an empty state with Clear all, and clearing restores everything", () => {
    renderCatalog();
    type("zzzz-no-such-thing");
    act(() => {
      vi.advanceTimersByTime(250);
    });
    expect(screen.getByText("No products match your filters.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Request a product" })).toHaveAttribute(
      "href",
      "#request"
    );

    const clear = screen.getAllByRole("button", { name: "Clear all" })[0];
    fireEvent.click(clear);
    act(() => {
      vi.advanceTimersByTime(250);
    });
    expect(screen.getByRole("status")).toHaveTextContent("Showing 35 products");
    expect(screen.queryByRole("button", { name: "Clear all" })).toBeNull();
  });

  it("keeps category sections for the default sort", () => {
    renderCatalog();
    expect(
      within(section("Drinkware"))
        .getAllByRole("heading", { level: 3 })
        .map((h) => h.textContent)
    ).toEqual(["Mug 0", "Mug 1", "Mug 2", "Mug 3", "Mug 4"]);
    expect(screen.queryByRole("region", { name: "All products" })).toBeNull();
  });

  it("sorts browse results as one flat list across every category", () => {
    renderCatalog();
    fireEvent.change(screen.getByRole("combobox", { name: "Sort products" }), {
      target: { value: "price-desc" },
    });
    expect(screen.queryByRole("region", { name: "Apparel" })).toBeNull();
    expect(screen.queryByRole("region", { name: "Drinkware" })).toBeNull();
    const list = within(section("All products"));
    // Drinkware (prices 100..104) outranks every apparel item (1..30).
    const names = list.getAllByRole("heading", { level: 3 }).map((h) => h.textContent);
    expect(names.slice(0, 5)).toEqual(["Mug 4", "Mug 3", "Mug 2", "Mug 1", "Mug 0"]);
    expect(names[5]).toBe("Product 030");
    // Cards say which category they belong to, and the count is the whole catalog.
    expect(list.getAllByText("in Drinkware")).toHaveLength(5);
    expect(screen.getByRole("status")).toHaveTextContent("Showing 35 products");
  });

  it("sorts low to high globally and still pages with Show more", () => {
    renderCatalog();
    fireEvent.change(screen.getByRole("combobox", { name: "Sort products" }), {
      target: { value: "price-asc" },
    });
    const list = within(section("All products"));
    const names = () => list.getAllByRole("heading", { level: 3 }).map((h) => h.textContent);
    expect(names().slice(0, 3)).toEqual(["Nike Tee", "Product 002", "Product 003"]);
    expect(list.getByText("Showing 24 of 35")).toBeInTheDocument();
    fireEvent.click(list.getByRole("button", { name: "Show 11 more results" }));
    expect(names()).toHaveLength(35);
    expect(names().slice(-5)).toEqual(["Mug 0", "Mug 1", "Mug 2", "Mug 3", "Mug 4"]);
  });

  it("returns to category sections when the sort goes back to Relevance", () => {
    renderCatalog();
    const select = screen.getByRole("combobox", { name: "Sort products" });
    fireEvent.change(select, { target: { value: "price-asc" } });
    fireEvent.change(select, { target: { value: "featured" } });
    expect(screen.queryByRole("region", { name: "All products" })).toBeNull();
    expect(cardCount("Apparel")).toBe(8);
  });

  it("keeps the chosen category as its own section when a sort is chosen", () => {
    renderCatalog();
    fireEvent.click(screen.getByRole("button", { name: /^Drinkware/ }));
    fireEvent.change(screen.getByRole("combobox", { name: "Sort products" }), {
      target: { value: "price-desc" },
    });
    expect(
      within(section("Drinkware"))
        .getAllByRole("heading", { level: 3 })
        .map((h) => h.textContent)
    ).toEqual(["Mug 4", "Mug 3", "Mug 2", "Mug 1", "Mug 0"]);
  });
});

describe("ProductCatalog search results", () => {
  // The speaker's category comes first in the hub order, the lanyards' last.
  const SEARCH_CATEGORIES = ["Tech", "Gifts", "Lanyards & Badges"];
  const speaker = make(1, "Tech", {
    name: "Mini Speaker with Lanyard",
    tiers: [{ quantity: 50, price: 0.5 }],
  });
  const gift = make(2, "Gifts", {
    name: "Gift Set",
    description: "Includes a lanyard.",
    tiers: [{ quantity: 50, price: 0.75 }],
  });
  const lanyards = Array.from({ length: 30 }, (_, i) =>
    make(10 + i, "Lanyards & Badges", {
      name: `Lanyard ${String(i).padStart(2, "0")}`,
      tiers: [{ quantity: 50, price: 30 - i }],
    })
  );

  function renderSearch() {
    render(
      <LogoProvider>
        <ProductCatalog products={[speaker, gift, ...lanyards]} categories={SEARCH_CATEGORIES} />
      </LogoProvider>
    );
    fireEvent.change(screen.getByRole("searchbox", { name: "Search products" }), {
      target: { value: "lanyard" },
    });
    act(() => {
      vi.advanceTimersByTime(250);
    });
  }

  const titles = () => screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent);

  beforeEach(() => {
    window.history.replaceState(null, "", "/merchandise");
    vi.useFakeTimers();
  });
  afterEach(() => vi.useRealTimers());

  it("shows one relevance-ordered list, not a section per category in hub order", () => {
    renderSearch();
    expect(screen.getByRole("region", { name: "Search results" })).toBeInTheDocument();
    for (const name of SEARCH_CATEGORIES) {
      expect(screen.queryByRole("region", { name })).toBeNull();
    }
    // the real lanyards lead; the speaker and the gift (description only) come after them
    expect(titles().slice(0, 3)).toEqual(["Lanyard 00", "Lanyard 01", "Lanyard 02"]);
    expect(screen.getByRole("status")).toHaveTextContent("Showing 32 products, best matches first");
  });

  it("labels each card with its category and keeps the category chips with counts", () => {
    renderSearch();
    const results = screen.getByRole("region", { name: "Search results" });
    expect(within(results).getAllByText("in Lanyards & Badges")).toHaveLength(24);
    expect(screen.getByRole("button", { name: /^Lanyards & Badges/ })).toHaveTextContent("30");
    expect(screen.getByRole("button", { name: /^Tech/ })).toHaveTextContent("1");
    expect(screen.getByRole("button", { name: /^All/ })).toHaveTextContent("32");
  });

  it("starts at 24 results and reveals the rest with one 'Show more'", () => {
    renderSearch();
    expect(titles()).toHaveLength(24);
    expect(screen.getByText("Showing 24 of 32")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Show 8 more results" }));
    expect(titles()).toHaveLength(32);
    expect(titles().slice(-2)).toEqual(["Mini Speaker with Lanyard", "Gift Set"]);
  });

  it("applies a chosen sort to the whole list, across categories", () => {
    renderSearch();
    fireEvent.change(screen.getByRole("combobox", { name: "Sort products" }), {
      target: { value: "price-asc" },
    });
    expect(titles().slice(0, 3)).toEqual(["Mini Speaker with Lanyard", "Gift Set", "Lanyard 29"]);
    expect(screen.getByRole("status")).toHaveTextContent("Showing 32 products");
    expect(screen.getByRole("status")).not.toHaveTextContent("best matches first");
  });

  it("narrows to one category from its chip, still in relevance order", () => {
    renderSearch();
    fireEvent.click(screen.getByRole("button", { name: /^Tech/ }));
    expect(screen.getByRole("region", { name: "Tech" })).toBeInTheDocument();
    expect(titles()).toEqual(["Mini Speaker with Lanyard"]);
    fireEvent.click(screen.getByRole("button", { name: /^All/ }));
    expect(screen.getByRole("region", { name: "Search results" })).toBeInTheDocument();
  });
});

describe("ProductCatalog cards", () => {
  beforeEach(() => {
    window.history.replaceState(null, "", "/merchandise");
  });

  it("labels real brands and hides 'Essentials'", () => {
    renderCatalog();
    const nike = screen.getByRole("heading", { name: "Nike Tee" }).closest("article")!;
    expect(within(nike).getByText("Nike")).toBeInTheDocument();
    expect(screen.queryByText("Essentials")).toBeNull();
  });

  it("shows 'From $X at N+ units' only when there are quantity breaks", () => {
    const tiered = make(500, "Apparel", {
      name: "Tiered",
      tiers: [
        { quantity: 25, price: 5 },
        { quantity: 250, price: 3.5 },
      ],
    });
    renderCatalog([tiered, make(501, "Apparel", { name: "Flat" })]);
    const card = screen.getByRole("heading", { name: "Tiered" }).closest("article")!;
    expect(card).toHaveTextContent("From");
    expect(card).toHaveTextContent("$5.00");
    expect(card).toHaveTextContent("at 25+ units");
    expect(card).toHaveTextContent("As low as $3.50 at 250+ units");
    const flat = screen.getByRole("heading", { name: "Flat" }).closest("article")!;
    expect(flat).not.toHaveTextContent("From");
  });

  it("selecting a card swatch shows its name and carries it into the detail link", () => {
    renderCatalog();
    const nike = screen.getByRole("heading", { name: "Nike Tee" }).closest("article")!;
    const swatch = within(nike).getByRole("button", { name: "Select color Navy Blue" });
    fireEvent.click(swatch);
    expect(swatch).toHaveAttribute("aria-pressed", "true");
    expect(within(nike).getByText("Navy Blue")).toBeInTheDocument();
    expect(within(nike).getByRole("link", { name: "Nike Tee" })).toHaveAttribute(
      "href",
      "/merchandise/p-1?color=Navy%20Blue"
    );
  });

  it("never nests interactive swatches inside the card link", () => {
    renderCatalog();
    const nike = screen.getByRole("heading", { name: "Nike Tee" }).closest("article")!;
    const swatch = within(nike).getByRole("button", { name: "Select color Red" });
    expect(swatch.closest("a")).toBeNull();
  });
});
