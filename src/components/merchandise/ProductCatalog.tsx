"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { merchandiseCategories, groupByCategory } from "@/config/merchandiseConfig";
import ColorSwatches from "@/components/merchandise/ColorSwatches";
import ProductImageWithLogo from "@/components/merchandise/ProductImageWithLogo";
import LogoDropzone from "@/components/merchandise/LogoDropzone";
import type { MerchProduct } from "@/types";

interface ProductCatalogProps {
  products: MerchProduct[];
}

const INITIAL_VISIBLE = 6;

export default function ProductCatalog({ products }: ProductCatalogProps) {
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [activeBrand, setActiveBrand] = useState<string>("All");
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});

  const categoriesInUse = useMemo(
    () => merchandiseCategories.filter((category) => products.some((p) => p.category === category)),
    [products]
  );

  const brandsInUse = useMemo(() => {
    const brands = Array.from(new Set(products.map((p) => p.brand)));
    brands.sort((a, b) => {
      if (a === "Essentials") return 1;
      if (b === "Essentials") return -1;
      return a.localeCompare(b);
    });
    return brands;
  }, [products]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products.filter((product) => {
      const matchesCategory = activeCategory === "All" || product.category === activeCategory;
      const matchesBrand = activeBrand === "All" || product.brand === activeBrand;
      const matchesQuery =
        !q ||
        product.name.toLowerCase().includes(q) ||
        product.description.toLowerCase().includes(q) ||
        product.category.toLowerCase().includes(q) ||
        product.brand.toLowerCase().includes(q);
      return matchesCategory && matchesBrand && matchesQuery;
    });
  }, [products, query, activeCategory, activeBrand]);

  const categoryGroups = useMemo(() => groupByCategory(filtered), [filtered]);

  return (
    <div>
      <div className="mb-10">
        <LogoDropzone />
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search products or brands..."
          aria-label="Search products"
          className="w-full max-w-sm rounded-md border border-gold/25 bg-cream px-4 py-3 text-sm text-onyx placeholder:text-onyx/50 focus:outline-none focus:ring-2 focus:ring-gold/60"
        />

        <div className="flex flex-col gap-3 sm:flex-row">
          <label className="flex items-center gap-2 text-sm text-onyx/70">
            <span className="sr-only">Filter by category</span>
            <select
              value={activeCategory}
              onChange={(event) => setActiveCategory(event.target.value)}
              className="rounded-md border border-gold/25 bg-cream px-4 py-3 text-sm font-medium text-onyx focus:outline-none focus:ring-2 focus:ring-gold/60"
            >
              <option value="All">All Categories</option>
              {categoriesInUse.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </label>

          <label className="flex items-center gap-2 text-sm text-onyx/70">
            <span className="sr-only">Filter by brand</span>
            <select
              value={activeBrand}
              onChange={(event) => setActiveBrand(event.target.value)}
              className="rounded-md border border-gold/25 bg-cream px-4 py-3 text-sm font-medium text-onyx focus:outline-none focus:ring-2 focus:ring-gold/60"
            >
              <option value="All">All Brands</option>
              {brandsInUse.map((brand) => (
                <option key={brand} value={brand}>
                  {brand}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="mt-14 text-center text-base leading-relaxed text-onyx/60">
          No products match your search — try the request form below and we&apos;ll source it for you.
        </p>
      ) : (
        <div className="mt-10 space-y-16">
          {categoryGroups.map(({ category, items }) => {
            const isExpanded = expandedCategories[category] ?? false;
            const visibleItems = isExpanded ? items : items.slice(0, INITIAL_VISIBLE);
            const hasMore = items.length > INITIAL_VISIBLE;

            return (
              <div key={category}>
                <div className="flex items-baseline justify-between border-b border-gold/20 pb-2">
                  <h2 className="font-heading text-lg uppercase tracking-wide text-onyx/80">
                    {category}
                  </h2>
                  <span className="text-xs font-medium text-onyx/40">
                    {items.length} {items.length === 1 ? "item" : "items"}
                  </span>
                </div>

                <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {visibleItems.map((product) => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>

                {hasMore && (
                  <div className="mt-6 text-center">
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedCategories((prev) => ({ ...prev, [category]: !isExpanded }))
                      }
                      className="rounded-md border border-gold/30 px-6 py-2.5 text-sm font-semibold text-onyx/80 transition-colors hover:border-gold/60 hover:text-onyx"
                    >
                      {isExpanded ? "Show Fewer" : `View All ${items.length} ${category} Items`}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ProductCard({ product }: { product: MerchProduct }) {
  const [selectedColor, setSelectedColor] = useState<string | undefined>(undefined);

  const sortedTiers = [...product.priceTiers].sort((a, b) => a.quantity - b.quantity);
  const lowestQtyTier = sortedTiers[0];
  const bestTier = sortedTiers[sortedTiers.length - 1];
  const hasRange = sortedTiers.length > 1;
  const imageSrc = selectedColor ? product.colorImages?.[selectedColor] : undefined;

  return (
    <Link
      href={`/merchandise/${product.id}`}
      className="flex h-full flex-col overflow-hidden rounded-lg border border-gold/25 bg-cream-100/85 shadow-card transition-all duration-300 hover:-translate-y-1 hover:border-gold/50 hover:shadow-[0_16px_40px_-12px_rgba(197,160,89,0.35)]"
    >
      <div className="relative aspect-square w-full overflow-hidden border-b border-gold/15 bg-cream-100">
        <ProductImageWithLogo
          product={product}
          imageSrc={imageSrc}
          imageAlt={selectedColor ? `${product.name} in ${selectedColor}` : undefined}
          sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
        />
      </div>
      <div className="flex flex-1 flex-col p-6">
        <span className="text-xs font-semibold uppercase tracking-wide text-gold-dark">
          {product.brand}
        </span>
        <h3 className="mt-2 text-xl text-onyx">{product.name}</h3>
        <p className="mt-2 flex-1 text-sm leading-relaxed text-onyx/60">{product.description}</p>
        {product.colors && product.colors.length > 0 && (
          <div className="mt-4">
            <p className="mb-1.5 text-xs font-medium text-onyx/50">
              {selectedColor ?? `${product.colors.length} ${product.colors.length === 1 ? "Color" : "Colors"}`}
            </p>
            <ColorSwatches
              colors={product.colors}
              size="md"
              selected={selectedColor}
              onSelect={(color) => setSelectedColor((prev) => (prev === color ? undefined : color))}
            />
          </div>
        )}
        <div className="mt-4 border-t border-gold/15 pt-4">
          <div className="flex items-center justify-between">
            <span className="font-heading text-2xl font-bold text-onyx">
              ${lowestQtyTier.price.toFixed(2)}
            </span>
            <span className="text-xs font-semibold uppercase tracking-wide text-onyx/50">
              at {lowestQtyTier.quantity}+ units
            </span>
          </div>
          {hasRange && (
            <p className="mt-1 text-xs text-onyx/50">
              As low as ${bestTier.price.toFixed(2)} at {bestTier.quantity}+ units
            </p>
          )}
        </div>
      </div>
    </Link>
  );
}
