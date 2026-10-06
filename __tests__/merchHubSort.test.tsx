import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LogoProvider } from "@/components/merchandise/LogoContext";
import ProductCatalog from "@/components/merchandise/ProductCatalog";
import { startingTier } from "@/lib/merchCatalog";
import { getStorefrontCatalog } from "@/lib/merchStorefront";

// The real catalog, every card on hand (nothing is fetched).
const catalog = getStorefrontCatalog();

beforeEach(() => {
  window.history.replaceState(null, "", "/merchandise");
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response("nope", { status: 404 }))
  );
});
afterEach(() => {
  vi.unstubAllGlobals();
  window.localStorage.clear();
});

function renderHub() {
  return render(
    <LogoProvider>
      <ProductCatalog products={catalog.products} categories={catalog.categories} />
    </LogoProvider>
  );
}

/** The "$12.34" shown on each card, in page order. */
function cardPrices(): number[] {
  return screen.getAllByRole("article").map((card) => {
    const text = within(card).getByText(/^\$[\d,]+\.\d{2}$/).textContent!;
    return Number(text.replace(/[$,]/g, ""));
  });
}

function pick(sort: string) {
  fireEvent.change(screen.getByRole("combobox", { name: "Sort products" }), {
    target: { value: sort },
  });
}

describe("hub sort on the real catalog", () => {
  it("has several categories, so a per-category sort would not be global", () => {
    expect(catalog.categories.length).toBeGreaterThan(5);
    expect(catalog.products.length).toBeGreaterThan(1000);
  });

  it("keeps category sections, 8 cards each, for the default sort", () => {
    renderHub();
    expect(screen.getAllByRole("region").length).toBeGreaterThan(5);
    expect(screen.queryByRole("region", { name: "All products" })).toBeNull();
    const first = screen.getAllByRole("region")[0];
    expect(within(first).getAllByRole("article")).toHaveLength(8);
  });

  it("price low to high: one list, and the first 30 cards are the 30 cheapest in the catalog", () => {
    renderHub();
    pick("price-asc");
    expect(screen.getAllByRole("region")).toHaveLength(1);
    const list = within(screen.getByRole("region", { name: "All products" }));
    fireEvent.click(list.getByRole("button", { name: /^Show \d+ more results$/ }));

    const shown = cardPrices();
    expect(shown.length).toBeGreaterThanOrEqual(30);
    const first30 = shown.slice(0, 30);
    expect(first30).toEqual([...first30].sort((a, b) => a - b));

    const cheapest = catalog.products
      .map((product) => startingTier(product).price)
      .sort((a, b) => a - b)
      .slice(0, 30);
    expect(first30).toEqual(cheapest);
    // Cards come from more than one category.
    expect(list.getAllByText(/^in /).length).toBeGreaterThan(0);
  });

  it("price high to low: the first 30 cards are the 30 most expensive", () => {
    renderHub();
    pick("price-desc");
    const list = within(screen.getByRole("region", { name: "All products" }));
    fireEvent.click(list.getByRole("button", { name: /^Show \d+ more results$/ }));
    const first30 = cardPrices().slice(0, 30);
    const dearest = catalog.products
      .map((product) => startingTier(product).price)
      .sort((a, b) => b - a)
      .slice(0, 30);
    expect(first30).toEqual(dearest);
  });

  it("every other sort is a single flat list too", () => {
    renderHub();
    for (const sort of ["moq-asc", "colors-desc", "name"]) {
      pick(sort);
      expect(screen.getAllByRole("region"), sort).toHaveLength(1);
      expect(screen.getByRole("region", { name: "All products" })).toBeInTheDocument();
    }
  });

  it("the status line counts the whole catalog", () => {
    renderHub();
    pick("name");
    expect(screen.getByRole("status")).toHaveTextContent(
      `Showing ${catalog.products.length.toLocaleString("en-US")} products`
    );
  });
});
