import { servicesPricing } from "@/config/aboutConfig";
import Reveal from "@/components/Reveal";

export default function ServicesPricing() {
  const { socialMediaTable, packages } = servicesPricing;

  return (
    <section className="border-t border-gold/15 bg-onyx px-6 py-20 sm:px-8 lg:px-12 lg:py-28">
      <div className="mx-auto max-w-6xl">
        <Reveal className="mx-auto max-w-2xl text-center">
          <span className="eyebrow">{servicesPricing.eyebrow}</span>
          <h2 className="mt-3 text-3xl sm:text-4xl">{servicesPricing.headline}</h2>
          <p className="mt-4 text-sm leading-relaxed text-muted sm:text-base">
            {servicesPricing.intro}
          </p>
        </Reveal>

        <Reveal className="mt-14">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="text-xl text-white sm:text-2xl">{socialMediaTable.title}</h3>
            <span className="text-sm font-semibold text-gold-bright">
              {socialMediaTable.priceRange}
            </span>
          </div>

          <div className="mt-6 overflow-x-auto rounded-lg border border-gold/20">
            <table className="w-full min-w-[480px] border-collapse text-left text-sm">
              <thead>
                <tr className="bg-onyx-200">
                  <th className="p-4 font-semibold text-muted">Package</th>
                  {socialMediaTable.tiers.map((tier) => (
                    <th key={tier.name} className="p-4 text-center">
                      <span className="block text-white">{tier.name}</span>
                      <span className="block text-xs font-normal text-gold-bright">
                        {tier.price}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {socialMediaTable.rows.map((row, rowIndex) => (
                  <tr key={row} className="border-t border-gold/15">
                    <td className="p-4 font-medium text-muted-light">{row}</td>
                    {socialMediaTable.tiers.map((tier) => (
                      <td key={tier.name} className="p-4 text-center text-white">
                        {tier.values[rowIndex]}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Reveal>

        <div className="mt-14 grid grid-cols-1 gap-6 sm:grid-cols-2">
          {packages.map((pkg, index) => (
            <Reveal key={pkg.title} delayMs={index * 100}>
              <div className="flex h-full flex-col rounded-lg border border-gold/20 bg-onyx-200 p-6">
                <div className="flex items-baseline justify-between gap-2">
                  <h4 className="text-base font-semibold text-white sm:text-lg">{pkg.title}</h4>
                  <span className="shrink-0 text-sm font-semibold text-gold-bright">
                    {pkg.price}
                    {pkg.priceNote && (
                      <span className="ml-1 text-xs font-normal text-muted">({pkg.priceNote})</span>
                    )}
                  </span>
                </div>
                <ul className="mt-4 flex flex-col gap-2 text-sm text-muted-light">
                  {pkg.items.map((item) => (
                    <li key={item} className="list-inside list-disc">
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
