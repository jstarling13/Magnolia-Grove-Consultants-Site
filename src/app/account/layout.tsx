import Header from "@/components/global/Header";
import Footer from "@/components/global/Footer";

export const metadata = {
  title: "My Account | Magnolia Grove Consultants",
  robots: { index: false, follow: false },
};

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      <main className="min-h-screen bg-onyx">{children}</main>
      <Footer />
    </>
  );
}
