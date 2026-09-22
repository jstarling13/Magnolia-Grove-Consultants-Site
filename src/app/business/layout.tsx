import BusinessHeader from "@/components/business/Header";
import BusinessFooter from "@/components/business/Footer";

export default function BusinessLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex min-h-screen flex-col bg-cream font-sans text-onyx/80">
      <BusinessHeader />
      <main className="flex-1">{children}</main>
      <BusinessFooter />
    </div>
  );
}
