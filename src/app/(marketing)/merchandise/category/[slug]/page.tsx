import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import CartLink from "@/components/merchandise/CartLink";
import CategoryProductGrid from "@/components/merchandise/CategoryProductGrid";
import RecentlyViewed from "@/components/merchandise/RecentlyViewed";
import { buildBreadcrumbJsonLd, buildCategoryMetadata, serializeJsonLd } from "@/lib/merchSeo";
import { categoryPath, categorySlug } from "@/lib/merchSlug";
import { getCategoryCatalog, getStorefrontCategories } from "@/lib/merchStorefront";
import { getSiteUrl } from "@/lib/siteUrl";

interface CategoryPageProps {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return getStorefrontCategories().map((category) => ({ slug: categorySlug(category) }));
}

export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  const { slug } = await params;
  const catalog = getCategoryCatalog(slug);
  if (!catalog) return { title: "Category Not Found | Magnolia Grove Consultants" };
  return buildCategoryMetadata(catalog.category, catalog.products, getSiteUrl());
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { slug } = await params;
  const catalog = getCategoryCatalog(slug);
  if (!catalog) notFound();

  const { category, products } = catalog;
  const others = getStorefrontCategories().filter((name) => name !== category);
  const breadcrumbJsonLd = buildBreadcrumbJsonLd(
    [
      { name: "Merchandise", path: "/merchandise" },
      { name: category, path: categoryPath(category) },
    ],
    getSiteUrl()
  );

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(breadcrumbJsonLd) }}
      />

      <section className="relative bg-onyx px-6 py-14 sm:px-8 lg:px-12 lg:py-20">
        <div className="mx-auto max-w-8xl">
          <div className="flex items-center justify-between gap-4">
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
                <li aria-current="page" className="min-w-0 truncate text-white/60">
                  {category}
                </li>
              </ol>
            </nav>
            <CartLink />
          </div>
          <div className="mt-10 max-w-2xl">
            <span className="eyebrow">Merchandise</span>
            <h1 className="mt-3 text-5xl uppercase text-white sm:text-6xl">{category}</h1>
            <p className="mt-5 text-base leading-relaxed text-muted-light">
              {products.length} {products.length === 1 ? "item" : "items"} to brand for your
              campaign or business. Upload your logo on the main catalog to preview it on any
              product.
            </p>
          </div>
        </div>
      </section>

      <section
        id="category-products"
        className="scroll-mt-24 bg-cream px-6 py-16 sm:px-8 lg:px-12 lg:py-20"
      >
        <div className="mx-auto max-w-8xl">
          <CategoryProductGrid products={products} category={category} />
        </div>
      </section>

      <section className="bg-cream-100 px-6 py-16 sm:px-8 lg:px-12">
        <div className="mx-auto max-w-8xl space-y-12">
          <RecentlyViewed />

          <div>
            <h2 className="border-b border-gold/20 pb-2 font-heading text-lg uppercase tracking-wide text-onyx/80">
              More categories
            </h2>
            <ul className="mt-6 flex flex-wrap gap-2">
              {others.map((name) => (
                <li key={name}>
                  <Link
                    href={categoryPath(name)}
                    className="inline-flex rounded-full border border-gold/30 bg-cream px-3.5 py-1.5 text-sm font-medium text-onyx/80 transition-colors hover:border-gold hover:text-onyx focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-dark"
                  >
                    {name}
                  </Link>
                </li>
              ))}
              <li>
                <Link
                  href="/merchandise"
                  className="inline-flex rounded-full border border-onyx bg-onyx px-3.5 py-1.5 text-sm font-medium text-white transition-colors hover:bg-onyx/85"
                >
                  All merchandise
                </Link>
              </li>
            </ul>
            <p className="mt-6 text-sm text-onyx/60">
              Don&apos;t see what you need?{" "}
              <Link
                href="/merchandise#request"
                className="font-semibold text-gold-dark underline-offset-2 hover:underline"
              >
                Request a product
              </Link>{" "}
              and we&apos;ll source it for you.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
