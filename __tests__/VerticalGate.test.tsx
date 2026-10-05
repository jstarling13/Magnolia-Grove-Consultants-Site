import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

let pathname = "/";
vi.mock("next/navigation", () => ({
  usePathname: () => pathname,
  useRouter: () => ({ push: vi.fn() }),
}));

import VerticalGate from "@/components/VerticalGate";

describe("VerticalGate", () => {
  beforeEach(() => {
    window.localStorage.clear();
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
});
