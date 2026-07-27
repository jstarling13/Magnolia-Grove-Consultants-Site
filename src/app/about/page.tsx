import type { Metadata } from "next";
import Header from "@/components/global/Header";
import About from "@/components/About";
import Footer from "@/components/global/Footer";
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
