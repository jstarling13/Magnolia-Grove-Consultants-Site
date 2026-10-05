import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { LogoProvider } from "@/components/merchandise/LogoContext";
import ProductGallery from "@/components/merchandise/ProductGallery";
import { ProductSelectionProvider } from "@/components/merchandise/ProductSelectionContext";
import type { CatalogProduct } from "@/lib/merchCatalog";

function product(colors: string[], extra: Partial<CatalogProduct> = {}): CatalogProduct {
  return {
    id: "tee",
    name: "Test Tee",
    category: "Apparel",
    brand: "Essentials",
    description: "A tee.",
    image: "/images/merch/tee.webp",
    colors,
    tiers: [{ quantity: 12, price: 10 }],
    imprintArea: { top: 40, left: 50, width: 20 },
    ...extra,
  };
}

function renderGallery(p: CatalogProduct) {
  return render(
    <LogoProvider>
      <ProductSelectionProvider product={p}>
        <ProductGallery product={p} />
      </ProductSelectionProvider>
    </LogoProvider>
  );
}

const names = (count: number) => Array.from({ length: count }, (_, i) => `Shade ${i + 1}`);
const swatches = () => screen.queryAllByRole("button", { name: /^Select color/ });

describe("ProductGallery color section", () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.history.pushState({}, "", "/merchandise/tee");
  });

  it("states the color count once: in the heading, not again beside the swatches or in a list", () => {
    renderGallery(product(names(30)));
    expect(screen.getByRole("heading", { name: "Colors (30)" })).toBeInTheDocument();
    expect(screen.queryByText("30 colors")).not.toBeInTheDocument();
    expect(screen.queryByText(/^All 30 colors$/)).not.toBeInTheDocument();
    expect(document.querySelector("details")).toBeNull();
    // The only other mention is the disclosure's own action.
    expect(screen.getAllByText(/30 colors/)).toHaveLength(1);
  });

  it("names the picked color on the live line under the heading", () => {
    renderGallery(product(names(4)));
    fireEvent.click(screen.getByRole("button", { name: "Select color Shade 2" }));
    expect(document.querySelector("[aria-live='polite']")).toHaveTextContent("Color: Shade 2");
  });

  it("collapses a long list to two phone rows with a 'Show all N colors' toggle", () => {
    renderGallery(product(names(60)));
    expect(swatches()).toHaveLength(14);
    fireEvent.click(screen.getByRole("button", { name: "Show all 60 colors" }));
    expect(swatches()).toHaveLength(60);
  });

  it("does not hide a handful of swatches behind a toggle", () => {
    renderGallery(product(names(18)));
    expect(swatches()).toHaveLength(18);
    expect(screen.queryByRole("button", { name: /Show all/ })).not.toBeInTheDocument();
  });

  it("uses the singular heading for one color and no toggle", () => {
    renderGallery(product(["Natural"]));
    expect(screen.getByRole("heading", { name: "Color" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Show all/ })).not.toBeInTheDocument();
  });

  it("explains a missing color photo, but only after the shopper picks that color", () => {
    renderGallery(product(["Red", "Blue"], { colorImages: { Red: "/images/merch/tee-red.webp" } }));
    const note =
      "This color doesn't have its own photo yet. The photo shows our standard sample - ask us for the exact color.";
    expect(screen.queryByText(note)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Select color Blue" }));
    expect(screen.getByText(note)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Select color Red" }));
    expect(screen.queryByText(note)).not.toBeInTheDocument();
  });
});
