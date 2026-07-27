import type { Metadata } from "next";
import Header from "@/components/Header";
import Metrics from "@/components/Metrics";
import Footer from "@/components/Footer";
import { metricsIntro } from "@/config/siteConfig";

export const metadata: Metadata = {
  title: `Results | Magnolia Grove Consultants`,
  description: metricsIntro.headline,
};

export default function ResultsPage() {
  return (
    <>
      <Header />
      <main>
        <Metrics />
      </main>
      <Footer />
    </>
  );
}
