export const metadata = {
  title: "Admin | Magnolia Grove Consultants",
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-onyx text-white">{children}</div>;
}
