import type { Metadata } from "next";
import { businessLeadForm, businessContactDetails } from "@/config/businessConfig";
import BusinessLeadForm from "@/components/business/LeadForm";

export const metadata: Metadata = {
  title: "Contact | Magnolia Grove Consultants",
  description: businessLeadForm.subtitle,
};

export default function BusinessContactPage() {
  return (
    <section className="bg-cream-100 px-6 py-20 sm:px-8 lg:px-12 lg:py-28">
      <div className="mx-auto grid max-w-6xl grid-cols-1 items-start gap-12 lg:grid-cols-2">
        <div>
          <span className="eyebrow">{businessLeadForm.eyebrow}</span>
          <h1 className="mt-3 text-3xl sm:text-4xl">{businessLeadForm.headline}</h1>
          <p className="mt-4 max-w-md text-base leading-relaxed text-onyx/60">
            {businessLeadForm.subtitle}
          </p>

          <ul className="mt-10 flex flex-col gap-3">
            {businessContactDetails.map((detail) => (
              <li key={detail.label} className="flex items-baseline gap-3">
                <span className="text-xs font-semibold uppercase tracking-[0.14em] text-onyx/50">
                  {detail.label}
                </span>
                {detail.href ? (
                  <a href={detail.href} className="text-sm font-semibold text-onyx">
                    {detail.value}
                  </a>
                ) : (
                  <span className="text-sm font-semibold text-onyx">{detail.value}</span>
                )}
              </li>
            ))}
          </ul>
        </div>

        <BusinessLeadForm />
      </div>
    </section>
  );
}
