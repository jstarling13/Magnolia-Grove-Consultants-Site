import type { Metadata } from "next";
import About from "@/components/About";
import HistoryTimeline from "@/components/about/HistoryTimeline";
import CoreValues from "@/components/about/CoreValues";
import ServicesPricing from "@/components/about/ServicesPricing";
import LeadershipTeam from "@/components/about/LeadershipTeam";
import CandidatesList from "@/components/about/CandidatesList";
import AboutClosingCta from "@/components/about/AboutClosingCta";
import { about } from "@/config/siteConfig";

export const metadata: Metadata = {
  title: `About | Magnolia Grove Consultants`,
  description: about.headline,
};

export default function AboutPage() {
  return (
    <>
      <About />
      <HistoryTimeline />
      <CoreValues />
      <ServicesPricing />
      <LeadershipTeam />
      <CandidatesList />
      <AboutClosingCta />
    </>
  );
}
