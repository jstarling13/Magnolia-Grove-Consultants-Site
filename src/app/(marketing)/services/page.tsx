import type { Metadata } from "next";
import Services from "@/components/Services";
import { servicesIntro } from "@/config/siteConfig";

export const metadata: Metadata = {
  title: `Services | Magnolia Grove Consultants`,
  description: servicesIntro.subtitle,
};

export default function ServicesPage() {
  return <Services />;
}
