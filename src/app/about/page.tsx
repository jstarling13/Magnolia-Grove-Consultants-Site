import type { Metadata } from "next";
import Header from "@/components/Header";
import About from "@/components/About";
import Footer from "@/components/Footer";
import { about } from "@/config/siteConfig";

export const metadata: Metadata = {
  title: `About | Magnolia Grove Consultants`,
  description: about.headline,
};

export default function AboutPage() {
  return (
    <>
      <Header />
      <main>
        <About />
      </main>
      <Footer />
    </>
  );
}
