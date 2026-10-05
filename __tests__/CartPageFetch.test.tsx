import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  CART_STORAGE_KEY,
  CartProvider,
  parseStoredCart,
} from "@/components/merchandise/CartContext";
import CartPageContent from "@/components/merchandise/CartPageContent";
import CartPruner from "@/components/merchandise/CartPruner";
import type { CartProduct } from "@/lib/merchCatalog";

vi.mock("@/components/Turnstile", () => ({ default: () => null }));

const pathname = vi.hoisted(() => ({ value: "/merchandise/cart" }));
vi.mock("next/navigation", () => ({ usePathname: () => pathname.value }));

const VEST: CartProduct = {
  id: "vest",
  name: "Test Vest",
  category: "Apparel",
  brand: "Peter Millar",
  image: "/images/merch/vest.webp",
  colors: ["Black", "Navy"],
  colorImages: { Navy: "/images/merch/vest-navy.webp" },
  tiers: [
    { quantity: 6, price: 100 },
    { quantity: 12, price: 90 },
  ],
};
const MUG: CartProduct = {
  id: "mug",
  name: "Test Mug",
  category: "Drinkware",
  brand: "Essentials",
  tiers: [{ quantity: 1, price: 5 }],
};
const ON_SALE: Record<string, CartProduct> = { vest: VEST, mug: MUG };

/** A fake static-file server: known ids 200, everything else 404. */
function fileServer(overrides: Record<string, () => Promise<unknown>> = {}) {
  return vi.fn(async (url: string) => {
    if (overrides[url]) return overrides[url]();
    const cartMatch = /^\/merchandise\/([^/]+)\/cart\.json$/.exec(url);
    if (cartMatch) {
      const product = ON_SALE[decodeURIComponent(cartMatch[1])];
      return product
        ? { ok: true, status: 200, json: async () => product }
        : { ok: false, status: 404, json: async () => ({}) };
    }
    if (url === "/merchandise/ids.json") {
      return { ok: true, status: 200, json: async () => Object.keys(ON_SALE) };
    }
    return { ok: false, status: 500, json: async () => ({}) };
  });
}

const stored = () => JSON.parse(window.localStorage.getItem(CART_STORAGE_KEY) ?? "null");
const fetchedUrls = (fetchMock: ReturnType<typeof fileServer>) =>
  fetchMock.mock.calls.map((call) => call[0] as string).sort();

function renderCart(savedLines: unknown) {
  window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(savedLines));
  return render(
    <CartProvider>
      <CartPageContent pricingDisclaimer="D." deliveryEstimate="E." />
    </CartProvider>
  );
}

describe("cart page fetches only what the cart holds", () => {
  beforeEach(() => {
    window.localStorage.clear();
    pathname.value = "/merchandise/cart";
  });
  afterEach(() => vi.unstubAllGlobals());

  it("shows a loading skeleton, then the lines, requesting one file per distinct product", async () => {
    const fetchMock = fileServer();
    vi.stubGlobal("fetch", fetchMock);
    renderCart([
      { productId: "vest", color: "Navy", quantity: 6 },
      { productId: "vest", color: "Black", quantity: 6 },
      { productId: "mug", quantity: 10 },
    ]);

    expect(screen.getByRole("status", { name: "" })).toHaveTextContent("Loading your cart");
    expect(screen.queryByText("Your cart is empty.")).not.toBeInTheDocument();

    expect(await screen.findByLabelText("Quantity for Test Vest, Navy")).toHaveValue(6);
    expect(screen.getByLabelText("Quantity for Test Mug")).toHaveValue(10);
    expect(screen.queryByText("Loading your cart")).not.toBeInTheDocument();
    // Priced with the shared tiers: 6 + 6 = 12 vests at $90.
    expect(screen.getAllByText("$90.00 per unit")).toHaveLength(2);
    expect(fetchedUrls(fetchMock)).toEqual([
      "/merchandise/mug/cart.json",
      "/merchandise/vest/cart.json",
    ]);
  });

  it("fetches nothing for an empty cart and says it is empty", async () => {
    const fetchMock = fileServer();
    vi.stubGlobal("fetch", fetchMock);
    renderCart([]);
    expect(await screen.findByText("Your cart is empty.")).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("removes lines whose product file is a 404 and shows the 'no longer available' notice", async () => {
    vi.stubGlobal("fetch", fileServer());
    renderCart([
      { productId: "bogus-product", quantity: 5000 },
      { productId: "mug", quantity: 10 },
    ]);
    expect(
      await screen.findByText("An item in your cart is no longer available and was removed.")
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Quantity for Test Mug")).toHaveValue(10);
    await waitFor(() => expect(stored()).toEqual([{ productId: "mug", quantity: 10 }]));
  });

  it("ends on an empty cart (not a flash of one) when every product is gone", async () => {
    vi.stubGlobal("fetch", fileServer());
    renderCart([{ productId: "gone", quantity: 5 }]);
    expect(await screen.findByText("Your cart is empty.")).toBeInTheDocument();
    expect(screen.getByText(/no longer available/)).toBeInTheDocument();
    expect(stored()).toEqual([]);
  });

  it("keeps saved lines and offers a retry when offline, then recovers", async () => {
    let online = false;
    const fetchMock = fileServer({
      "/merchandise/mug/cart.json": async () => {
        if (!online) throw new TypeError("Failed to fetch");
        return { ok: true, status: 200, json: async () => MUG };
      },
    });
    vi.stubGlobal("fetch", fetchMock);
    renderCart([{ productId: "mug", quantity: 10 }]);

    expect(await screen.findByRole("alert")).toHaveTextContent("couldn't load your cart items");
    expect(stored()).toEqual([{ productId: "mug", quantity: 10 }]);
    expect(screen.queryByText(/no longer available/)).not.toBeInTheDocument();

    online = true;
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByLabelText("Quantity for Test Mug")).toHaveValue(10);
    expect(stored()).toEqual([{ productId: "mug", quantity: 10 }]);
  });

  it("treats a server error like offline: nothing is deleted", async () => {
    vi.stubGlobal(
      "fetch",
      fileServer({
        "/merchandise/mug/cart.json": async () => ({
          ok: false,
          status: 503,
          json: async () => ({}),
        }),
      })
    );
    renderCart([{ productId: "mug", quantity: 10 }]);
    expect(await screen.findByRole("button", { name: "Try again" })).toBeInTheDocument();
    expect(stored()).toEqual([{ productId: "mug", quantity: 10 }]);
  });

  it("does not refetch a product when its quantity changes", async () => {
    const fetchMock = fileServer();
    vi.stubGlobal("fetch", fetchMock);
    renderCart([{ productId: "mug", quantity: 10 }]);
    const input = await screen.findByLabelText("Quantity for Test Mug");
    fireEvent.change(input, { target: { value: "20" } });
    expect((await screen.findAllByText("$100.00")).length).toBeGreaterThan(0);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("uses a catalog passed in directly without fetching (tests and previews)", () => {
    const fetchMock = fileServer();
    vi.stubGlobal("fetch", fetchMock);
    window.localStorage.setItem(
      CART_STORAGE_KEY,
      JSON.stringify([{ productId: "mug", quantity: 10 }])
    );
    render(
      <CartProvider>
        <CartPageContent catalog={[MUG]} pricingDisclaimer="D." deliveryEstimate="E." />
      </CartProvider>
    );
    expect(screen.getByLabelText("Quantity for Test Mug")).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("CartPruner (header count on other merchandise pages)", () => {
  beforeEach(() => {
    window.localStorage.clear();
    pathname.value = "/merchandise";
  });
  afterEach(() => vi.unstubAllGlobals());

  function renderPruner(savedLines: unknown) {
    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(savedLines));
    return render(
      <CartProvider>
        <CartPruner />
      </CartProvider>
    );
  }

  it("downloads nothing when the cart is empty", async () => {
    const fetchMock = fileServer();
    vi.stubGlobal("fetch", fetchMock);
    renderPruner([]);
    await Promise.resolve();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("drops lines for products that are no longer on sale", async () => {
    const fetchMock = fileServer();
    vi.stubGlobal("fetch", fetchMock);
    renderPruner([
      { productId: "gone", quantity: 5000 },
      { productId: "mug", quantity: 10 },
    ]);
    await waitFor(() => expect(stored()).toEqual([{ productId: "mug", quantity: 10 }]));
    expect(fetchedUrls(fetchMock)).toEqual(["/merchandise/ids.json"]);
  });

  it("leaves the cart alone when the list can't be loaded", async () => {
    vi.stubGlobal(
      "fetch",
      fileServer({
        "/merchandise/ids.json": async () => {
          throw new TypeError("offline");
        },
      })
    );
    renderPruner([{ productId: "gone", quantity: 5 }]);
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(stored()).toEqual([{ productId: "gone", quantity: 5 }]);
  });

  it("skips the check on the cart page, which checks per product itself", async () => {
    pathname.value = "/merchandise/cart";
    const fetchMock = fileServer();
    vi.stubGlobal("fetch", fetchMock);
    renderPruner([{ productId: "mug", quantity: 10 }]);
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("saved cart size", () => {
  it("never holds more lines than the API accepts, bounding how many products are requested", () => {
    const raw = JSON.stringify(
      Array.from({ length: 500 }, (_, index) => ({ productId: `p${index}`, quantity: 1 }))
    );
    expect(parseStoredCart(raw)).toHaveLength(100);
  });
});
