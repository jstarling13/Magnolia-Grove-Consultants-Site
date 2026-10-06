import fs from "node:fs";
import path from "node:path";
import { renderToString } from "react-dom/server";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import CategoryProductGrid from "@/components/merchandise/CategoryProductGrid";
import { LogoProvider } from "@/components/merchandise/LogoContext";
import ProductCatalog from "@/components/merchandise/ProductCatalog";
import type { CatalogProduct } from "@/lib/merchCatalog";

const AREA = { top: 40, left: 50, width: 20 };

function make(id: number, category: string, overrides: Partial<CatalogProduct> = {}) {
  return {
    id: `p-${id}`,
    name: `${category} ${String(id).padStart(3, "0")}`,
    category,
    brand: "Essentials",
    description: `Description for ${id}`,
    tiers: [{ quantity: 50, price: id }],
    imprintArea: AREA,
    ...overrides,
  } satisfies CatalogProduct;
}

const COLORS = Array.from({ length: 10 }, (_, i) => `Color ${i}`);

// 12 apparel and 6 bags, with a few that have each filterable trait.
const APPAREL = Array.from({ length: 12 }, (_, i) => {
  const id = i + 1;
  const overrides: Partial<CatalogProduct> = {};
  if (id % 4 === 0) overrides.description = "Made in the USA. Soft cotton.";
  if (id % 3 === 0) overrides.colors = COLORS;
  if (id === 6 || id === 9) overrides.colorImages = { "Color 0": "/x.webp" };
  if (id <= 2) overrides.tiers = [{ quantity: 25, price: id + 0.5 }];
  if (id === 12) overrides.tiers = [{ quantity: 250, price: 40 }];
  return make(id, "Apparel", overrides);
});
const BAGS = Array.from({ length: 6 }, (_, i) =>
  make(100 + i, "Bags", { name: `Tote ${i}`, tiers: [{ quantity: 100, price: 3 + i * 10 }] })
);
const PRODUCTS = [...APPAREL, ...BAGS];
const CATEGORIES = ["Apparel", "Bags"];

const apparelIds = (pred: (id: number) => boolean) => APPAREL.filter((_, i) => pred(i + 1)).length;

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  window.history.replaceState(null, "", "/merchandise");
  fetchMock = vi.fn(async () => new Response("nope", { status: 404 }));
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  window.localStorage.clear();
});

function renderHub() {
  return render(
    <LogoProvider>
      <ProductCatalog products={PRODUCTS} categories={CATEGORIES} />
    </LogoProvider>
  );
}

const status = () => screen.getByRole("status");
const toggle = () => screen.getByRole("button", { name: /^Filters/ });
const openPanel = () => {
  if (toggle().getAttribute("aria-expanded") !== "true") fireEvent.click(toggle());
  return screen.getByRole("group", { name: "Product filters" });
};
const chip = (label: string) => screen.queryByRole("button", { name: `Remove filter: ${label}` });
const articles = () => screen.getAllByRole("article");

describe("filters panel (disclosure)", () => {
  it("is closed on first render, and rendered that way on the server (no layout shift)", () => {
    const html = renderToString(
      <LogoProvider>
        <ProductCatalog products={PRODUCTS} categories={CATEGORIES} />
      </LogoProvider>
    );
    expect(html).toMatch(/aria-expanded="false"/);
    expect(html).toMatch(/id="catalog-filters-panel"[^>]*hidden/);
    expect(html).not.toContain("Remove filter");
    expect(html).not.toContain("Clear all");
    expect(html).toContain("Showing 18 products");
  });

  it("opens and closes from the keyboard-reachable button, with Escape returning focus", () => {
    renderHub();
    const button = toggle();
    expect(button).toHaveAttribute("aria-expanded", "false");
    expect(button).toHaveAttribute("aria-controls", "catalog-filters-panel");
    expect(screen.queryByRole("group", { name: "Product filters" })).toBeNull();

    fireEvent.click(button);
    expect(button).toHaveAttribute("aria-expanded", "true");
    const panel = screen.getByRole("group", { name: "Product filters" });
    expect(panel).toBeVisible();

    const box = within(panel).getByRole("checkbox", { name: "Made in USA" });
    box.focus();
    fireEvent.keyDown(box, { key: "Escape" });
    expect(button).toHaveAttribute("aria-expanded", "false");
    expect(document.activeElement).toBe(button);
  });

  it("'Done' closes the panel and puts focus back on the button", () => {
    renderHub();
    const panel = openPanel();
    fireEvent.click(within(panel).getByRole("button", { name: "Done" }));
    expect(toggle()).toHaveAttribute("aria-expanded", "false");
    expect(document.activeElement).toBe(toggle());
  });

  it("offers every filter as a native checkbox or radio with a label", () => {
    renderHub();
    const panel = openPanel();
    for (const name of ["Made in USA", "10+ colors", "Has color photos"]) {
      expect(within(panel).getByRole("checkbox", { name })).not.toBeChecked();
    }
    expect(within(panel).getByRole("radio", { name: "Any price" })).toBeChecked();
    expect(within(panel).getByRole("radio", { name: "Any quantity" })).toBeChecked();
    for (const name of ["25 units or fewer", "100 units or fewer", "250 units or fewer"]) {
      expect(within(panel).getByRole("radio", { name })).not.toBeChecked();
    }
    // price choices come from the products on hand
    expect(within(panel).getAllByRole("radio").length).toBeGreaterThanOrEqual(2 + 4 + 3);
  });

  it("uses 44px touch targets on the toolbar, the panel and the chips", () => {
    renderHub();
    const panel = openPanel();
    fireEvent.click(within(panel).getByRole("checkbox", { name: "Made in USA" }));
    const targets = [
      screen.getByRole("searchbox", { name: "Search products" }),
      screen.getByRole("combobox", { name: "Sort products" }),
      toggle(),
      within(panel).getByRole("button", { name: "Done" }),
      screen.getByRole("button", { name: "Clear all" }),
      chip("Made in USA")!,
    ];
    for (const element of targets) expect(element.className).toContain("min-h-[44px]");
    for (const label of within(panel)
      .getAllByRole("checkbox")
      .map((box) => box.closest("label")!)) {
      expect(label.className).toContain("min-h-[44px]");
    }
  });
});

describe("applying filters", () => {
  it("Made in USA narrows the results, shows a chip, counts it and writes ?usa=1", () => {
    renderHub();
    expect(status()).toHaveTextContent("Showing 18 products");
    fireEvent.click(within(openPanel()).getByRole("checkbox", { name: "Made in USA" }));

    const usa = apparelIds((id) => id % 4 === 0);
    expect(status()).toHaveTextContent(`Showing ${usa} products`);
    expect(articles()).toHaveLength(usa);
    expect(chip("Made in USA")).toBeInTheDocument();
    expect(toggle()).toHaveTextContent("Filters (1)");
    expect(window.location.search).toBe("?usa=1");
    // Bags have nothing made in the USA, so their pill is disabled and Apparel's count is exact.
    expect(screen.getByRole("button", { name: /^Bags/ })).toBeDisabled();
    expect(screen.getByRole("button", { name: /^Apparel/ })).toHaveTextContent(String(usa));
  });

  it("price bucket, minimum order, 10+ colors and color photos all work and combine", () => {
    renderHub();
    const panel = openPanel();

    fireEvent.click(within(panel).getByRole("checkbox", { name: "10+ colors" }));
    expect(articles()).toHaveLength(apparelIds((id) => id % 3 === 0));
    expect(window.location.search).toBe("?colors=10");

    fireEvent.click(within(panel).getByRole("checkbox", { name: "Has color photos" }));
    expect(articles()).toHaveLength(2); // 6 and 9 have photos and 10 colors
    expect(window.location.search).toContain("photos=1");

    fireEvent.click(within(panel).getByRole("radio", { name: "100 units or fewer" }));
    expect(window.location.search).toContain("minqty=100");
    expect(articles()).toHaveLength(2); // both have a 50-unit minimum

    fireEvent.click(within(panel).getByRole("radio", { name: "25 units or fewer" }));
    expect(screen.getByRole("status")).toHaveTextContent("No products found");
    expect(screen.getByText("No products match your filters.")).toBeInTheDocument();

    fireEvent.click(within(panel).getByRole("radio", { name: "Any quantity" }));
    expect(articles()).toHaveLength(2);
    expect(window.location.search).not.toContain("minqty");
  });

  it("price radios filter on the first-tier price", () => {
    renderHub();
    const panel = openPanel();
    const prices = within(panel)
      .getAllByRole("radio")
      .map((radio) => radio.closest("label")!.textContent!);
    const under = prices.find((label) => label.startsWith("Under"))!;
    fireEvent.click(within(panel).getByRole("radio", { name: under }));
    const shown = articles().map((article) => article.textContent!);
    expect(shown.length).toBeGreaterThan(0);
    expect(shown.length).toBeLessThan(18);
    expect(window.location.search).toMatch(/^\?price=-[\d.]+$/);
    expect(screen.getByRole("button", { name: `Remove filter: Price: ${under}` })).toBeVisible();
  });

  it("a search and a filter work together, and the search chip is removable", () => {
    vi.useFakeTimers();
    renderHub();
    fireEvent.change(screen.getByRole("searchbox", { name: "Search products" }), {
      target: { value: "tote" },
    });
    act(() => {
      vi.advanceTimersByTime(250);
    });
    expect(status()).toHaveTextContent("Showing 6 products");
    expect(chip("Search: tote")).toBeInTheDocument();

    fireEvent.click(within(openPanel()).getByRole("radio", { name: "100 units or fewer" }));
    expect(status()).toHaveTextContent("Showing 6 products");

    fireEvent.click(chip("Search: tote")!);
    expect(screen.getByRole("searchbox", { name: "Search products" })).toHaveValue("");
    expect(window.location.search).toBe("?minqty=100");
    // every apparel item but the 250-unit one, plus the six bags
    expect(status()).toHaveTextContent("Showing 17 products");
  });

  it("sorts by lowest minimum order and by most colors", () => {
    renderHub();
    const names = () =>
      within(screen.getByRole("region", { name: "Apparel" }))
        .getAllByRole("heading", { level: 3 })
        .map((heading) => heading.textContent);
    fireEvent.change(screen.getByRole("combobox", { name: "Sort products" }), {
      target: { value: "moq-asc" },
    });
    expect(names().slice(0, 2)).toEqual(["Apparel 001", "Apparel 002"]);
    expect(window.location.search).toBe("?sort=moq-asc");

    fireEvent.change(screen.getByRole("combobox", { name: "Sort products" }), {
      target: { value: "colors-desc" },
    });
    expect(names().slice(0, 4)).toEqual([
      "Apparel 003",
      "Apparel 006",
      "Apparel 009",
      "Apparel 012",
    ]);
    expect(window.location.search).toBe("?sort=colors-desc");
  });

  it("fetches nothing when every card is already here", () => {
    renderHub();
    fireEvent.click(within(openPanel()).getByRole("checkbox", { name: "Made in USA" }));
    fireEvent.change(screen.getByRole("combobox", { name: "Sort products" }), {
      target: { value: "price-asc" },
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("active filter chips, Clear all and the live region", () => {
  it("the result count is a polite, atomic live region that follows every change", () => {
    renderHub();
    const live = status();
    expect(live).toHaveAttribute("aria-live", "polite");
    expect(live).toHaveAttribute("aria-atomic", "true");
    expect(live).toHaveTextContent("Showing 18 products");

    fireEvent.click(within(openPanel()).getByRole("checkbox", { name: "Made in USA" }));
    // the same element is updated in place, which is what a live region announces
    expect(status()).toBe(live);
    expect(live).toHaveTextContent(`Showing ${apparelIds((id) => id % 4 === 0)} products`);

    fireEvent.click(within(openPanel()).getByRole("radio", { name: "25 units or fewer" }));
    expect(live).toHaveTextContent("No products found");
  });

  it("lists active filters in a labelled list of removable chips", () => {
    renderHub();
    const panel = openPanel();
    fireEvent.click(within(panel).getByRole("checkbox", { name: "Made in USA" }));
    fireEvent.click(within(panel).getByRole("checkbox", { name: "10+ colors" }));
    const list = screen.getByRole("list", { name: "Active filters" });
    expect(within(list).getAllByRole("listitem")).toHaveLength(2);
    expect(within(list).getByText("Made in USA")).toBeInTheDocument();
    expect(within(list).getByText("10+ colors")).toBeInTheDocument();
  });

  it("removing a chip unchecks its control, restores results and moves focus to the next chip", () => {
    renderHub();
    const panel = openPanel();
    fireEvent.click(within(panel).getByRole("checkbox", { name: "Made in USA" }));
    fireEvent.click(within(panel).getByRole("checkbox", { name: "10+ colors" }));
    fireEvent.click(within(panel).getByRole("checkbox", { name: "Has color photos" }));
    expect(window.location.search).toBe("?usa=1&colors=10&photos=1");

    fireEvent.click(chip("Made in USA")!);
    expect(within(panel).getByRole("checkbox", { name: "Made in USA" })).not.toBeChecked();
    expect(chip("Made in USA")).toBeNull();
    expect(window.location.search).toBe("?colors=10&photos=1");
    expect(document.activeElement).toBe(chip("10+ colors"));

    // the last chip hands focus to the Filters button
    fireEvent.click(chip("10+ colors")!);
    expect(document.activeElement).toBe(chip("Has color photos"));
    fireEvent.click(chip("Has color photos")!);
    expect(document.activeElement).toBe(toggle());
    expect(screen.queryByRole("list", { name: "Active filters" })).toBeNull();
    expect(status()).toHaveTextContent("Showing 18 products");
    expect(window.location.search).toBe("");
  });

  it("Clear all drops every filter, the search and the category, keeps the sort, and focuses the Filters button", () => {
    vi.useFakeTimers();
    renderHub();
    const panel = openPanel();
    fireEvent.click(within(panel).getByRole("checkbox", { name: "Made in USA" }));
    fireEvent.click(within(panel).getByRole("radio", { name: "100 units or fewer" }));
    fireEvent.change(screen.getByRole("combobox", { name: "Sort products" }), {
      target: { value: "name" },
    });
    fireEvent.click(screen.getByRole("button", { name: /^Apparel/ }));
    fireEvent.change(screen.getByRole("searchbox", { name: "Search products" }), {
      target: { value: "cotton" },
    });
    act(() => {
      vi.advanceTimersByTime(250);
    });
    expect(window.location.search).toContain("category=Apparel");
    expect(window.location.search).toContain("q=cotton");

    fireEvent.click(screen.getByRole("button", { name: "Clear all" }));
    expect(window.location.search).toBe("?sort=name");
    expect(screen.queryByRole("button", { name: "Clear all" })).toBeNull();
    expect(screen.queryByRole("list", { name: "Active filters" })).toBeNull();
    expect(screen.getByRole("searchbox", { name: "Search products" })).toHaveValue("");
    expect(within(panel).getByRole("checkbox", { name: "Made in USA" })).not.toBeChecked();
    expect(within(panel).getByRole("radio", { name: "Any quantity" })).toBeChecked();
    expect(status()).toHaveTextContent("Showing 18 products");
    expect(document.activeElement).toBe(toggle());
  });

  it("the empty state offers the same Clear all", () => {
    renderHub();
    const panel = openPanel();
    fireEvent.click(within(panel).getByRole("checkbox", { name: "Has color photos" }));
    fireEvent.click(within(panel).getByRole("radio", { name: "25 units or fewer" }));
    expect(screen.getByText("No products match your filters.")).toBeInTheDocument();
    const clears = screen.getAllByRole("button", { name: "Clear all" });
    expect(clears.length).toBe(2);
    fireEvent.click(clears[1]);
    expect(articles().length).toBe(14);
    expect(document.activeElement).toBe(toggle());
  });
});

describe("the URL is the state", () => {
  it("restores every filter from a shared link", () => {
    window.history.replaceState(
      null,
      "",
      "/merchandise?usa=1&minqty=100&colors=10&photos=1&sort=price-desc"
    );
    renderHub();
    expect(toggle()).toHaveTextContent("Filters (4)");
    expect(chip("Made in USA")).toBeInTheDocument();
    expect(chip("Minimum order: 100 or fewer")).toBeInTheDocument();
    expect(chip("10+ colors")).toBeInTheDocument();
    expect(chip("Has color photos")).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Sort products" })).toHaveValue("price-desc");
    const panel = openPanel();
    expect(within(panel).getByRole("checkbox", { name: "Made in USA" })).toBeChecked();
    expect(within(panel).getByRole("radio", { name: "100 units or fewer" })).toBeChecked();
    expect(status()).toHaveTextContent("No products found");
  });

  it("a price range that is not one of the buckets still shows, selected", () => {
    window.history.replaceState(null, "", "/merchandise?price=7-9");
    renderHub();
    expect(chip("Price: $7 to $9")).toBeInTheDocument();
    expect(within(openPanel()).getByRole("radio", { name: "$7 to $9" })).toBeChecked();
  });

  it("ignores junk in the URL", () => {
    window.history.replaceState(null, "", "/merchandise?usa=maybe&minqty=3&price=cheap&sort=zzz");
    renderHub();
    expect(articles()).toHaveLength(14);
    expect(screen.queryByRole("list", { name: "Active filters" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Clear all" })).toBeNull();
  });

  it("each choice adds a history entry, and Back and Forward replay them", async () => {
    renderHub();
    const before = window.history.length;
    const panel = openPanel();
    fireEvent.click(within(panel).getByRole("checkbox", { name: "Made in USA" }));
    fireEvent.click(within(panel).getByRole("radio", { name: "100 units or fewer" }));
    expect(window.history.length).toBe(before + 2);
    expect(window.location.search).toBe("?usa=1&minqty=100");

    window.history.back();
    await waitFor(() => expect(window.location.search).toBe("?usa=1"));
    await waitFor(() => expect(chip("Minimum order: 100 or fewer")).toBeNull());
    expect(chip("Made in USA")).toBeInTheDocument();
    expect(within(panel).getByRole("radio", { name: "Any quantity" })).toBeChecked();

    window.history.back();
    await waitFor(() => expect(window.location.search).toBe(""));
    await waitFor(() => expect(chip("Made in USA")).toBeNull());
    expect(within(panel).getByRole("checkbox", { name: "Made in USA" })).not.toBeChecked();
    expect(status()).toHaveTextContent("Showing 18 products");

    window.history.forward();
    await waitFor(() => expect(chip("Made in USA")).toBeInTheDocument());
  });

  it("typing in the search box replaces the entry instead of piling up history", () => {
    vi.useFakeTimers();
    renderHub();
    const before = window.history.length;
    const input = screen.getByRole("searchbox", { name: "Search products" });
    for (const value of ["t", "to", "tot", "tote"]) {
      fireEvent.change(input, { target: { value } });
      act(() => {
        vi.advanceTimersByTime(250);
      });
    }
    expect(window.history.length).toBe(before);
    expect(window.location.search).toBe("?q=tote");
  });

  it("keeps parameters it does not own", () => {
    window.history.replaceState(null, "", "/merchandise?utm_source=mail");
    renderHub();
    fireEvent.click(within(openPanel()).getByRole("checkbox", { name: "Made in USA" }));
    expect(new URLSearchParams(window.location.search).get("utm_source")).toBe("mail");
    fireEvent.click(chip("Made in USA")!);
    expect(window.location.search).toBe("?utm_source=mail");
  });
});

describe("filters on a category page", () => {
  function renderGrid() {
    window.history.replaceState(null, "", "/merchandise/category/apparel");
    return render(
      <LogoProvider>
        <CategoryProductGrid products={APPAREL} category="Apparel" />
      </LogoProvider>
    );
  }

  it("filters, chips, Clear all and the URL work the same way", () => {
    renderGrid();
    expect(status()).toHaveTextContent("Showing 12 products");
    const panel = openPanel();
    fireEvent.click(within(panel).getByRole("checkbox", { name: "Made in USA" }));
    expect(status()).toHaveTextContent("Showing 3 products");
    expect(articles()).toHaveLength(3);
    expect(window.location.search).toBe("?usa=1");

    fireEvent.click(within(panel).getByRole("radio", { name: "25 units or fewer" }));
    expect(status()).toHaveTextContent("No products found");
    fireEvent.click(chip("Minimum order: 25 or fewer")!);
    expect(status()).toHaveTextContent("Showing 3 products");

    fireEvent.click(screen.getByRole("button", { name: "Clear all" }));
    expect(status()).toHaveTextContent("Showing 12 products");
    expect(window.location.search).toBe("");
    expect(document.activeElement).toBe(toggle());
  });

  it("never writes a category parameter, and has its own price buckets and sort keys", () => {
    renderGrid();
    fireEvent.click(within(openPanel()).getByRole("checkbox", { name: "10+ colors" }));
    fireEvent.change(screen.getByRole("combobox", { name: "Sort products" }), {
      target: { value: "moq-asc" },
    });
    expect(window.location.search).toBe("?colors=10&sort=moq-asc");
    expect(within(openPanel()).getAllByRole("radio").length).toBeGreaterThanOrEqual(2 + 4 + 3);
    const options = within(screen.getByRole("combobox", { name: "Sort products" }))
      .getAllByRole("option")
      .map((option) => option.textContent);
    expect(options).toEqual([
      "Relevance",
      "Price: Low to High",
      "Price: High to Low",
      "Lowest Minimum Order",
      "Most Colors",
      "Name: A to Z",
    ]);
  });

  it("restores filters from the URL and Back undoes the last choice", async () => {
    window.history.replaceState(null, "", "/merchandise/category/apparel?colors=10&usa=1");
    render(
      <LogoProvider>
        <CategoryProductGrid products={APPAREL} category="Apparel" />
      </LogoProvider>
    );
    expect(articles()).toHaveLength(1); // 12 is both made in the USA and 10+ colors
    fireEvent.click(chip("Made in USA")!);
    expect(articles()).toHaveLength(4);
    window.history.back();
    await waitFor(() => expect(chip("Made in USA")).toBeInTheDocument());
    expect(articles()).toHaveLength(1);
  });
});

describe("filter UI sources use only the accessible shades", () => {
  for (const file of ["CatalogFilters.tsx", "ProductCatalog.tsx", "CategoryProductGrid.tsx"]) {
    it(`${file} has no text-onyx below /60 and no text-gold-dark`, () => {
      const source = fs.readFileSync(
        path.resolve(__dirname, "../src/components/merchandise", file),
        "utf8"
      );
      expect(source.match(/text-onyx\/(?:[1-5]\d|[1-9])(?!\d)/g)).toBeNull();
      expect(source.match(/(?<![-\w])(?:[a-z-]+:)*text-gold-dark(?![-\w])/g)).toBeNull();
      expect(source).not.toMatch(/lucide/);
    });
  }
});
