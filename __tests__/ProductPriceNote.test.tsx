import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { CatalogProduct } from "@/lib/merchCatalog";

const mocks = vi.hoisted(() => ({ product: undefined as unknown }));

vi.mock("@/lib/merchStorefront", () => ({
  getStorefrontProduct: () => mocks.product,
  getRelatedProducts: () => [],
}));
// client components are not what is under test: stub them so the server page renders on its own
vi.mock("@/components/merchandise/CartLink", () => ({ default: () => null }));
vi.mock("@/components/merchandise/ProductCard", () => ({ default: () => null }));
vi.mock("@/components/merchandise/ProductDetailActions", () => ({ default: () => null }));
vi.mock("@/components/merchandise/ProductGallery", () => ({ default: () => null }));
vi.mock("@/components/merchandise/RecentlyViewed", () => ({ default: () => null }));
vi.mock("@/components/merchandise/ProductSelectionContext", () => ({
  ProductSelectionProvider: ({ children }: { children: React.ReactNode }) => children,
}));

import ProductDetailPage from "@/app/(marketing)/merchandise/[id]/page";

const base: CatalogProduct = {
  id: "event-flooring-55555",
  name: "Event Flooring",
  category: "Home & Decor",
  brand: "Essentials",
  description: "Printed floors. Priced at 1 unit.",
  tiers: [{ quantity: 1, price: 105 }],
  imprintArea: { top: 50, left: 50, width: 30 },
};

async function render(product: CatalogProduct) {
  mocks.product = product;
  return renderToStaticMarkup(
    await ProductDetailPage({ params: Promise.resolve({ id: product.id }) })
  );
}

describe("size pricing note on the product page", () => {
  it("shows the note under the price when the product has one", async () => {
    const html = await render({
      ...base,
      priceNote: "Priced for the standard size; other sizes quoted on request.",
    });
    expect(html).toContain("Priced for the standard size; other sizes quoted on request.");
    expect(html).toContain('data-testid="price-note"');
  });

  it("shows nothing extra for an ordinary product", async () => {
    const html = await render(base);
    expect(html).not.toContain("price-note");
    expect(html).not.toContain("other sizes quoted");
  });
});
