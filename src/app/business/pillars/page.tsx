import type { Metadata } from "next";
import PillarHero from "@/components/noir/PillarHero";
import NoirStatStrip from "@/components/noir/NoirStatStrip";
import BusinessHubPillarGrid from "@/components/business/HubPillarGrid";
import BusinessPillarTabSwitcher from "@/components/business/PillarTabSwitcher";
import { businessPillarsHub, businessStatStrip } from "@/config/businessPillarsConfig";

export const metadata: Metadata = {
  title: "Our 4 Core Pillars | Magnolia Grove Consultants",
  description: businessPillarsHub.heroSubheadline,
};

export default function BusinessPillarsHubPage() {
  return (
    <>
      <PillarHero
        eyebrow="Business & Organizational Frameworks"
        title={businessPillarsHub.heroTitle}
        subheadline={businessPillarsHub.heroSubheadline}
        image={businessPillarsHub.heroImage}
        imageAlt={businessPillarsHub.heroImageAlt}
        ctaLabel="SCHEDULE A CONSULTATION"
        ctaHref="/business/contact"
        priority
      />
      <NoirStatStrip stats={businessStatStrip} />
      <BusinessHubPillarGrid />
      <BusinessPillarTabSwitcher />
    </>
  );
}
