import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import OrderDetail from "@/components/admin/orders/OrderDetail";
import OrderLogoFiles from "@/components/admin/orders/OrderLogoFiles";
import { readOrderItems, type OrderRecord } from "@/lib/adminOrders";
import type { OrderFileSummary } from "@/lib/orderFiles";
import {
  buildCartOrderNotificationEmail,
  buildLogoAttachedNotificationEmail,
} from "@/lib/emailTemplates/orderEmails";

vi.mock("@/app/admin/actions", () => ({
  markSubmissionRead: vi.fn(),
  addDeliverable: vi.fn(),
  deleteDeliverable: vi.fn(),
  updateMerchOrderStatus: vi.fn(),
  sendMerchPaymentLink: vi.fn(),
  recordEspOrder: vi.fn(),
  markMerchShipped: vi.fn(),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
  redirect: vi.fn(),
}));

const files: OrderFileSummary[] = [
  {
    id: 11,
    filename: "Brand Mark.png",
    mime: "image/png",
    size: 52_000,
    createdAt: "2026-10-01T12:30:00.000Z",
  },
  {
    id: 12,
    filename: "vector.svg",
    mime: "image/svg+xml",
    size: 1_200,
    createdAt: "2026-10-01T12:31:00.000Z",
  },
  {
    id: 13,
    filename: "print.pdf",
    mime: "application/pdf",
    size: 2_400_000,
    createdAt: "2026-10-01T12:32:00.000Z",
  },
  {
    id: 14,
    filename: "mark.ai",
    mime: "application/postscript",
    size: 900_000,
    createdAt: "2026-10-01T12:33:00.000Z",
  },
];

describe("admin logo files section", () => {
  it("lists name, type, size and time, with a download link served by the admin route", () => {
    render(<OrderLogoFiles orderId={7} files={files} />);
    const region = screen.getByRole("region", { name: "Logo files" });
    expect(within(region).getAllByRole("listitem")).toHaveLength(4);
    expect(within(region).getByText("Brand Mark.png")).toBeInTheDocument();
    expect(within(region).getByText(/PNG image · 51 KB · Added Oct 1, 2026/)).toBeInTheDocument();
    expect(within(region).getByText(/SVG vector · 1 KB/)).toBeInTheDocument();
    expect(within(region).getByText(/PDF · 2\.3 MB/)).toBeInTheDocument();
    expect(within(region).getByText(/PostScript \(AI or EPS\)/)).toBeInTheDocument();

    const download = within(region).getByRole("link", { name: "Download Brand Mark.png" });
    expect(download).toHaveAttribute("href", "/admin/orders/7/files/11");
    expect(download).toHaveAttribute("download");
    expect(within(region).getAllByRole("link", { name: /^Download / })).toHaveLength(4);
  });

  it("shows a thumbnail only for raster images, through the authenticated route", () => {
    render(<OrderLogoFiles orderId={7} files={files} />);
    const images = screen.getAllByRole("img");
    expect(images).toHaveLength(1);
    expect(images[0]).toHaveAttribute("src", "/admin/orders/7/files/11?preview=1");
    expect(images[0]).toHaveAttribute("alt", "Preview of Brand Mark.png");
    // Nothing ever points an <img>, <object> or <iframe> at the SVG or PDF.
    const html = document.body.innerHTML;
    expect(html).not.toMatch(/files\/12\?preview/);
    expect(html).not.toMatch(/files\/13\?preview/);
    expect(html).not.toMatch(/<(?:iframe|object|embed)/i);
  });

  it("says so when nothing is attached", () => {
    render(<OrderLogoFiles orderId={7} files={[]} />);
    expect(screen.getByText(/No logo attached/)).toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("is part of the order page, escaping odd file names", () => {
    const record: OrderRecord = {
      id: 7,
      createdAt: "2026-10-01T12:00:00.000Z",
      readAt: "2026-10-01T12:00:00.000Z",
      data: {
        firstName: "Pat",
        lastName: "Lee",
        email: "pat@example.com",
        phone: "7065550100",
        status: "new",
        items: [],
      },
    };
    const odd: OrderFileSummary[] = [
      { ...files[0], filename: '<img src=x onerror="alert(1)">.png' },
    ];
    const { container } = render(
      <OrderDetail order={record} items={readOrderItems(record.data)} files={odd} />
    );
    expect(screen.getByRole("region", { name: "Logo files" })).toBeInTheDocument();
    expect(container.querySelector("img[onerror]")).toBeNull();
    expect(screen.getAllByText(/onerror/).length).toBeGreaterThan(0);
  });
});

describe("business emails about the logo", () => {
  const base = {
    orderRef: "MG-00042",
    firstName: "Pat",
    lastName: "Lee",
    email: "pat@example.com",
    phone: "7065550100",
    notes: "",
    items: [{ productId: "x", name: "Mug", quantity: 10, unitPrice: 5, lineTotal: 50 }],
    total: 50,
  };

  it("the new-order email says a logo is coming, or that none was attached", () => {
    const coming = buildCartOrderNotificationEmail({ ...base, logoComing: true });
    expect(coming.html).toContain("The customer is attaching a logo");
    expect(coming.text).toContain("Logo: The customer is attaching a logo");
    const none = buildCartOrderNotificationEmail(base);
    expect(none.html).toContain("No logo attached");
    expect(none.html).not.toContain("is attaching a logo");
  });

  it("the logo-attached email names the file and points to the order in admin, with no attachment", () => {
    const built = buildLogoAttachedNotificationEmail({
      orderId: 42,
      orderRef: "MG-00042",
      filename: 'Mark <b>"final"</b>.png',
      size: 52_000,
      customerName: "Pat Lee",
    });
    expect(built.subject).toBe("MG-00042: Logo attached");
    expect(built.html).toContain("Logo attached");
    expect(built.html).toContain("Mark &lt;b&gt;&quot;final&quot;&lt;/b&gt;.png (51 KB)");
    expect(built.html).not.toContain("<b>&quot;final");
    expect(built.html).toMatch(/href="https?:\/\/[^"]+\/admin\/orders\/42"/);
    expect(built.text).toMatch(/Logo attached: Mark .*\.png \(51 KB\)/);
    expect(built.text).toMatch(/\/admin\/orders\/42/);
    expect(built.html).not.toMatch(/espplus|supplier/i);
  });
});
