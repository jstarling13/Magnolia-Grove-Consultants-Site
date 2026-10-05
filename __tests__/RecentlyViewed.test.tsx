import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import RecentlyViewed, {
  THUMBNAIL_SIZES,
  resetRecentLookupCache,
} from "@/components/merchandise/RecentlyViewed";
import { RECENT_STORAGE_KEY } from "@/lib/merchRecent";

const LOOKUP = {
  a: { id: "a", name: "Alpha Tee", image: "/images/merch/a.jpg", startingPrice: 12 },
  b: { id: "b", name: "Beta Mug", startingPrice: 7.5 },
  c: { id: "c", name: "Gamma Cap", image: "/images/merch/c.jpg", startingPrice: 9 },
};

function stubLookup(response: Partial<Response> = { ok: true, json: async () => LOOKUP }) {
  const fetchMock = vi.fn(async () => response as Response);
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("RecentlyViewed", () => {
  beforeEach(() => {
    window.localStorage.clear();
    resetRecentLookupCache();
  });
  afterEach(() => vi.unstubAllGlobals());

  it("renders nothing and does not fetch when there is no history", () => {
    const fetchMock = stubLookup();
    const { container } = render(<RecentlyViewed />);
    expect(container).toBeEmptyDOMElement();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("lists stored products newest first with name, price and link", async () => {
    window.localStorage.setItem(RECENT_STORAGE_KEY, JSON.stringify(["b", "a"]));
    stubLookup();
    render(<RecentlyViewed />);
    const links = await screen.findAllByRole("link");
    expect(links.map((l) => l.getAttribute("href"))).toEqual(["/merchandise/b", "/merchandise/a"]);
    expect(screen.getByText("Beta Mug")).toBeInTheDocument();
    expect(screen.getByText("$12.00 per unit")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Recently viewed" })).toBeInTheDocument();
  });

  it("skips ids that are no longer in the catalog", async () => {
    window.localStorage.setItem(RECENT_STORAGE_KEY, JSON.stringify(["gone", "a"]));
    stubLookup();
    render(<RecentlyViewed />);
    expect(await screen.findAllByRole("link")).toHaveLength(1);
  });

  it("on a product page records the view but leaves that product out of the strip", async () => {
    window.localStorage.setItem(RECENT_STORAGE_KEY, JSON.stringify(["a", "c"]));
    stubLookup();
    render(<RecentlyViewed currentId="b" />);
    const links = await screen.findAllByRole("link");
    expect(links.map((l) => l.getAttribute("href"))).toEqual(["/merchandise/a", "/merchandise/c"]);
    expect(JSON.parse(window.localStorage.getItem(RECENT_STORAGE_KEY)!)).toEqual(["b", "a", "c"]);
  });

  it("shows nothing when the visited product is the only history", async () => {
    const fetchMock = stubLookup();
    const { container } = render(<RecentlyViewed currentId="a" />);
    await waitFor(() =>
      expect(JSON.parse(window.localStorage.getItem(RECENT_STORAGE_KEY)!)).toEqual(["a"])
    );
    expect(container).toBeEmptyDOMElement();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("copes with corrupt storage and a failed lookup", async () => {
    window.localStorage.setItem(RECENT_STORAGE_KEY, "%%%");
    stubLookup();
    const first = render(<RecentlyViewed />);
    expect(first.container).toBeEmptyDOMElement();
    first.unmount();

    window.localStorage.setItem(RECENT_STORAGE_KEY, JSON.stringify(["a"]));
    const fetchMock = stubLookup({ ok: false, status: 500 });
    const second = render(<RecentlyViewed />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(second.container).toBeEmptyDOMElement();
  });

  describe("thumbnails", () => {
    async function renderStrip() {
      window.localStorage.setItem(RECENT_STORAGE_KEY, JSON.stringify(["a", "c"]));
      stubLookup();
      const view = render(<RecentlyViewed />);
      await screen.findAllByRole("link");
      return view;
    }

    it("are decorative, because each sits in a link next to the visible product name", async () => {
      const { container } = await renderStrip();
      const images = container.querySelectorAll("img");
      expect(images).toHaveLength(2);
      for (const image of images) {
        expect(image).toHaveAttribute("alt", "");
        // The name is in the same link, so the image would only repeat it.
        const link = image.closest("a")!;
        expect(link.textContent).toContain(link.querySelector("p")!.textContent);
      }
    });

    it("leave each link with a single, non-repeating accessible name", async () => {
      await renderStrip();
      expect(screen.getByRole("link", { name: /^Alpha Tee\b/ })).toBeInTheDocument();
      expect(screen.queryByRole("link", { name: /Alpha Tee.*Alpha Tee/ })).not.toBeInTheDocument();
    });

    it("tell the browser the real rendered width instead of the full-screen default", async () => {
      expect(THUMBNAIL_SIZES).toBe("(min-width: 640px) 160px, 144px");
      const { container } = await renderStrip();
      for (const image of container.querySelectorAll("img")) {
        expect(image).toHaveAttribute("sizes", THUMBNAIL_SIZES);
        // Lazy, so off-screen thumbnails are not fetched until scrolled near.
        expect(image).toHaveAttribute("loading", "lazy");
      }
    });

    it("render no image at all when a product has none", async () => {
      window.localStorage.setItem(RECENT_STORAGE_KEY, JSON.stringify(["b"]));
      stubLookup();
      const { container } = render(<RecentlyViewed />);
      await screen.findAllByRole("link");
      expect(container.querySelector("img")).toBeNull();
    });
  });
});
