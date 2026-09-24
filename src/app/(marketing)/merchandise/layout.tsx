import { CartProvider } from "@/components/merchandise/CartContext";

export default function MerchandiseLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <CartProvider>{children}</CartProvider>;
}
