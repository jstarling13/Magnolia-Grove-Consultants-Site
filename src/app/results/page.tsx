import type { Metadata } from "next";
import Header from "@/components/global/Header";
import Metrics from "@/components/Metrics";
import Footer from "@/components/global/Footer";
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
