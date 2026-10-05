import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import RecentlyViewed, { resetRecentLookupCache } from "@/components/merchandise/RecentlyViewed";
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
});
