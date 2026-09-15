interface DeliverablesChecklistProps {
  items: string[];
}

export default function DeliverablesChecklist({ items }: DeliverablesChecklistProps) {
  return (
    <section className="border-t border-gold/15 bg-cream px-6 py-16 sm:px-8 lg:px-12 lg:py-20">
      <div className="mx-auto max-w-8xl">
        <span className="eyebrow">What&apos;s Included</span>
        <h2 className="mt-3 text-2xl text-onyx sm:text-3xl">At a Glance</h2>

        <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <div
              key={item}
              className="flex items-start gap-3 rounded-lg border border-gold/20 bg-cream-200 p-5 shadow-card"
            >
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-gold-bright" />
              <span className="text-sm text-onyx/80 sm:text-base">{item}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
