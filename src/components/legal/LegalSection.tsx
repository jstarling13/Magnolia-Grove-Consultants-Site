interface LegalSectionProps {
  id: string;
  index: string;
  title: string;
  children: React.ReactNode;
}

export default function LegalSection({ id, index, title, children }: LegalSectionProps) {
  return (
    <section
      id={id}
      className="scroll-mt-28 border-t border-gold/15 pt-8 first:border-t-0 first:pt-0"
    >
      <div className="flex items-baseline gap-3">
        <span className="font-heading text-sm font-bold tracking-wider text-gold-dark">
          {index}
        </span>
        <h2 className="text-xl text-onyx sm:text-2xl">{title}</h2>
      </div>
      <div className="mt-4 flex flex-col gap-4 text-left text-sm leading-relaxed text-onyx/80 sm:text-base">
        {children}
      </div>
    </section>
  );
}
