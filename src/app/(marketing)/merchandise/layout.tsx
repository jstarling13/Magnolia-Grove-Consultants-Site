import { CartProvider } from "@/components/merchandise/CartContext";
import { LogoProvider } from "@/components/merchandise/LogoContext";
import { products } from "@/config/merchandiseConfig";

// Product ids only (no prices or supplier data): lets the cart drop saved lines for products that are gone or hidden.
const availableProductIds = products.map((product) => product.id);

export default function MerchandiseLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <LogoProvider>
      <CartProvider availableProductIds={availableProductIds}>{children}</CartProvider>
    </LogoProvider>
  );
}
