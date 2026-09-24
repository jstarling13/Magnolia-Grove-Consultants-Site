import { CartProvider } from "@/components/merchandise/CartContext";
import { LogoProvider } from "@/components/merchandise/LogoContext";

export default function MerchandiseLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <LogoProvider>
      <CartProvider>{children}</CartProvider>
    </LogoProvider>
  );
}
