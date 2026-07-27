import type { Metadata } from "next";
import Contact from "@/components/Contact";
import { leadForm } from "@/config/siteConfig";

export const metadata: Metadata = {
  title: `Contact | Magnolia Grove Consultants`,
  description: leadForm.subtitle,
};

export default function ContactPage() {
  return <Contact />;
}
