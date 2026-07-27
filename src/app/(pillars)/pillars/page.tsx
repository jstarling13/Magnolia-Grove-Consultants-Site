import type { Metadata } from "next";
import PillarHero from "@/components/noir/PillarHero";
import HubPillarGrid from "@/components/noir/HubPillarGrid";
import NoirStatStrip from "@/components/noir/NoirStatStrip";
import PillarTabSwitcher from "@/components/noir/PillarTabSwitcher";
import { pillarsHub, statStrip } from "@/config/pillarsConfig";

export const metadata: Metadata = {
  title: "Our 4 Core Pillars | Magnolia Grove Consultants",
  description: pillarsHub.heroSubheadline,
};

export default function PillarsHubPage() {
  return (
    <>
      <PillarHero
        title={pillarsHub.heroTitle}
        subheadline={pillarsHub.heroSubheadline}
        image={pillarsHub.heroImage}
        imageAlt={pillarsHub.heroImageAlt}
        priority
      />
      <NoirStatStrip stats={statStrip} />
      <HubPillarGrid />
      <PillarTabSwitcher />
    </>
  );
}
