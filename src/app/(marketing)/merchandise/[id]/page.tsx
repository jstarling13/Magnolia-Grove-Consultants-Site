import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { merchandisePage, products } from "@/config/merchandiseConfig";
import CartLink from "@/components/merchandise/CartLink";
import ProductCard from "@/components/merchandise/ProductCard";
import ProductDetailActions from "@/components/merchandise/ProductDetailActions";
import ProductGallery from "@/components/merchandise/ProductGallery";
import { ProductSelectionProvider } from "@/components/merchandise/ProductSelectionContext";
import RecentlyViewed from "@/components/merchandise/RecentlyViewed";
import { bestTier, formatPrice, isRealBrand, startingTier } from "@/lib/merchCatalog";
import {
  buildBreadcrumbJsonLd,
  buildProductJsonLd,
  buildProductMetadata,
  productPath,
  serializeJsonLd,
} from "@/lib/merchSeo";
import { categoryPath } from "@/lib/merchSlug";
import { getRelatedProducts, getStorefrontProduct } from "@/lib/merchStorefront";
import { getSiteUrl } from "@/lib/siteUrl";

interface ProductPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { id } = await params;
  const product = getStorefrontProduct(id);
  if (!product) return { title: "Product Not Found | Magnolia Grove Consultants" };
  return buildProductMetadata(product, getSiteUrl());
}

export function generateStaticParams() {
  return products.map((product) => ({ id: product.id }));
}

export default async function ProductDetailPage({ params }: ProductPageProps) {
  const { id } = await params;
  const product = getStorefrontProduct(id);
  if (!product) notFound();

  const first = startingTier(product);
  const best = bestTier(product);
  const categoryHref = categoryPath(product.category);
  const related = getRelatedProducts(product.id);
  const siteUrl = getSiteUrl();
  const jsonLd = [
    buildProductJsonLd(product, siteUrl),
    buildBreadcrumbJsonLd(
      [
        { name: "Merchandise", path: "/merchandise" },
        { name: product.category, path: categoryHref },
        { name: product.name, path: productPath(product.id) },
      ],
      siteUrl
    ),
  ];

  return (
    <>
      {jsonLd.map((data, index) => (
        <script
          key={index}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }}
        />
      ))}
      <section className="relative bg-onyx px-6 py-8 sm:px-8 lg:px-12">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <nav aria-label="Breadcrumb" className="min-w-0">
            <ol className="flex min-w-0 items-center gap-2 text-sm text-muted-light">
              <li className="shrink-0">
                <Link
                  href="/merchandise"
                  className="font-semibold transition-colors hover:text-gold-bright"
                >
                  Merchandise
                </Link>
              </li>
              <li aria-hidden="true" className="shrink-0 text-muted/70">
                /
              </li>
              <li className="shrink-0">
                <Link
                  href={categoryHref}
                  className="font-semibold transition-colors hover:text-gold-bright"
                >
                  {product.category}
                </Link>
              </li>
              <li aria-hidden="true" className="hidden shrink-0 text-muted/70 sm:block">
                /
              </li>
              <li aria-current="page" className="hidden min-w-0 truncate text-white/60 sm:block">
                {product.name}
              </li>
            </ol>
          </nav>
          <CartLink />
        </div>
      </section>

      <section className="bg-cream px-6 py-12 sm:px-8 lg:px-12 lg:py-20">
        <ProductSelectionProvider product={product}>
          <div className="mx-auto grid max-w-6xl grid-cols-1 gap-10 lg:grid-cols-2 lg:gap-14">
            <ProductGallery product={product} />

            <div className="min-w-0">
              {isRealBrand(product.brand) && (
                <p className="text-xs font-semibold uppercase tracking-wide text-gold-text">
                  {product.brand}
                </p>
              )}
              <h1 className="mt-1 text-3xl text-onyx sm:text-4xl">{product.name}</h1>

              <p className="mt-4 flex flex-wrap items-baseline gap-x-2 text-sm text-onyx/60">
                {product.tiers.length > 1 && <span>From</span>}
                <span className="font-heading text-3xl font-bold text-onyx">
                  {formatPrice(first.price)}
                </span>
                <span>
                  {product.tiers.length > 1
                    ? `per unit at ${first.quantity}+ units`
                    : `per unit, minimum ${first.quantity}`}
                </span>
              </p>
              {best.price < first.price && (
                <p className="mt-1 text-sm text-onyx/60">
                  As low as {formatPrice(best.price)} per unit at {best.quantity}+ units
                </p>
              )}
              {product.priceNote && (
                <p className="mt-1 text-sm text-onyx/70" data-testid="price-note">
                  {product.priceNote}
                </p>
              )}

              <p className="mt-5 text-base leading-relaxed text-onyx/70">{product.description}</p>

              <div className="mt-8">
                {/* A single price has nothing to compare, so skip the one-row table. */}
                {product.tiers.length > 1 && (
                  <>
                    <h2 className="text-xs font-semibold uppercase tracking-wide text-onyx/60">
                      Pricing by Quantity
                    </h2>
                    <table className="mt-3 w-full max-w-sm overflow-hidden rounded-md border border-gold/25 text-sm">
                      <caption className="sr-only">Price per unit by order quantity</caption>
                      <thead className="bg-cream-100">
                        <tr className="text-left text-xs uppercase tracking-wide text-onyx/60">
                          <th scope="col" className="px-4 py-2.5 font-semibold">
                            Quantity
                          </th>
                          <th scope="col" className="px-4 py-2.5 text-right font-semibold">
                            Price / Unit
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {product.tiers.map((tier) => (
                          <tr key={tier.quantity} className="border-t border-gold/15">
                            <th
                              scope="row"
                              className="px-4 py-2.5 text-left font-normal text-onyx/80"
                            >
                              {tier.quantity}+ units
                            </th>
                            <td className="px-4 py-2.5 text-right font-semibold tabular-nums text-onyx">
                              {formatPrice(tier.price)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </>
                )}
                <p className="mt-3 text-xs leading-relaxed text-onyx/60">
                  {merchandisePage.pricingDisclaimer}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-onyx/60">
                  {merchandisePage.deliveryEstimate}
                </p>
              </div>

              <ProductDetailActions product={product} />
            </div>
          </div>
        </ProductSelectionProvider>
      </section>

      {related.length > 0 && (
        <section
          aria-labelledby="related-heading"
          className="bg-cream-100 px-6 py-14 sm:px-8 lg:px-12"
        >
          <div className="mx-auto max-w-6xl">
            <div className="flex items-baseline justify-between gap-4 border-b border-gold/20 pb-2">
              <h2
                id="related-heading"
                className="font-heading text-lg uppercase tracking-wide text-onyx/80"
              >
                More in {product.category}
              </h2>
              <Link
                href={categoryHref}
                className="shrink-0 text-xs font-semibold text-gold-text underline-offset-2 hover:underline"
              >
                View all
              </Link>
            </div>
            <div className="mt-6 grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-4">
              {related.map((item) => (
                <ProductCard key={item.id} product={item} compact />
              ))}
            </div>
          </div>
        </section>
      )}

      <RecentlyViewed
        currentId={product.id}
        className="bg-cream px-6 py-14 sm:px-8 lg:px-12"
        innerClassName="mx-auto max-w-6xl"
      />
    </>
  );
}
