import type { Metadata } from "next";
import Header from "@/components/Header";
import Contact from "@/components/Contact";
import Footer from "@/components/Footer";
import { leadForm } from "@/config/siteConfig";

export const metadata: Metadata = {
  title: `Contact | Magnolia Grove Consultants`,
  description: leadForm.subtitle,
};

export default function ContactPage() {
  return (
    <>
      <Header />
      <main>
        <Contact />
      </main>
      <Footer />
    </>
  );
}
