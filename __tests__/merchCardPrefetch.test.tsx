import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { ComponentProps } from "react";

const linkProps = vi.hoisted(() => ({ calls: [] as Record<string, unknown>[] }));

vi.mock("next/link", () => ({
  default: ({
    prefetch,
    children,
    href,
    ...rest
  }: ComponentProps<"a"> & { prefetch?: unknown }) => {
    linkProps.calls.push({ href, prefetch });
    return (
      <a href={href as string} data-prefetch={String(prefetch)} {...rest}>
        {children}
      </a>
    );
  },
}));

import ProductCard from "@/components/merchandise/ProductCard";
import { LogoProvider } from "@/components/merchandise/LogoContext";
import type { CatalogProduct } from "@/lib/merchCatalog";

const product: CatalogProduct = {
  id: "tee",
  name: "Tee",
  category: "Apparel",
  brand: "Essentials",
  description: "A tee",
  tiers: [{ quantity: 25, price: 5 }],
  imprintArea: { top: 40, left: 50, width: 20 },
};

describe("ProductCard link prefetching", () => {
  it("does not prefetch the product page just because the card is on screen", () => {
    render(
      <LogoProvider>
        <ProductCard product={product} />
      </LogoProvider>
    );
    expect(screen.getByRole("link", { name: "Tee" })).toHaveAttribute("data-prefetch", "false");
  });

  it("starts prefetching when the card is hovered or focused", () => {
    const { unmount } = render(
      <LogoProvider>
        <ProductCard product={product} />
      </LogoProvider>
    );
    fireEvent.pointerEnter(screen.getByRole("link", { name: "Tee" }));
    expect(screen.getByRole("link", { name: "Tee" })).toHaveAttribute("data-prefetch", "null");
    unmount();

    render(
      <LogoProvider>
        <ProductCard product={product} />
      </LogoProvider>
    );
    fireEvent.focus(screen.getByRole("link", { name: "Tee" }));
    expect(screen.getByRole("link", { name: "Tee" })).toHaveAttribute("data-prefetch", "null");
  });
});
