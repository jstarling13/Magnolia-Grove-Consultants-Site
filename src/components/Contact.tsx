import { contactDetails, leadForm } from "@/config/siteConfig";
import Reveal from "./Reveal";
import LeadForm from "./LeadForm";

export default function Contact() {
  return (
    <section id="contact" className="section-padding bg-onyx-100">
      <div className="container-grove grid grid-cols-1 gap-14 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-20">
        <Reveal>
          <span className="eyebrow">{leadForm.eyebrow}</span>
          <h2 className="mt-3 text-3xl sm:text-4xl">{leadForm.headline}</h2>
          <p className="mt-4 max-w-md text-base leading-relaxed text-muted">
            {leadForm.subtitle}
          </p>

          <div className="mt-10 flex flex-col gap-5">
            {contactDetails.map((detail) => {
              const Icon = detail.icon;
              const content = (
                <div className="flex items-start gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-gold/40 bg-gold/10 text-gold-bright">
                    <Icon size={18} />
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                      {detail.label}
                    </p>
                    <p className="mt-1 text-sm font-medium text-white">{detail.value}</p>
                  </div>
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
