import { render } from "@testing-library/react";
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
import { LogoProvider } from "@/components/merchandise/LogoContext";
import ProductCard from "@/components/merchandise/ProductCard";
import { formatQuantity, type CatalogProduct } from "@/lib/merchCatalog";

function product(overrides: Partial<CatalogProduct> = {}): CatalogProduct {
  return {
    id: "tag-1",
    name: "Luggage Tag",
    category: "Travel",
    brand: "Essentials",
    description: "A tag.",
    colors: ["Black"],
    tiers: [
      { quantity: 1008, price: 1.2 },
      { quantity: 10000, price: 0.9 },
    ],
    imprintArea: { top: 50, left: 50, width: 30 },
    ...overrides,
  };
}

describe("formatQuantity", () => {
  it("adds thousands separators and leaves small numbers alone", () => {
    expect(formatQuantity(10000)).toBe("10,000");
    expect(formatQuantity(1008)).toBe("1,008");
    expect(formatQuantity(1234567)).toBe("1,234,567");
    expect(formatQuantity(999)).toBe("999");
    expect(formatQuantity(72)).toBe("72");
  });
});

describe("product card quantities", () => {
  const renderCard = (p: CatalogProduct) =>
    render(
      <LogoProvider>
        <ProductCard product={p} />
      </LogoProvider>
    );

  it("uses commas in 'at N+ units' and 'As low as ... at N+ units'", () => {
    const { container } = renderCard(product());
    expect(container.textContent).toContain("at 1,008+ units");
    expect(container.textContent).toContain("As low as $0.90 at 10,000+ units");
    expect(container.textContent).not.toMatch(/\b1008\b|\b10000\b/);
  });

  it("leaves quantities under 1,000 unchanged", () => {
    const { container } = renderCard(product({ tiers: [{ quantity: 250, price: 3 }] }));
    expect(container.textContent).toContain("at 250+ units");
  });
});

describe("product page quantities", () => {
  async function page(p: CatalogProduct) {
    mocks.product = p;
    return renderToStaticMarkup(await ProductDetailPage({ params: Promise.resolve({ id: p.id }) }));
  }

  it("uses commas in the headline, the as-low-as line and every tier row", async () => {
    const html = await page(
      product({
        tiers: [
          { quantity: 1008, price: 1.2 },
          { quantity: 5000, price: 1 },
          { quantity: 10000, price: 0.9 },
        ],
      })
    );
    expect(html).toContain("per unit at 1,008+ units");
    expect(html).toContain("per unit at 10,000+ units");
    expect(html).toContain("1,008+ units");
    expect(html).toContain("5,000+ units");
    expect(html).toContain("10,000+ units");
    expect(html).not.toMatch(/\b1008\+|\b5000\+|\b10000\+/);
  });

  it("uses commas for a single-tier minimum", async () => {
    const html = await page(product({ tiers: [{ quantity: 2500, price: 0.4 }] }));
    expect(html).toContain("per unit, minimum 2,500");
  });
});
