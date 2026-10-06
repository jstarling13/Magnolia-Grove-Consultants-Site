import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import CategoryProductGrid from "@/components/merchandise/CategoryProductGrid";
import { LogoProvider } from "@/components/merchandise/LogoContext";
import type { CatalogProduct } from "@/lib/merchCatalog";

function make(id: number, overrides: Partial<CatalogProduct> = {}): CatalogProduct {
  return {
    id: `p-${id}`,
    name: `Item ${String(id).padStart(3, "0")}`,
    category: "Apparel",
    brand: "Essentials",
    description: `Description ${id}`,
    tiers: [{ quantity: 50, price: id }],
    imprintArea: { top: 40, left: 50, width: 20 },
    ...overrides,
  };
}

const PRODUCTS = Array.from({ length: 30 }, (_, i) =>
  make(i + 1, i === 0 ? { brand: "Nike", name: "Nike Tee" } : {})
);

function renderGrid() {
  return render(
    <LogoProvider>
      <CategoryProductGrid products={PRODUCTS} category="Apparel" />
    </LogoProvider>
  );
}

describe("CategoryProductGrid", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    window.history.replaceState(null, "", "/merchandise/category/apparel");
  });
  afterEach(() => vi.useRealTimers());

  it("starts at 24 cards and reveals the rest with Show more", () => {
    renderGrid();
    expect(screen.getAllByRole("article")).toHaveLength(24);
    fireEvent.click(screen.getByRole("button", { name: /show 6 more/i }));
    expect(screen.getAllByRole("article")).toHaveLength(30);
    expect(screen.queryByRole("button", { name: /show \d+ more/i })).toBeNull();
  });

  it("sorts, filters by brand and mirrors them in the URL", () => {
    renderGrid();
    fireEvent.change(screen.getByLabelText("Sort products"), { target: { value: "price-desc" } });
    expect(screen.getAllByRole("article")[0]).toHaveTextContent("Item 030");
    fireEvent.change(screen.getByLabelText("Filter by brand"), { target: { value: "Nike" } });
    expect(screen.getAllByRole("article")).toHaveLength(1);
    expect(window.location.search).toContain("brand=Nike");
    expect(window.location.search).toContain("sort=price-desc");
  });

  it("searches after the debounce and can clear filters", () => {
    renderGrid();
    fireEvent.change(screen.getByLabelText("Search Apparel"), { target: { value: "nike" } });
    act(() => {
      vi.advanceTimersByTime(250);
    });
    expect(screen.getAllByRole("article")).toHaveLength(1);
    fireEvent.click(screen.getAllByRole("button", { name: "Clear all" })[0]);
    expect(screen.getAllByRole("article")).toHaveLength(24);
  });

  it("restores filters from the URL", () => {
    window.history.replaceState(null, "", "/merchandise/category/apparel?brand=Nike");
    renderGrid();
    expect(screen.getAllByRole("article")).toHaveLength(1);
  });
});
