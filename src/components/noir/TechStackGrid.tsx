interface TechStackGridProps {
  items: string[];
}

export default function TechStackGrid({ items }: TechStackGridProps) {
  return (
    <section className="border-t border-gold/15 bg-onyx-200 px-6 py-16 sm:px-8 lg:px-12 lg:py-20">
      <div className="mx-auto max-w-8xl">
        <span className="eyebrow">Tech Stack & Logistics Engine</span>
        <h2 className="mt-3 text-2xl text-white sm:text-3xl">
          Platforms & Partners Powering This Pillar
        </h2>

        <div className="mt-10 flex flex-wrap gap-3">
          {items.map((item) => (
            <span
              key={item}
              className="rounded-full border border-gold/30 bg-onyx px-5 py-2.5 text-sm font-medium text-muted-light"
            >
              {item}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
