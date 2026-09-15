import Link from "next/link";
import { ArrowRight } from "lucide-react";
import Reveal from "@/components/Reveal";

export default function FinalCta() {
  return (
    <section className="border-t border-gold/15 bg-onyx-200 px-6 py-20 text-center sm:px-8 lg:px-12 lg:py-28">
      <Reveal className="mx-auto max-w-2xl">
        <h2 className="text-3xl text-white sm:text-4xl">Let&apos;s Talk About Your Race.</h2>
        <p className="mt-4 text-base leading-relaxed text-muted sm:text-lg">
          Tell us where things stand. We&apos;ll tell you what it takes to win.
        </p>
        <Link
          href="/booking"
          className="group mt-8 inline-flex items-center gap-2 rounded-md bg-gold px-8 py-4 text-sm font-semibold uppercase tracking-wider text-onyx transition-all hover:bg-gold-bright"
        >
          Request a Strategy Session
          <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
        </Link>
      </Reveal>
    </section>
  );
}
