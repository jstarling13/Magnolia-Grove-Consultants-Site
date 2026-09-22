import type { Metadata } from "next";
import Image from "next/image";
import { merchandisePage, products } from "@/config/merchandiseConfig";
import MerchRequestForm from "@/components/merchandise/RequestForm";

export const metadata: Metadata = {
  title: "Merchandise | Magnolia Grove Consultants",
  description: merchandisePage.subtitle,
};

export default function MerchandisePage() {
  const hasProducts = products.length > 0;

  return (
    <>
      <section className="bg-onyx px-6 py-20 text-center sm:px-8 lg:px-12 lg:py-28">
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
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {products.map((product) => (
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
          </div>
        </section>
      )}

      <section className={hasProducts ? "bg-cream-100 px-6 py-20 sm:px-8 lg:px-12 lg:py-28" : "bg-cream px-6 py-20 sm:px-8 lg:px-12 lg:py-28"}>
        <div className="mx-auto grid max-w-6xl grid-cols-1 items-start gap-12 lg:grid-cols-2">
          <div>
            <span className="eyebrow">{merchandisePage.requestEyebrow}</span>
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
