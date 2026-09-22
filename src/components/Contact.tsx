import { contactDetails, leadForm } from "@/config/siteConfig";
import Reveal from "./Reveal";
import LeadForm from "./LeadForm";

export default function Contact() {
  return (
    <section id="contact" className="section-padding bg-cream-100">
      <div className="container-grove grid grid-cols-1 gap-14 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-20">
        <Reveal>
          <span className="eyebrow">{leadForm.eyebrow}</span>
          <h2 className="mt-3 text-4xl sm:text-5xl">{leadForm.headline}</h2>
          <p className="mt-4 max-w-md text-base leading-relaxed text-onyx/60">{leadForm.subtitle}</p>

          <div className="mt-10 flex flex-col gap-5">
            {contactDetails.map((detail) => {
              const content = (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-onyx/60">
                    {detail.label}
                  </p>
                  <p className="mt-1 text-sm font-medium text-onyx">{detail.value}</p>
                </div>
              );

              return detail.href ? (
                <a key={detail.label} href={detail.href} className="group">
                  {content}
                </a>
              ) : (
                <div key={detail.label}>{content}</div>
              );
            })}
          </div>
        </Reveal>

        <Reveal delayMs={100}>
          <LeadForm />
        </Reveal>
      </div>
    </section>
  );
}
