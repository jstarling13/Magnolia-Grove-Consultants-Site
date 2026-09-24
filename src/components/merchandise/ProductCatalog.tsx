"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { merchandiseCategories, groupByBrand } from "@/config/merchandiseConfig";
import ColorSwatches from "@/components/merchandise/ColorSwatches";
import type { MerchProduct } from "@/types";

interface ProductCatalogProps {
  products: MerchProduct[];
}

export default function ProductCatalog({ products }: ProductCatalogProps) {
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("All");

  const categoriesInUse = useMemo(
    () => merchandiseCategories.filter((category) => products.some((p) => p.category === category)),
    [products]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products.filter((product) => {
      const matchesCategory = activeCategory === "All" || product.category === activeCategory;
      const matchesQuery =
        !q ||
        product.name.toLowerCase().includes(q) ||
        product.description.toLowerCase().includes(q) ||
        product.category.toLowerCase().includes(q) ||
        product.brand.toLowerCase().includes(q);
      return matchesCategory && matchesQuery;
    });
  }, [products, query, activeCategory]);

  const brandGroups = useMemo(() => groupByBrand(filtered), [filtered]);

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search products or brands..."
          aria-label="Search products"
          className="w-full max-w-sm rounded-md border border-gold/25 bg-cream px-4 py-3 text-sm text-onyx placeholder:text-onyx/50 focus:outline-none focus:ring-2 focus:ring-gold/60"
        />

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
      </div>

      {filtered.length === 0 ? (
        <p className="mt-14 text-center text-base leading-relaxed text-onyx/60">
          No products match your search — try the request form below and we&apos;ll source it for you.
        </p>
      ) : (
        <div className="mt-10 space-y-14">
          {brandGroups.map(({ brand, items }) => (
            <div key={brand}>
              <h2 className="border-b border-gold/20 pb-2 font-heading text-lg uppercase tracking-wide text-onyx/80">
                {brand}
              </h2>
              <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((product) => {
                  const sortedTiers = [...product.priceTiers].sort((a, b) => a.quantity - b.quantity);
                  const lowestQtyTier = sortedTiers[0];
                  const bestTier = sortedTiers[sortedTiers.length - 1];
                  const hasRange = sortedTiers.length > 1;

                  return (
                    <Link
                      key={product.id}
                      href={`/merchandise/${product.id}`}
                      className="flex h-full flex-col overflow-hidden rounded-lg border border-gold/25 bg-cream-100/85 shadow-card transition-all duration-300 hover:-translate-y-1 hover:border-gold/50 hover:shadow-[0_16px_40px_-12px_rgba(197,160,89,0.35)]"
                    >
                      <div className="relative h-48 w-full bg-cream-200">
                        {product.image ? (
                          <Image
                            src={product.image}
                            alt={product.imageAlt ?? product.name}
                            fill
                            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                            className="object-cover object-center"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center text-xs font-semibold uppercase tracking-wide text-onyx/40">
                            Image Coming Soon
                          </div>
                        )}
                      </div>
                      <div className="flex flex-1 flex-col p-6">
                        <span className="text-xs font-semibold uppercase tracking-wide text-gold-dark">
                          {product.category}
                        </span>
                        <h3 className="mt-2 text-xl text-onyx">{product.name}</h3>
                        <p className="mt-2 flex-1 text-sm leading-relaxed text-onyx/60">
                          {product.description}
                        </p>
                        {product.colors && product.colors.length > 0 && (
                          <div className="mt-3">
                            <ColorSwatches colors={product.colors} />
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
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
