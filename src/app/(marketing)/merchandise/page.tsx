import type { Metadata } from "next";
import { merchandisePage, products } from "@/config/merchandiseConfig";
import { brand } from "@/config/siteConfig";
import { SHARE_IMAGE } from "@/app/(marketing)/merchandise/shareImage";
import { getStorefrontInitialCatalog } from "@/lib/merchStorefront";
import MerchRequestForm from "@/components/merchandise/RequestForm";
import ProductCatalog from "@/components/merchandise/ProductCatalog";
import CartLink from "@/components/merchandise/CartLink";

const TITLE = "Custom-Branded Merchandise | Magnolia Grove Consultants";
const DESCRIPTION =
  "Custom-branded apparel, headwear, drinkware, bags and promotional products for campaigns and businesses. Upload your logo, preview it on any item, and request a quote from Magnolia Grove Consultants.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  // ?category=, ?q= and ?sort= are views of this page, not separate pages.
  alternates: { canonical: "/merchandise" },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: "/merchandise",
    siteName: brand.name,
    type: "website",
    images: [SHARE_IMAGE],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: [SHARE_IMAGE.url],
  },
};

export default function MerchandisePage() {
  const hasProducts = products.length > 0;
  const catalog = getStorefrontInitialCatalog();

  return (
    <>
      <section className="relative bg-onyx px-6 py-20 text-center sm:px-8 lg:px-12 lg:py-28">
        {hasProducts && (
          <div className="absolute right-6 top-6 sm:right-8 sm:top-8 lg:right-12 lg:top-10">
            <CartLink />
          </div>
        )}
        <div className="mx-auto max-w-2xl">
          <span className="eyebrow">{merchandisePage.eyebrow}</span>
          <h1 className="mt-3 text-5xl uppercase text-white sm:text-6xl">
            {hasProducts ? merchandisePage.headline : "Coming Soon"}
          </h1>
          <p className="mt-5 text-base leading-relaxed text-muted-light">
            {hasProducts
              ? merchandisePage.subtitle
              : "Our merchandise catalog is on its way. Check back shortly."}
          </p>
        </div>
      </section>

      {hasProducts && (
        <section className="bg-cream px-6 py-20 sm:px-8 lg:px-12 lg:py-28">
          <div className="mx-auto max-w-8xl">
            <ProductCatalog
              products={catalog.products}
              categories={catalog.categories}
              categoryTotals={catalog.categoryTotals}
              brands={catalog.brands}
            />
          </div>
        </section>
      )}

      <section
        id="request"
        className={
          hasProducts
            ? "bg-cream-100 px-6 py-20 sm:px-8 lg:px-12 lg:py-28"
            : "bg-cream px-6 py-20 sm:px-8 lg:px-12 lg:py-28"
        }
      >
        <div className="mx-auto grid max-w-6xl grid-cols-1 items-start gap-12 lg:grid-cols-2">
          <div>
            <span className="eyebrow !text-gold-text">{merchandisePage.requestEyebrow}</span>
            <h2 className="mt-3 text-4xl sm:text-5xl">{merchandisePage.requestHeadline}</h2>
            <p className="mt-4 max-w-md text-base leading-relaxed text-onyx/60">
              {merchandisePage.requestSubtitle}
            </p>
          </div>
          <MerchRequestForm />
        </div>
      </section>
    </>
  );
}
