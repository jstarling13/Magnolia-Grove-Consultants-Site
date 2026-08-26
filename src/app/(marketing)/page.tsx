import Hero from "@/components/Hero";
import TrustBadges from "@/components/TrustBadges";
import ImpactCounter from "@/components/ImpactCounter";
import Services from "@/components/Services";
import ResultsSpotlight from "@/components/home/ResultsSpotlight";
import VendorComparison from "@/components/VendorComparison";
import FeaturedCaseStudy from "@/components/home/FeaturedCaseStudy";
import Leadership from "@/components/home/Leadership";
import HowItWorks from "@/components/home/HowItWorks";
import FinalCta from "@/components/home/FinalCta";

export default function Home() {
  return (
    <>
      <Hero />
      <TrustBadges />
      <ImpactCounter />
      <Services />
      <ResultsSpotlight />
      <VendorComparison />
      <FeaturedCaseStudy />
      <Leadership />
      <HowItWorks />
      <FinalCta />
    </>
  );
}
