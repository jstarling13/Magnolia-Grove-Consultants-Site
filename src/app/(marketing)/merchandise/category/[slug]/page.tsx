import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import CartLink from "@/components/merchandise/CartLink";
import CategoryProductGrid from "@/components/merchandise/CategoryProductGrid";
import RecentlyViewed from "@/components/merchandise/RecentlyViewed";
import { getImprintArea, products as allLiveProducts } from "@/config/merchandiseConfig";
import {
  buildFaqJsonLd,
  buildGoodToKnow,
  computeCategoryFacts,
  getCategoryCopy,
} from "@/config/categoryCopy";
import { brand } from "@/config/siteConfig";
import { buildBreadcrumbJsonLd, buildCategoryMetadata, serializeJsonLd } from "@/lib/merchSeo";
import { categoryPath, categorySlug } from "@/lib/merchSlug";
import { FOCUSED_INITIAL_VISIBLE, toCatalogProduct } from "@/lib/merchCatalog";
import {
  getCategoryCards,
  getCategoryCatalog,
  getStorefrontCategories,
} from "@/lib/merchStorefront";
import { getSiteUrl } from "@/lib/siteUrl";
import { FOCUS_RING, FOCUS_RING_ON_DARK } from "@/components/global/focusRing";
import { SHARE_IMAGE } from "@/app/(marketing)/merchandise/shareImage";

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
  const base = buildCategoryMetadata(catalog.category, catalog.products, getSiteUrl());
  // Each category has its own written title and description (config/categoryCopy);
  // the lib's generic ones remain only as a fallback. The URL comes from the lib,
  // and the share image is added here (a page's own openGraph/twitter replaces
  // the layout's, image included).
  const copy = getCategoryCopy(catalog.category);
  const withShareImage = (meta: Metadata): Metadata => ({
    ...meta,
    openGraph: { ...meta.openGraph, images: [SHARE_IMAGE] },
    twitter: { ...meta.twitter, card: "summary_large_image", images: [SHARE_IMAGE.url] },
  });
  if (!copy) return withShareImage(base);
  const title = `${copy.title} | ${brand.name}`;
  const { description } = copy;
  return {
    ...withShareImage(base),
    title,
    description,
    openGraph: { ...base.openGraph, title, description, images: [SHARE_IMAGE] },
    twitter: {
      ...base.twitter,
      card: "summary_large_image",
      title,
      description,
      images: [SHARE_IMAGE.url],
    },
  };
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { slug } = await params;
  const catalog = getCategoryCatalog(slug);
  if (!catalog) notFound();

  const { category, products } = catalog;
  // Only the first screenful is sent with the page; the rest of the category
  // is fetched from cards.json when the shopper asks for it.
  const { cards, brands } = getCategoryCards(slug)!;
  const others = getStorefrontCategories().filter((name) => name !== category);
  const copy = getCategoryCopy(category);
  // Facts come from the full (untruncated) live products of this category.
  const facts = computeCategoryFacts(
    allLiveProducts
      .filter((product) => product.category === category)
      .map((product) => toCatalogProduct(product, getImprintArea(product)))
  );
  const goodToKnow = copy ? buildGoodToKnow(copy.highlights, facts) : [];
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

      {copy && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: serializeJsonLd(buildFaqJsonLd(copy.faqs)) }}
        />
      )}

      <section className="relative bg-onyx px-6 py-14 sm:px-8 lg:px-12 lg:py-20">
        <div className="mx-auto max-w-8xl">
          <div className="flex items-center justify-between gap-4">
            <nav aria-label="Breadcrumb" className="min-w-0">
              <ol className="flex min-w-0 items-center gap-2 text-sm text-muted-light">
                <li className="shrink-0">
                  <Link
                    href="/merchandise"
                    className={`inline-flex min-h-11 items-center rounded font-semibold transition-colors hover:text-gold-bright ${FOCUS_RING_ON_DARK}`}
                  >
                    Merchandise
                  </Link>
                </li>
                <li aria-hidden="true" className="shrink-0 text-muted/70">
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
            {copy ? (
              <>
                <p className="mt-5 text-base leading-relaxed text-muted-light">{copy.intro}</p>
                <p className="mt-3 text-sm leading-relaxed text-muted-light">
                  Upload your logo on the main catalog to preview it on a product.
                </p>
              </>
            ) : (
              <p className="mt-5 text-base leading-relaxed text-muted-light">
                {products.length} {products.length === 1 ? "item" : "items"} to brand for your
                campaign or business. Upload your logo on the main catalog to preview it on any
                product.
              </p>
            )}
          </div>
        </div>
      </section>

      <section
        id="category-products"
        className="scroll-mt-24 bg-cream px-6 py-16 sm:px-8 lg:px-12 lg:py-20"
      >
        <div className="mx-auto max-w-8xl">
          {/* The product cards are h3s; this keeps the outline h1 > h2 > h3. */}
          <h2 className="sr-only">{category} products</h2>
          <CategoryProductGrid
            products={cards.slice(0, FOCUSED_INITIAL_VISIBLE)}
            total={cards.length}
            brands={brands}
            category={category}
          />
        </div>
      </section>

      {copy && (
        <section className="border-t border-gold/15 bg-cream px-6 py-16 sm:px-8 lg:px-12 lg:py-20">
          <div className="mx-auto grid max-w-8xl gap-12 lg:grid-cols-[2fr_3fr] lg:gap-16">
            <div>
              <h2 className="border-b border-gold/20 pb-2 font-heading text-lg uppercase tracking-wide text-onyx/80">
                Good to know
              </h2>
              <ul className="mt-6 space-y-4 text-base leading-relaxed text-onyx/80">
                {goodToKnow.map((point) => (
                  <li key={point} className="border-l-2 border-gold-text/60 pl-4">
                    {point}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h2 className="border-b border-gold/20 pb-2 font-heading text-lg uppercase tracking-wide text-onyx/80">
                Common questions
              </h2>
              <div className="mt-6 space-y-3">
                {copy.faqs.map((faq) => (
                  <details
                    key={faq.question}
                    className="group rounded-lg border border-gold/20 bg-cream-200 transition-colors hover:border-gold/40"
                  >
                    <summary
                      className={`flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 rounded-lg px-5 py-4 text-base font-semibold text-onyx [&::-webkit-details-marker]:hidden ${FOCUS_RING}`}
                    >
                      {faq.question}
                      <span aria-hidden="true" className="shrink-0 text-lg text-gold-text">
                        <span className="group-open:hidden">+</span>
                        <span className="hidden group-open:inline">&minus;</span>
                      </span>
                    </summary>
                    <p className="px-5 pb-5 text-base leading-relaxed text-onyx/80">{faq.answer}</p>
                  </details>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

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
                    className={`inline-flex min-h-11 items-center rounded-full border border-gold-text/60 bg-cream px-4 py-1.5 text-sm font-medium text-onyx/80 transition-colors hover:border-gold-text hover:text-onyx ${FOCUS_RING}`}
                  >
                    {name}
                  </Link>
                </li>
              ))}
              <li>
                <Link
                  href="/merchandise"
                  className={`inline-flex min-h-11 items-center rounded-full border border-onyx bg-onyx px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-onyx/85 ${FOCUS_RING}`}
                >
                  All merchandise
                </Link>
              </li>
            </ul>
            <p className="mt-6 text-sm text-onyx/60">
              Don&apos;t see what you need?{" "}
              <Link
                href="/merchandise#request"
                className={`rounded font-semibold text-gold-text underline-offset-2 hover:underline ${FOCUS_RING}`}
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
