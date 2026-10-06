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

  it("sorts by price within each category", () => {
    renderCatalog();
    const names = () =>
      within(section("Drinkware"))
        .getAllByRole("heading", { level: 3 })
        .map((h) => h.textContent);
    expect(names()).toEqual(["Mug 0", "Mug 1", "Mug 2", "Mug 3", "Mug 4"]);
    fireEvent.change(screen.getByRole("combobox", { name: "Sort products" }), {
      target: { value: "price-desc" },
    });
    expect(names()).toEqual(["Mug 4", "Mug 3", "Mug 2", "Mug 1", "Mug 0"]);
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
