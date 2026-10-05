import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { merchandisePage, products } from "@/config/merchandiseConfig";
import CartLink from "@/components/merchandise/CartLink";
import ProductDetailActions from "@/components/merchandise/ProductDetailActions";
import ProductGallery from "@/components/merchandise/ProductGallery";
import { ProductSelectionProvider } from "@/components/merchandise/ProductSelectionContext";
import { bestTier, formatPrice, isRealBrand, startingTier } from "@/lib/merchCatalog";
import { getStorefrontProduct } from "@/lib/merchStorefront";

interface ProductPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { id } = await params;
  const product = getStorefrontProduct(id);
  if (!product) return { title: "Product Not Found | Magnolia Grove Consultants" };
  return {
    title: `${product.name} | Magnolia Grove Consultants`,
    description: product.description,
  };
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
  const categoryHref = `/merchandise?category=${encodeURIComponent(product.category)}`;

  return (
    <>
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
              <li aria-hidden="true" className="shrink-0 text-muted/50">
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
              <li aria-hidden="true" className="hidden shrink-0 text-muted/50 sm:block">
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
                <p className="text-xs font-semibold uppercase tracking-wide text-gold-dark">
                  {product.brand}
                </p>
              )}
              <h1 className="mt-1 text-3xl text-onyx sm:text-4xl">{product.name}</h1>

              <p className="mt-4 flex flex-wrap items-baseline gap-x-2 text-sm text-onyx/60">
                {product.tiers.length > 1 && <span>From</span>}
                <span className="font-heading text-3xl font-bold text-onyx">
                  {formatPrice(first.price)}
                </span>
                <span>per unit at {first.quantity}+ units</span>
              </p>
              {best.price < first.price && (
                <p className="mt-1 text-sm text-onyx/60">
                  As low as {formatPrice(best.price)} per unit at {best.quantity}+ units
                </p>
              )}

              <p className="mt-5 text-base leading-relaxed text-onyx/70">{product.description}</p>

              <div className="mt-8">
                <h2 className="text-xs font-semibold uppercase tracking-wide text-onyx/50">
                  Pricing by Quantity
                </h2>
                <table className="mt-3 w-full max-w-sm overflow-hidden rounded-md border border-gold/25 text-sm">
                  <caption className="sr-only">Price per unit by order quantity</caption>
                  <thead className="bg-cream-100">
                    <tr className="text-left text-xs uppercase tracking-wide text-onyx/50">
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
                        <th scope="row" className="px-4 py-2.5 text-left font-normal text-onyx/80">
                          {tier.quantity}+ units
                        </th>
                        <td className="px-4 py-2.5 text-right font-semibold tabular-nums text-onyx">
                          {formatPrice(tier.price)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="mt-3 text-xs leading-relaxed text-onyx/50">
                  {merchandisePage.pricingDisclaimer}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-onyx/50">
                  {merchandisePage.deliveryEstimate}
                </p>
              </div>

              <ProductDetailActions product={product} />
            </div>
          </div>
        </ProductSelectionProvider>
      </section>
    </>
  );
}
