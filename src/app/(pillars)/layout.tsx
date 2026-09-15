import Header from "@/components/global/Header";
import Footer from "@/components/global/Footer";
import ConsultationDrawer from "@/components/noir/ConsultationDrawer";

export default function PillarsLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex min-h-screen flex-col bg-cream font-sans text-onyx/80">
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
      <ConsultationDrawer />
    </div>
  );
}
