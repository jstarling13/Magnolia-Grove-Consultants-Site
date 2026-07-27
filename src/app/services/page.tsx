import type { Metadata } from "next";
import Header from "@/components/Header";
import Services from "@/components/Services";
import Footer from "@/components/Footer";
import { servicesIntro } from "@/config/siteConfig";

export const metadata: Metadata = {
  title: `Services | Magnolia Grove Consultants`,
  description: servicesIntro.subtitle,
};

export default function ServicesPage() {
  return (
    <>
      <Header />
      <main>
        <Services />
      </main>
      <Footer />
    </>
  );
}
