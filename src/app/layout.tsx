import type { Metadata, Viewport } from "next";
import { Inter, Oswald } from "next/font/google";
import { brand, contactDetails, socialLinks } from "@/config/siteConfig";
import Analytics from "@/components/Analytics";
import VerticalGate from "@/components/VerticalGate";
import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://magnolia-grove-consultants.vercel.app";

const phone = contactDetails.find((detail) => detail.label === "Phone")?.value;
const email = contactDetails.find((detail) => detail.label === "Email")?.value;

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "ProfessionalService",
  "@id": siteUrl,
  name: brand.name,
  description: brand.tagline,
  url: siteUrl,
  image: `${siteUrl}${brand.logoImage}`,
  telephone: phone,
  email,
  address: {
    "@type": "PostalAddress",
    addressLocality: "Columbus",
    addressRegion: "GA",
    addressCountry: "US",
  },
  areaServed: [
    { "@type": "State", name: "Georgia" },
    { "@type": "Country", name: "United States" },
  ],
  founder: {
    "@type": "Person",
    name: "Ben Garcia",
    jobTitle: "Founder & Principal",
  },
  sameAs: socialLinks.map((link) => link.href),
};

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const oswald = Oswald({
  subsets: ["latin"],
  variable: "--font-heading",
  weight: ["500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: `${brand.name} | ${brand.tagline}`,
  description: brand.tagline,
  openGraph: {
    title: `${brand.name} | ${brand.tagline}`,
    description: brand.tagline,
    url: siteUrl,
    siteName: brand.name,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: `${brand.name} | ${brand.tagline}`,
    description: brand.tagline,
  },
};

export const viewport: Viewport = {
  themeColor: "#faf8f2",
  colorScheme: "light",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className={`${inter.variable} ${oswald.variable}`}
    >
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        {children}
        <VerticalGate />
        <Analytics />
      </body>
    </html>
  );
}
