import { CartProvider } from "@/components/merchandise/CartContext";
import CartAnnouncer from "@/components/merchandise/CartAnnouncer";
import CartPruner from "@/components/merchandise/CartPruner";
import { LogoProvider } from "@/components/merchandise/LogoContext";

export default function MerchandiseLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <LogoProvider>
      <CartProvider>
        <CartPruner />
        <CartAnnouncer />
        {children}
      </CartProvider>
    </LogoProvider>
  );
}
