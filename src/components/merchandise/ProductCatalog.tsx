"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { merchandiseCategories } from "@/config/merchandiseConfig";
import type { MerchProduct } from "@/types";

interface ProductCatalogProps {
  products: MerchProduct[];
}

export default function ProductCatalog({ products }: ProductCatalogProps) {
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const categoriesInUse = useMemo(
    () => merchandiseCategories.filter((category) => products.some((p) => p.category === category)),
    [products]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products.filter((product) => {
      const matchesCategory = !activeCategory || product.category === activeCategory;
      const matchesQuery =
        !q ||
        product.name.toLowerCase().includes(q) ||
        product.description.toLowerCase().includes(q) ||
        product.category.toLowerCase().includes(q);
      return matchesCategory && matchesQuery;
    });
  }, [products, query, activeCategory]);

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search products..."
          aria-label="Search products"
          className="w-full max-w-sm rounded-md border border-gold/25 bg-cream px-4 py-3 text-sm text-onyx placeholder:text-onyx/50 focus:outline-none focus:ring-2 focus:ring-gold/60"
        />

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setActiveCategory(null)}
            className={`rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-wide transition-colors ${
              activeCategory === null
                ? "border-gold bg-gold text-onyx"
                : "border-gold/25 text-onyx/70 hover:border-gold/60"
            }`}
          >
            All
          </button>
          {categoriesInUse.map((category) => (
            <button
              key={category}
              type="button"
              onClick={() => setActiveCategory(category)}
              className={`rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-wide transition-colors ${
                activeCategory === category
                  ? "border-gold bg-gold text-onyx"
                  : "border-gold/25 text-onyx/70 hover:border-gold/60"
              }`}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="mt-14 text-center text-base leading-relaxed text-onyx/60">
          No products match your search — try the request form below and we&apos;ll source it for you.
        </p>
      ) : (
        <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((product) => (
            <div
              key={product.id}
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
                <div className="mt-4 flex items-center justify-between border-t border-gold/15 pt-4">
                  <span className="font-heading text-2xl font-bold text-onyx">
                    ${product.price.toFixed(2)}
                  </span>
                  <span className="text-xs font-semibold uppercase tracking-wide text-onyx/50">
                    Starting Price
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
