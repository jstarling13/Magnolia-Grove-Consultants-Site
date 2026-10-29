import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

let pathname = "/";
const replace = vi.fn();
vi.mock("next/navigation", () => ({
  usePathname: () => pathname,
  useRouter: () => ({ push: vi.fn(), replace }),
}));

import { fireEvent } from "@testing-library/react";
import VerticalGate from "@/components/VerticalGate";
import VerticalSwitch from "@/components/VerticalSwitch";

describe("VerticalGate", () => {
  beforeEach(() => {
    window.localStorage.clear();
    replace.mockClear();
  });

  it("sends a returning business visitor from the home page to /business", () => {
    window.localStorage.setItem("mg-vertical-choice", "business");
    pathname = "/";
    const { container } = render(<VerticalGate />);
    expect(replace).toHaveBeenCalledWith("/business");
    expect(container.textContent).not.toContain("Which one are you?");
  });

  it("leaves a returning political visitor on the home page without asking again", () => {
    window.localStorage.setItem("mg-vertical-choice", "political");
    pathname = "/";
    const { container } = render(<VerticalGate />);
    expect(replace).not.toHaveBeenCalled();
    expect(container.textContent).not.toContain("Which one are you?");
  });

  it("the header switch records the side the visitor moves to", () => {
    window.localStorage.setItem("mg-vertical-choice", "political");
    render(<VerticalSwitch to="business" />);
    fireEvent.click(screen.getByText(/For Businesses/));
    expect(window.localStorage.getItem("mg-vertical-choice")).toBe("business");
  });

  it("asks first-time visitors on the home page which kind of client they are", async () => {
    pathname = "/";
    render(<VerticalGate />);
    expect(await screen.findByText(/Which one are you\?/)).toBeTruthy();
  });

  it("never interrupts a shared product, catalog, or cart link", () => {
    for (const path of ["/merchandise", "/merchandise/nike-dri-fit-polo", "/merchandise/cart"]) {
      pathname = path;
      const { container, unmount } = render(<VerticalGate />);
      expect(container.textContent).not.toContain("Which one are you?");
      unmount();
    }
  });

  it("never interrupts an order status link from a customer's email", () => {
    pathname = "/orders/MG-00042";
    const { container } = render(<VerticalGate />);
    expect(container.textContent).not.toContain("Which one are you?");
  });
});
