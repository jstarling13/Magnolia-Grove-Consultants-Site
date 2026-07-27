import NoirHeader from "@/components/noir/NoirHeader";
import NoirFooter from "@/components/noir/NoirFooter";
import ConsultationDrawer from "@/components/noir/ConsultationDrawer";

export default function PillarsLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex min-h-screen flex-col bg-onyx font-sans text-muted-light">
      <NoirHeader />
      <main className="flex-1">{children}</main>
      <NoirFooter />
      <ConsultationDrawer />
    </div>
  );
}
