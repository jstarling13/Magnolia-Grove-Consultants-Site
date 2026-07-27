import type { Metadata } from "next";
import About from "@/components/About";
import { about } from "@/config/siteConfig";

export const metadata: Metadata = {
  title: `About | Magnolia Grove Consultants`,
  description: about.headline,
};

export default function AboutPage() {
  return <About />;
}
