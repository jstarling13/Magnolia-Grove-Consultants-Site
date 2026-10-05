import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ImprintArea } from "@/types";
import ProductImageWithLogo, {
  LOGO_PREVIEW_UNAVAILABLE_NOTE,
} from "@/components/merchandise/ProductImageWithLogo";

const logoState = vi.hoisted(() => ({ logo: null as string | null }));

vi.mock("@/components/merchandise/LogoContext", () => ({
  useLogo: () => ({ logo: logoState.logo }),
}));

const AREA: ImprintArea = { top: 50, left: 50, width: 20 };

const PRODUCT = {
  name: "Test Mug",
  image: "/images/merch/test-mug.webp",
  imageAlt: "Test Mug",
};

function renderImage(imprintArea: ImprintArea = AREA) {
  return render(<ProductImageWithLogo product={{ ...PRODUCT, imprintArea }} sizes="100vw" />);
}

describe("ProductImageWithLogo", () => {
  beforeEach(() => {
    logoState.logo = null;
    // jsdom has no ResizeObserver; the component only needs it to exist.
    vi.stubGlobal(
      "ResizeObserver",
      class {
        observe() {}
        disconnect() {}
        unobserve() {}
      }
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shows neither an overlay nor a note until a logo is uploaded", () => {
    renderImage({ ...AREA, hide: true });
    expect(screen.queryByAltText("Your logo preview")).toBeNull();
    expect(screen.queryByText(LOGO_PREVIEW_UNAVAILABLE_NOTE)).toBeNull();
  });

  it("overlays the logo when the photo is not flagged", () => {
    logoState.logo = "data:image/png;base64,AAAA";
    renderImage();
    expect(screen.getByAltText("Your logo preview")).toHaveAttribute(
      "src",
      "data:image/png;base64,AAAA"
    );
    expect(screen.queryByText(LOGO_PREVIEW_UNAVAILABLE_NOTE)).toBeNull();
  });

  it("shows a note instead of a misplaced logo when the photo is flagged hide", () => {
    logoState.logo = "data:image/png;base64,AAAA";
    renderImage({ ...AREA, hide: true });
    expect(screen.queryByAltText("Your logo preview")).toBeNull();
    expect(screen.getByText(LOGO_PREVIEW_UNAVAILABLE_NOTE)).toBeInTheDocument();
    // The product photo itself is untouched.
    expect(screen.getByAltText("Test Mug")).toBeInTheDocument();
  });
});
