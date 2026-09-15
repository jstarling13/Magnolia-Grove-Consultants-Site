interface TechStackGridProps {
  items: string[];
}

export default function TechStackGrid({ items }: TechStackGridProps) {
  return (
    <section className="border-t border-gold/15 bg-cream-200 px-6 py-16 sm:px-8 lg:px-12 lg:py-20">
      <div className="mx-auto max-w-8xl">
        <span className="eyebrow">Tools & Data Partners</span>
        <h2 className="mt-3 text-2xl text-onyx sm:text-3xl">The Tools We Use to Get This Done</h2>

        <div className="mt-10 flex flex-wrap gap-3">
          {items.map((item) => (
            <span
              key={item}
              className="rounded-full border border-gold/30 bg-cream px-5 py-2.5 text-sm font-medium text-onyx/80"
            >
              {item}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
