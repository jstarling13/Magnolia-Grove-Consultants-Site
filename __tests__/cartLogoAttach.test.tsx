import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useState } from "react";
import { CART_STORAGE_KEY, CartProvider } from "@/components/merchandise/CartContext";
import CartPageContent from "@/components/merchandise/CartPageContent";
import { LogoProvider } from "@/components/merchandise/LogoContext";
import OrderLogoField from "@/components/merchandise/OrderLogoField";
import { logoFileFromDataUrl } from "@/lib/logoFromPreview";
import { MAX_LOGO_BYTES } from "@/lib/orderLogo";
import type { CatalogProduct } from "@/lib/merchCatalog";

vi.mock("@/components/Turnstile", () => ({ default: () => null }));

const MUG: CatalogProduct = {
  id: "mug",
  name: "Test Mug",
  category: "Drinkware",
  brand: "Essentials",
  description: "",
  image: "/images/merch/x.webp",
  imprintArea: { top: 40, left: 50, width: 20 },
  colors: undefined,
  tiers: [{ quantity: 10, price: 5 }],
};

const PNG_DATA_URL = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA";
const FAILED =
  "Your request was sent. We could not attach your logo; reply to the confirmation email with it.";

const pngFile = (name = "logo.png", size = 2048) =>
  new File([new Uint8Array(size)], name, { type: "image/png" });

const fileInput = (container: HTMLElement) =>
  container.querySelector("input[type='file']") as HTMLInputElement;

function Harness({ initial = null }: { initial?: File | null }) {
  const [file, setFile] = useState<File | null>(initial);
  return (
    <>
      <OrderLogoField file={file} onFileChange={setFile} />
      <span data-testid="chosen">{file ? file.name : "none"}</span>
    </>
  );
}

beforeEach(() => window.localStorage.clear());
afterEach(() => vi.unstubAllGlobals());

describe("OrderLogoField", () => {
  it("is an optional, labelled file input that states the types and the 4 MB cap", () => {
    const { container } = render(<Harness />);
    const input = fileInput(container);
    expect(screen.getByLabelText(/Your logo \(optional\)/)).toBe(input);
    expect(input.accept.split(",").sort()).toEqual(
      [".ai", ".eps", ".jpeg", ".jpg", ".pdf", ".png", ".svg", ".webp"].sort()
    );
    expect(input).not.toHaveAttribute("multiple");
    expect(input).not.toBeRequired();
    expect(container.textContent).toMatch(/PNG, JPG, WEBP, SVG, PDF, AI or EPS/);
    expect(container.textContent).toMatch(/Up to 4 MB/);
    // Natively focusable, never display:none.
    expect(input.className).toMatch(/sr-only/);
    input.focus();
    expect(input).toHaveFocus();
  });

  it("has no control nested inside another control", () => {
    const { container } = render(<Harness initial={pngFile()} />);
    const selector = "button, a[href], input, select, textarea, [role='button']";
    for (const control of container.querySelectorAll(selector)) {
      expect(control.parentElement?.closest(selector), control.outerHTML).toBeNull();
    }
  });

  it("shows the chosen file's name and size with a Remove button, and announces it", () => {
    const { container } = render(<Harness />);
    fireEvent.change(fileInput(container), {
      target: { files: [pngFile("My Logo.png", 3 * 1024)] },
    });
    // The name appears in the field and in the test harness's own readout.
    expect(screen.getAllByText("My Logo.png")).toHaveLength(2);
    expect(screen.getByText("3 KB")).toBeInTheDocument();
    expect(screen.getByTestId("chosen")).toHaveTextContent("My Logo.png");
    expect(screen.getByRole("status")).toHaveTextContent("Logo attached: My Logo.png, 3 KB.");
    expect(screen.getByRole("status")).toHaveAttribute("aria-live", "polite");
    expect(screen.getByRole("button", { name: "Remove My Logo.png" })).toBeInTheDocument();
  });

  it("removes the file, announces it, and returns focus to the input", () => {
    const { container } = render(<Harness initial={pngFile("a.png")} />);
    fireEvent.click(screen.getByRole("button", { name: "Remove a.png" }));
    expect(screen.getByTestId("chosen")).toHaveTextContent("none");
    expect(screen.queryByRole("button", { name: "Remove a.png" })).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(/Logo removed/);
    expect(fileInput(container)).toHaveFocus();
  });

  it("refuses a file over 4 MB with a clear error and keeps nothing", () => {
    const { container } = render(<Harness />);
    fireEvent.change(fileInput(container), {
      target: { files: [pngFile("huge.png", MAX_LOGO_BYTES + 1)] },
    });
    expect(screen.getByRole("alert")).toHaveTextContent(/too large.*4 MB/);
    expect(screen.getByTestId("chosen")).toHaveTextContent("none");
    expect(fileInput(container)).toHaveAttribute(
      "aria-describedby",
      expect.stringContaining(screen.getByRole("alert").id)
    );
  });

  it("accepts a file of exactly 4 MB", () => {
    const { container } = render(<Harness />);
    fireEvent.change(fileInput(container), {
      target: { files: [pngFile("edge.png", MAX_LOGO_BYTES)] },
    });
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByTestId("chosen")).toHaveTextContent("edge.png");
  });

  it("refuses a file type we do not take, and clears the error after a good choice", () => {
    const { container } = render(<Harness />);
    fireEvent.change(fileInput(container), {
      target: { files: [new File(["x"], "logo.gif", { type: "image/gif" })] },
    });
    expect(screen.getByRole("alert")).toHaveTextContent(
      /not accepted.*PNG, JPG, WEBP, SVG, PDF, AI or EPS/
    );
    fireEvent.change(fileInput(container), { target: { files: [pngFile("ok.png")] } });
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByTestId("chosen")).toHaveTextContent("ok.png");
  });

  it("accepts vector formats the preview tool does not", () => {
    const { container } = render(<Harness />);
    for (const name of ["a.pdf", "a.ai", "a.eps", "a.svg", "a.jpeg", "a.webp"]) {
      fireEvent.change(fileInput(container), { target: { files: [new File(["x"], name)] } });
      expect(screen.getByTestId("chosen")).toHaveTextContent(name);
    }
  });

  it("takes a dropped file, and asks for one file when several are dropped", () => {
    render(<Harness />);
    const zone = screen.getByTestId("order-logo-dropzone");
    fireEvent.drop(zone, { dataTransfer: { files: [pngFile("dropped.png")] } });
    expect(screen.getByTestId("chosen")).toHaveTextContent("dropped.png");
    fireEvent.click(screen.getByRole("button", { name: /Remove/ }));
    fireEvent.drop(zone, { dataTransfer: { files: [pngFile("a.png"), pngFile("b.png")] } });
    expect(screen.getByRole("alert")).toHaveTextContent(/one logo file/);
    expect(screen.getByTestId("chosen")).toHaveTextContent("none");
  });

  describe("pre-fill from the logo picked in the preview tool", () => {
    function withPreview() {
      window.localStorage.setItem("mg-merch-logo", PNG_DATA_URL);
      window.localStorage.setItem("mg-merch-logo-name", "Brand Mark.png");
      return render(
        <LogoProvider>
          <Harness />
        </LogoProvider>
      );
    }

    it("attaches that same logo without a second upload", async () => {
      withPreview();
      await waitFor(() => expect(screen.getByTestId("chosen")).toHaveTextContent("Brand Mark.png"));
      expect(screen.getByText(/This is the logo from your preview/)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Remove Brand Mark.png" })).toBeInTheDocument();
    });

    it("can be removed, and stays removed", async () => {
      const { rerender } = withPreview();
      await waitFor(() => expect(screen.getByTestId("chosen")).toHaveTextContent("Brand Mark.png"));
      fireEvent.click(screen.getByRole("button", { name: "Remove Brand Mark.png" }));
      expect(screen.getByTestId("chosen")).toHaveTextContent("none");
      rerender(
        <LogoProvider>
          <Harness />
        </LogoProvider>
      );
      await act(async () => {});
      expect(screen.getByTestId("chosen")).toHaveTextContent("none");
    });

    it("can be replaced with another file", async () => {
      const { container } = withPreview();
      await waitFor(() => expect(screen.getByTestId("chosen")).toHaveTextContent("Brand Mark.png"));
      fireEvent.change(fileInput(container), { target: { files: [pngFile("Other.png")] } });
      expect(screen.getByTestId("chosen")).toHaveTextContent("Other.png");
      expect(screen.queryByText(/logo from your preview/)).not.toBeInTheDocument();
    });

    it("does not overwrite a file the shopper already chose", async () => {
      window.localStorage.setItem("mg-merch-logo", PNG_DATA_URL);
      window.localStorage.setItem("mg-merch-logo-name", "Brand Mark.png");
      render(
        <LogoProvider>
          <Harness initial={pngFile("Mine.png")} />
        </LogoProvider>
      );
      await act(async () => {});
      expect(screen.getByTestId("chosen")).toHaveTextContent("Mine.png");
    });

    it("works with no preview logo and outside the preview provider", () => {
      render(<Harness />);
      expect(screen.getByTestId("chosen")).toHaveTextContent("none");
    });
  });
});

describe("logoFileFromDataUrl", () => {
  it("rebuilds a File with the preview's name and type", async () => {
    const file = logoFileFromDataUrl(PNG_DATA_URL, "Brand Mark.png")!;
    expect(file.name).toBe("Brand Mark.png");
    expect(file.type).toBe("image/png");
    expect(file.size).toBeGreaterThan(0);
  });

  it("adds an extension when the preview name has none, and refuses unusable data", () => {
    expect(logoFileFromDataUrl(PNG_DATA_URL, "logo")!.name).toBe("logo.png");
    expect(logoFileFromDataUrl(PNG_DATA_URL, null)!.name).toBe("logo.png");
    expect(logoFileFromDataUrl("data:text/plain;base64,aGk=", "note")).toBeNull();
    expect(logoFileFromDataUrl("not a data url", "x.png")).toBeNull();
    expect(logoFileFromDataUrl("data:image/png;base64,@@@@", "x.png")).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// The whole cart request form: step one (JSON) then step two (multipart)
// ---------------------------------------------------------------------------

function renderCart(options: { preview?: boolean } = {}) {
  window.localStorage.setItem(
    CART_STORAGE_KEY,
    JSON.stringify([{ productId: "mug", quantity: 10 }])
  );
  if (options.preview) {
    window.localStorage.setItem("mg-merch-logo", PNG_DATA_URL);
    window.localStorage.setItem("mg-merch-logo-name", "Brand Mark.png");
  }
  return render(
    <LogoProvider>
      <CartProvider>
        <CartPageContent catalog={[MUG]} pricingDisclaimer="D." deliveryEstimate="E." />
      </CartProvider>
    </LogoProvider>
  );
}

function fillContact() {
  const values = {
    "First Name": "Pat",
    "Last Name": "Lee",
    Email: "pat@example.com",
    Phone: "5555551234",
  };
  for (const [label, value] of Object.entries(values)) {
    fireEvent.change(screen.getByLabelText(label), { target: { value } });
  }
}

const submit = () => fireEvent.click(screen.getByRole("button", { name: "Submit Order Request" }));

const jsonResponse = (body: unknown, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => body,
});

describe("cart request form with a logo", () => {
  it("shows the intro wording and the logo field", () => {
    renderCart();
    const form = screen.getByRole("button", { name: "Submit Order Request" }).closest("form")!;
    expect(
      within(form).getByText(
        "Attach your logo (optional). We will place it on your items and send you a final quote with shipping, setup and any other costs. Nothing is charged until you approve the quote and pay."
      )
    ).toBeInTheDocument();
    expect(within(form).getByLabelText(/Your logo \(optional\)/)).toBeInTheDocument();
  });

  it("sends the order as JSON without the file, then uploads the chosen logo as multipart", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({
          success: true,
          orderRef: "MG-00007",
          confirmationEmailed: true,
          logoUploadToken: "tok.sig",
        })
      )
      .mockResolvedValueOnce(jsonResponse({ success: true, filename: "logo.png" }));
    vi.stubGlobal("fetch", fetchMock);
    const { container } = renderCart();
    fillContact();
    fireEvent.change(fileInput(container), {
      target: { files: [pngFile("Final Logo.png", 4096)] },
    });
    submit();
    await screen.findByText("Order Request Received");

    expect(fetchMock).toHaveBeenCalledTimes(2);
    const [orderUrl, orderInit] = fetchMock.mock.calls[0];
    expect(orderUrl).toBe("/api/merchant/cart-checkout");
    expect(orderInit.headers["Content-Type"]).toBe("application/json");
    const orderBody = JSON.parse(orderInit.body);
    expect(orderBody.hasLogo).toBe(true);
    expect(JSON.stringify(orderBody)).not.toMatch(/Final Logo|logoUploadToken/);

    const [uploadUrl, uploadInit] = fetchMock.mock.calls[1];
    expect(uploadUrl).toBe("/api/merchant/order-logo");
    expect(uploadInit.method).toBe("POST");
    const form = uploadInit.body as FormData;
    expect(form).toBeInstanceOf(FormData);
    expect(form.get("orderRef")).toBe("MG-00007");
    expect(form.get("token")).toBe("tok.sig");
    expect((form.get("file") as File).name).toBe("Final Logo.png");
    // The browser sets the multipart boundary itself.
    expect(uploadInit.headers).toBeUndefined();

    expect(screen.getByRole("status")).toHaveTextContent("Your logo is attached to your request.");
    expect(screen.getByRole("status").textContent).not.toMatch(/reply/i);
  });

  it("uploads the preview-tool logo that was pre-filled, without asking again", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({
          success: true,
          orderRef: "MG-00008",
          confirmationEmailed: true,
          logoUploadToken: "t.s",
        })
      )
      .mockResolvedValueOnce(jsonResponse({ success: true }));
    vi.stubGlobal("fetch", fetchMock);
    renderCart({ preview: true });
    await screen.findByRole("button", { name: "Remove Brand Mark.png" });
    fillContact();
    submit();
    await screen.findByText("Order Request Received");
    const form = fetchMock.mock.calls[1][1].body as FormData;
    expect((form.get("file") as File).name).toBe("Brand Mark.png");
    expect((form.get("file") as File).type).toBe("image/png");
  });

  it("sends no logo and makes no second request when the shopper removed it", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        jsonResponse({ success: true, orderRef: "MG-00009", confirmationEmailed: true })
      );
    vi.stubGlobal("fetch", fetchMock);
    renderCart({ preview: true });
    fireEvent.click(await screen.findByRole("button", { name: "Remove Brand Mark.png" }));
    fillContact();
    submit();
    await screen.findByText("Order Request Received");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).not.toHaveProperty("hasLogo");
    expect(screen.getByRole("status")).toHaveTextContent(
      "Reply to the confirmation email with your logo (vector PDF, AI, EPS or PNG)."
    );
  });

  it.each([
    [
      "the server refuses the file",
      () => Promise.resolve(jsonResponse({ success: false, error: "no" }, 400)),
    ],
    ["the server errors", () => Promise.resolve(jsonResponse({ success: false }, 500))],
    ["the network fails", () => Promise.reject(new Error("offline"))],
    [
      "the reply is not JSON",
      () =>
        Promise.resolve({
          ok: false,
          status: 502,
          json: async () => {
            throw new Error("html");
          },
        }),
    ],
  ])("keeps the order and says so when %s", async (_name, secondCall) => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({
          success: true,
          orderRef: "MG-00010",
          confirmationEmailed: true,
          logoUploadToken: "t.s",
        })
      )
      .mockImplementationOnce(secondCall);
    vi.stubGlobal("fetch", fetchMock);
    const { container } = renderCart();
    fillContact();
    fireEvent.change(fileInput(container), { target: { files: [pngFile()] } });
    submit();
    await screen.findByText("Order Request Received");
    expect(screen.getByRole("status")).toHaveTextContent(FAILED);
    expect(screen.getByText("MG-00010")).toBeInTheDocument();
    expect(screen.queryByText("Your logo is attached to your request.")).not.toBeInTheDocument();
  });

  it("says the same when the order came back without an upload token", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        jsonResponse({ success: true, orderRef: "MG-00011", confirmationEmailed: true })
      );
    vi.stubGlobal("fetch", fetchMock);
    const { container } = renderCart();
    fillContact();
    fireEvent.change(fileInput(container), { target: { files: [pngFile()] } });
    submit();
    await screen.findByText("Order Request Received");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("status")).toHaveTextContent(FAILED);
  });

  it("points to the contact email when no confirmation email went out and the logo failed", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(
          jsonResponse({
            success: true,
            orderRef: "MG-00012",
            confirmationEmailed: false,
            logoUploadToken: "t.s",
          })
        )
        .mockRejectedValueOnce(new Error("offline"))
    );
    const { container } = renderCart();
    fillContact();
    fireEvent.change(fileInput(container), { target: { files: [pngFile()] } });
    submit();
    await screen.findByText("Order Request Received");
    const text = screen.getByRole("status").textContent ?? "";
    expect(text).toContain("We could not attach your logo");
    expect(text).toContain("ben@magnoliagrovega.com and mention MG-00012");
  });

  it("does not upload when the order itself failed", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ success: false, error: "x" }, 503));
    vi.stubGlobal("fetch", fetchMock);
    const { container } = renderCart();
    fillContact();
    fireEvent.change(fileInput(container), { target: { files: [pngFile()] } });
    submit();
    await screen.findByRole("alert");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(screen.queryByText("Order Request Received")).not.toBeInTheDocument();
    // The chosen logo is still there for another try.
    expect(screen.getByRole("button", { name: "Remove logo.png" })).toBeInTheDocument();
  });

  it("never promises a mockup or proof", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          jsonResponse({ success: true, orderRef: "MG-00013", confirmationEmailed: true })
        )
    );
    const { container } = renderCart();
    expect(container.textContent).not.toMatch(/proof|mockup/i);
    fillContact();
    submit();
    await screen.findByText("Order Request Received");
    expect(container.textContent).not.toMatch(/proof|mockup/i);
    expect(container.textContent).toContain(
      "We will place your logo on your items and email you a final quote with shipping, setup and any other costs"
    );
  });
});
