import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import CardImage from "@/components/merchandise/CardImage";
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

// The "server" has 30 apparel (one Nike) and 12 drinkware; the page ships 8 of each.
const APPAREL = Array.from({ length: 30 }, (_, i) =>
  make(i + 1, "Apparel", i === 20 ? { brand: "Nike", name: "Nike Tee" } : {})
);
const DRINKWARE = Array.from({ length: 12 }, (_, i) =>
  make(100 + i, "Drinkware", { name: `Mug ${i}` })
);
const SERVER: Record<string, CatalogProduct[]> = {
  "/merchandise/category/apparel/cards.json": APPAREL,
  "/merchandise/category/drinkware/cards.json": DRINKWARE,
};
const CATEGORIES = ["Apparel", "Drinkware"];
const TOTALS = { Apparel: 30, Drinkware: 12 };
const SHIPPED = [...APPAREL.slice(0, 8), ...DRINKWARE.slice(0, 8)];

type Fetch = ReturnType<typeof vi.fn>;
let fetchMock: Fetch;

function installFetch(handler?: (url: string) => Response | Promise<Response>) {
  fetchMock = vi.fn(async (url: string) => {
    if (handler) return handler(url);
    const cards = SERVER[url];
    return cards ? new Response(JSON.stringify(cards)) : new Response("nope", { status: 404 });
  });
  vi.stubGlobal("fetch", fetchMock);
}

function renderCatalog() {
  return render(
    <LogoProvider>
      <ProductCatalog
        products={SHIPPED}
        categories={CATEGORIES}
        categoryTotals={TOTALS}
        brands={["Nike"]}
      />
    </LogoProvider>
  );
}

const section = (name: string) => screen.getByRole("region", { name });
const cards = (name: string) => within(section(name)).queryAllByRole("article").length;
const requested = () => fetchMock.mock.calls.map((call) => call[0]);

beforeEach(() => {
  window.history.replaceState(null, "", "/merchandise");
  installFetch();
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  window.localStorage.clear();
});

describe("ProductCatalog with the rest of each category fetched on demand", () => {
  it("renders the shipped cards with totals and counts from the server, fetching nothing yet", () => {
    renderCatalog();
    expect(cards("Apparel")).toBe(8);
    expect(cards("Drinkware")).toBe(8);
    expect(screen.getByText("Showing 8 of 30")).toBeInTheDocument();
    expect(screen.getByText("30 items")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^All/ })).toHaveTextContent("42");
    expect(screen.getByRole("button", { name: /^Apparel/ })).toHaveTextContent("30");
    expect(screen.getByRole("status")).toHaveTextContent("Showing 42 products");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("'Show more' fetches just that category, then reveals the next batch", async () => {
    renderCatalog();
    fireEvent.click(screen.getByRole("button", { name: "Show 22 more Apparel products" }));
    await waitFor(() => expect(cards("Apparel")).toBe(30));
    expect(requested()).toEqual(["/merchandise/category/apparel/cards.json"]);
    expect(screen.getByText("Showing 30 of 30")).toBeInTheDocument();
    expect(cards("Drinkware")).toBe(8);
  });

  it("shows a busy button while the category loads and never fetches it twice", async () => {
    let release!: () => void;
    installFetch(
      (url) =>
        new Promise((resolve) => {
          release = () => resolve(new Response(JSON.stringify(SERVER[url])));
        })
    );
    renderCatalog();
    const button = screen.getByRole("button", { name: /Show 22 more Apparel/ });
    fireEvent.click(button);
    expect(button).toBeDisabled();
    expect(button).toHaveTextContent("Loading");
    expect(cards("Apparel")).toBe(8);
    await act(async () => release());
    await waitFor(() => expect(cards("Apparel")).toBe(30));

    window.HTMLElement.prototype.scrollIntoView = vi.fn();
    fireEvent.click(screen.getByRole("button", { name: "Show fewer" }));
    expect(cards("Apparel")).toBe(8);
    fireEvent.click(screen.getByRole("button", { name: /Show 22 more Apparel/ }));
    await waitFor(() => expect(cards("Apparel")).toBe(30));
    expect(requested()).toEqual(["/merchandise/category/apparel/cards.json"]);
  });

  it("lets every section after the first skip rendering until near the screen", () => {
    renderCatalog();
    const wrapper = (name: string) => section(name).querySelector(".grid")!.parentElement!;
    // First section is in view straight away: no skipping.
    expect(wrapper("Apparel").style.getPropertyValue("--rows-1")).toBe("");
    expect(wrapper("Apparel").className).not.toContain("content-visibility");
    // Later sections get a size estimate from their card count (8 -> 8/4/3/2 rows).
    const later = wrapper("Drinkware");
    expect(later.className).toContain("[content-visibility:auto]");
    expect(later.style.getPropertyValue("--rows-1")).toBe("8");
    expect(later.style.getPropertyValue("--rows-2")).toBe("4");
    expect(later.style.getPropertyValue("--rows-3")).toBe("3");
    expect(later.style.getPropertyValue("--rows-4")).toBe("2");
  });

  it("keeps the unfiltered page and says 'Loading' until a search has its data", async () => {
    vi.useFakeTimers();
    let release: Array<() => void> = [];
    installFetch(
      (url) =>
        new Promise((resolve) => {
          release.push(() => resolve(new Response(JSON.stringify(SERVER[url]))));
        })
    );
    renderCatalog();
    fireEvent.change(screen.getByRole("searchbox", { name: "Search products" }), {
      target: { value: "nike" },
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(250);
    });
    // Not a half-filtered list and not a false "No products found".
    expect(screen.getByRole("status")).toHaveTextContent("Loading products");
    expect(screen.queryByText("No products match your filters.")).toBeNull();
    expect(cards("Apparel")).toBe(8);
    expect(requested().sort()).toEqual(Object.keys(SERVER).sort());

    await act(async () => {
      release.forEach((fn) => fn());
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(screen.getByRole("status")).toHaveTextContent("Showing 1 product");
    expect(screen.getByRole("heading", { name: "Nike Tee" })).toBeInTheDocument();
  });

  it("finds products that were not in the shipped cards (brand filter)", async () => {
    renderCatalog();
    fireEvent.change(screen.getByLabelText("Filter by brand"), { target: { value: "Nike" } });
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Showing 1 product"));
    expect(screen.getByRole("heading", { name: "Nike Tee" })).toBeInTheDocument();
    expect(window.location.search).toContain("brand=Nike");
  });

  it("sorts across the whole category once it has loaded", async () => {
    renderCatalog();
    fireEvent.change(screen.getByRole("combobox", { name: "Sort products" }), {
      target: { value: "price-desc" },
    });
    await waitFor(() =>
      expect(screen.getByRole("status")).toHaveTextContent("Showing 42 products")
    );
    const first = within(section("Apparel")).getAllByRole("heading", { level: 3 })[0];
    expect(first).toHaveTextContent("Apparel 030");
  });

  it("focusing a category chip starts deeper (24) from the fetched cards", async () => {
    renderCatalog();
    fireEvent.click(screen.getByRole("button", { name: /^Apparel/ }));
    await waitFor(() => expect(cards("Apparel")).toBe(24));
    expect(screen.queryByRole("region", { name: "Drinkware" })).toBeNull();
    expect(requested()).toEqual(["/merchandise/category/apparel/cards.json"]);
  });

  it("starts loading on intent: search focus fetches everything, hovering a chip fetches that category", () => {
    renderCatalog();
    fireEvent.pointerEnter(screen.getByRole("button", { name: /^Drinkware/ }));
    expect(requested()).toEqual(["/merchandise/category/drinkware/cards.json"]);
    fireEvent.focus(screen.getByRole("searchbox", { name: "Search products" }));
    expect(requested().sort()).toEqual(Object.keys(SERVER).sort());
  });

  it("restores URL params that need the rest of the catalog", async () => {
    window.history.replaceState(null, "", "/merchandise?q=nike&category=Apparel");
    renderCatalog();
    await waitFor(() =>
      expect(screen.getByRole("status")).toHaveTextContent("Showing 1 product in Apparel")
    );
  });

  it("offers a retry when the data cannot be loaded, and recovers", async () => {
    installFetch(() => new Response("boom", { status: 500 }));
    renderCatalog();
    fireEvent.change(screen.getByLabelText("Filter by brand"), { target: { value: "Nike" } });
    expect(await screen.findByRole("alert")).toHaveTextContent("couldn't load the full catalog");
    // Still the unfiltered page, never an empty one.
    expect(cards("Apparel")).toBe(8);

    installFetch();
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Showing 1 product"));
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("fetches the rest quietly once the page has settled", async () => {
    vi.useFakeTimers();
    renderCatalog();
    expect(fetchMock).not.toHaveBeenCalled();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3100);
    });
    expect(requested().sort()).toEqual(Object.keys(SERVER).sort());
  });

  it("does not prefetch when the shopper asked to save data", async () => {
    vi.useFakeTimers();
    Object.defineProperty(navigator, "connection", {
      value: { saveData: true },
      configurable: true,
    });
    try {
      renderCatalog();
      await act(async () => {
        await vi.advanceTimersByTimeAsync(10000);
      });
      expect(fetchMock).not.toHaveBeenCalled();
    } finally {
      Reflect.deleteProperty(navigator, "connection");
    }
  });
});

describe("CategoryProductGrid with the rest of the category fetched on demand", () => {
  function renderGrid() {
    return render(
      <LogoProvider>
        <CategoryProductGrid
          products={APPAREL.slice(0, 24)}
          total={30}
          brands={["Nike"]}
          category="Apparel"
        />
      </LogoProvider>
    );
  }

  it("starts with the shipped 24 and the real total, fetching nothing", () => {
    renderGrid();
    expect(screen.getAllByRole("article")).toHaveLength(24);
    expect(screen.getByText("Showing 24 of 30")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Showing 30 products");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("'Show more' fetches the category, then reveals the rest", async () => {
    renderGrid();
    fireEvent.click(screen.getByRole("button", { name: /show 6 more/i }));
    await waitFor(() => expect(screen.getAllByRole("article")).toHaveLength(30));
    expect(requested()).toEqual(["/merchandise/category/apparel/cards.json"]);
    expect(screen.queryByRole("button", { name: /show \d+ more/i })).toBeNull();
  });

  it("finds a product that was not in the shipped cards", async () => {
    renderGrid();
    fireEvent.change(screen.getByLabelText("Filter by brand"), { target: { value: "Nike" } });
    await waitFor(() => expect(screen.getAllByRole("article")).toHaveLength(1));
    expect(screen.getByRole("heading", { name: "Nike Tee" })).toBeInTheDocument();
  });

  it("searches the full list after the debounce", async () => {
    vi.useFakeTimers();
    renderGrid();
    fireEvent.change(screen.getByLabelText("Search Apparel"), { target: { value: "nike" } });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(250);
    });
    expect(screen.getAllByRole("article")).toHaveLength(1);
    expect(screen.getByRole("heading", { name: "Nike Tee" })).toBeInTheDocument();
  });

  it("restores a URL filter that needs the rest of the category", async () => {
    window.history.replaceState(null, "", "/merchandise/category/apparel?brand=Nike");
    renderGrid();
    await waitFor(() => expect(screen.getAllByRole("article")).toHaveLength(1));
  });
});

describe("CardImage", () => {
  const product = { name: "Tee", image: "/images/tee.webp", imprintArea: AREA };
  const SIZES = "100vw";

  it("renders just the photo until a logo has been uploaded", () => {
    render(
      <LogoProvider>
        <CardImage product={product} sizes={SIZES} />
      </LogoProvider>
    );
    expect(screen.getByRole("img", { name: "Tee" })).toBeInTheDocument();
    expect(screen.queryByAltText("Your logo preview")).toBeNull();
  });

  it("falls back to a placeholder without a photo", () => {
    render(
      <LogoProvider>
        <CardImage product={{ ...product, image: undefined }} sizes={SIZES} />
      </LogoProvider>
    );
    expect(screen.getByText("Image Coming Soon")).toBeInTheDocument();
  });

  it("loads the logo preview on demand once a logo is stored", async () => {
    vi.stubGlobal(
      "ResizeObserver",
      class {
        observe() {}
        disconnect() {}
        unobserve() {}
      }
    );
    window.localStorage.setItem("mg-merch-logo", "data:image/png;base64,AAAA");
    window.localStorage.setItem("mg-merch-logo-name", "logo.png");
    render(
      <LogoProvider>
        <CardImage product={product} sizes={SIZES} />
      </LogoProvider>
    );
    expect(await screen.findByAltText("Your logo preview")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Tee" })).toBeInTheDocument();
  });

  it("uses the color photo and alt text when given", () => {
    render(
      <LogoProvider>
        <CardImage
          product={product}
          sizes={SIZES}
          imageSrc="/images/tee-red.webp"
          imageAlt="Tee in Red"
        />
      </LogoProvider>
    );
    expect(screen.getByRole("img", { name: "Tee in Red" })).toBeInTheDocument();
  });
});
