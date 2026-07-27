import type { Metadata } from "next";
import Metrics from "@/components/Metrics";
import { metricsIntro } from "@/config/siteConfig";

export const metadata: Metadata = {
  title: `Results | Magnolia Grove Consultants`,
  description: metricsIntro.headline,
};

export default function ResultsPage() {
  return <Metrics />;
}
