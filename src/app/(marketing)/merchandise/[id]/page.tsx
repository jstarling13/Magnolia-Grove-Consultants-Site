import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getProductById, merchandisePage, products } from "@/config/merchandiseConfig";
import CartLink from "@/components/merchandise/CartLink";
import ProductDetailActions from "@/components/merchandise/ProductDetailActions";
import ColorSwatches from "@/components/merchandise/ColorSwatches";

interface ProductPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { id } = await params;
  const product = getProductById(id);
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
  const product = getProductById(id);
  if (!product) notFound();

  const sortedTiers = [...product.priceTiers].sort((a, b) => a.quantity - b.quantity);

  return (
    <>
      <section className="relative bg-onyx px-6 py-10 sm:px-8 lg:px-12">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <Link
            href="/merchandise"
            className="text-sm font-semibold text-muted-light transition-colors hover:text-gold-bright"
          >
            ← Back to Merchandise
          </Link>
          <CartLink />
        </div>
      </section>

      <section className="bg-cream px-6 py-16 sm:px-8 lg:px-12 lg:py-24">
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-12 lg:grid-cols-2">
          <div className="relative h-80 w-full overflow-hidden rounded-lg border border-gold/25 bg-cream-200 sm:h-[28rem]">
            {product.image ? (
              <Image
                src={product.image}
                alt={product.imageAlt ?? product.name}
                fill
                sizes="(min-width: 1024px) 50vw, 100vw"
                className="object-cover object-center"
                priority
              />
            ) : (
              <div className="flex h-full items-center justify-center text-xs font-semibold uppercase tracking-wide text-onyx/40">
                Image Coming Soon
              </div>
            )}
          </div>

          <div>
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold uppercase tracking-wide text-gold-dark">
                {product.brand}
              </span>
              <span className="text-onyx/30">•</span>
              <span className="text-xs font-semibold uppercase tracking-wide text-onyx/50">
                {product.category}
              </span>
            </div>
            <h1 className="mt-2 text-3xl text-onyx sm:text-4xl">{product.name}</h1>
            <p className="mt-4 text-base leading-relaxed text-onyx/70">{product.description}</p>

            {product.colors && product.colors.length > 0 && (
              <div className="mt-6">
                <h2 className="text-xs font-semibold uppercase tracking-wide text-onyx/50">
                  {product.colors.length === 1 ? "Color" : `Colors (${product.colors.length})`}
                </h2>
                <div className="mt-2">
                  <ColorSwatches colors={product.colors} max={product.colors.length} size="md" />
                </div>
                <p className="mt-2 text-xs leading-relaxed text-onyx/50">
                  {product.colors.join(", ")}
                </p>
              </div>
            )}

            <div className="mt-6">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-onyx/50">
                Pricing by Quantity
              </h2>
              <table className="mt-2 w-full max-w-sm text-sm">
                <thead>
                  <tr className="border-b border-gold/20 text-left text-xs uppercase tracking-wide text-onyx/50">
                    <th className="py-2 font-semibold">Quantity</th>
                    <th className="py-2 font-semibold">Price / Unit</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedTiers.map((tier) => (
                    <tr key={tier.quantity} className="border-b border-gold/10">
                      <td className="py-2 text-onyx/80">{tier.quantity}+</td>
                      <td className="py-2 font-semibold text-onyx">${tier.price.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="mt-2 text-xs text-onyx/50">{merchandisePage.pricingDisclaimer}</p>
              <p className="mt-1 text-xs text-onyx/50">{merchandisePage.deliveryEstimate}</p>
            </div>

            <ProductDetailActions product={product} />
          </div>
        </div>
      </section>
    </>
  );
}
