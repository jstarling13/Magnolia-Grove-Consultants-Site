import { render, screen } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ product: undefined as unknown }));

vi.mock("@/lib/merchStorefront", () => ({
  getStorefrontProduct: () => mocks.product,
  getRelatedProducts: () => [],
}));
vi.mock("@/components/merchandise/CartLink", () => ({ default: () => null }));
vi.mock("@/components/merchandise/ProductDetailActions", () => ({ default: () => null }));
vi.mock("@/components/merchandise/ProductGallery", () => ({ default: () => null }));
vi.mock("@/components/merchandise/RecentlyViewed", () => ({ default: () => null }));
vi.mock("@/components/merchandise/ProductSelectionContext", () => ({
  ProductSelectionProvider: ({ children }: { children: React.ReactNode }) => children,
}));

import ProductDetailPage from "@/app/(marketing)/merchandise/[id]/page";
import ProductCard from "@/components/merchandise/ProductCard";
import { LogoProvider } from "@/components/merchandise/LogoContext";
import { getImprintArea, products } from "@/config/merchandiseConfig";
import {
  hasLargeMinimum,
  LARGE_MINIMUM_NOTE,
  minimumOrderValue,
  suggestsQuote,
  toCatalogProduct,
  type CatalogProduct,
} from "@/lib/merchCatalog";

function product(overrides: Partial<CatalogProduct> = {}): CatalogProduct {
  return {
    id: "mat-1",
    name: "Entrance Mat",
    category: "Home & Decor",
    brand: "Essentials",
    description: "A mat.",
    tiers: [{ quantity: 200, price: 57.49 }],
    imprintArea: { top: 50, left: 50, width: 30 },
    ...overrides,
  };
}

const NOTE = "Large minimum - request a quote to confirm size and options.";

describe("large minimum helpers", () => {
  it("values the smallest order as first-tier quantity times price, to the cent", () => {
    expect(minimumOrderValue(product())).toBe(11498);
    expect(minimumOrderValue(product({ tiers: [{ quantity: 3, price: 0.1 }] }))).toBe(0.3);
  });

  it("flags $1,000 and over, not $999.99", () => {
    expect(hasLargeMinimum(product({ tiers: [{ quantity: 100, price: 10 }] }))).toBe(true);
    expect(hasLargeMinimum(product({ tiers: [{ quantity: 100, price: 9.9999 }] }))).toBe(false);
    expect(hasLargeMinimum(product({ tiers: [{ quantity: 111, price: 9 }] }))).toBe(false);
  });

  it("suggests a quote for a priceNote or a line over $5,000, never under $1,000", () => {
    const note =
      "Pricing shown is for the base size or option; other sizes or options may cost more.";
    expect(LARGE_MINIMUM_NOTE).toBe(NOTE);
    // $1,140: large, with a priceNote
    const withNote = { tiers: [{ quantity: 1, price: 1140 }], priceNote: note };
    expect(suggestsQuote(withNote)).toBe(true);
    // $1,140 with no note: show the amount only
    expect(suggestsQuote({ tiers: withNote.tiers })).toBe(false);
    // over $5,000 with no note
    expect(suggestsQuote({ tiers: [{ quantity: 500, price: 20.6 }] })).toBe(true);
    // exactly $5,000 is not over
    expect(suggestsQuote({ tiers: [{ quantity: 500, price: 10 }] })).toBe(false);
    // small minimum with a note: nothing
    expect(suggestsQuote({ tiers: [{ quantity: 10, price: 5 }], priceNote: note })).toBe(false);
  });
});

describe("product card", () => {
  const renderCard = (p: CatalogProduct) =>
    render(
      <LogoProvider>
        <ProductCard product={p} />
      </LogoProvider>
    );

  it("shows 'Minimum order: $X' and the quote note for a minimum over $5,000", () => {
    renderCard(product());
    expect(screen.getByText(/Minimum order: \$11,498\.00/)).toBeInTheDocument();
    expect(screen.getByText(NOTE)).toBeInTheDocument();
  });

  it("shows only the amount for $1,000 to $5,000", () => {
    renderCard(product({ tiers: [{ quantity: 1, price: 1140.63 }] }));
    expect(screen.getByText(/Minimum order: \$1,140\.63/)).toBeInTheDocument();
    expect(screen.queryByText(NOTE)).not.toBeInTheDocument();
  });

  it("shows nothing extra for an ordinary minimum", () => {
    renderCard(product({ tiers: [{ quantity: 50, price: 4 }] }));
    expect(screen.queryByText(/Minimum order/)).not.toBeInTheDocument();
    expect(screen.queryByText(NOTE)).not.toBeInTheDocument();
  });
});

describe("product page", () => {
  async function page(p: CatalogProduct) {
    mocks.product = p;
    return renderToStaticMarkup(await ProductDetailPage({ params: Promise.resolve({ id: p.id }) }));
  }

  it("shows the minimum order amount near the price, plus the quote note over $5,000", async () => {
    const html = await page(product());
    expect(html).toContain("Minimum order: $11,498.00");
    expect(html).toContain(NOTE);
  });

  it("shows the quote note for a priceNote product with a $1,000+ minimum", async () => {
    const html = await page(
      product({
        tiers: [{ quantity: 1, price: 1039.5 }],
        priceNote: "Priced for the standard size; other sizes quoted on request.",
      })
    );
    expect(html).toContain("Minimum order: $1,039.50");
    expect(html).toContain(NOTE);
  });

  it("shows the amount only for a $1,000 to $5,000 minimum with no note", async () => {
    const html = await page(product({ tiers: [{ quantity: 1, price: 1138.33 }] }));
    expect(html).toContain("Minimum order: $1,138.33");
    expect(html).not.toContain(NOTE);
  });

  it("shows neither for an ordinary product, even one with a priceNote", async () => {
    const html = await page(
      product({ tiers: [{ quantity: 50, price: 4 }], priceNote: "Base size price." })
    );
    expect(html).not.toContain("Minimum order:");
    expect(html).not.toContain(NOTE);
  });
});

describe("real catalog", () => {
  const catalog = products.map((p) => toCatalogProduct(p, getImprintArea(p)));

  it("has large minimums, found from the data and not by id", () => {
    const large = catalog.filter(hasLargeMinimum);
    expect(large.length).toBeGreaterThan(0);
    expect(large.some(suggestsQuote)).toBe(true);
    for (const p of large) expect(minimumOrderValue(p)).toBeGreaterThanOrEqual(1000);
  });
});
