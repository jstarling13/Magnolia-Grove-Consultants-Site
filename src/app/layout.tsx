import type { Metadata, Viewport } from "next";
import { Inter, Anton } from "next/font/google";
import { brand, contactDetails } from "@/config/siteConfig";
import Analytics from "@/components/Analytics";
import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://magnolia-grove-consultants.vercel.app";

const phone = contactDetails.find((detail) => detail.label === "Phone")?.value;
const email = contactDetails.find((detail) => detail.label === "Email")?.value;

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
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
};

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const anton = Anton({
  subsets: ["latin"],
  variable: "--font-heading",
  weight: "400",
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
  themeColor: "#0d0d0d",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-scroll-behavior="smooth" className={`${inter.variable} ${anton.variable}`}>
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        {children}
        <Analytics />
      </body>
    </html>
  );
}
