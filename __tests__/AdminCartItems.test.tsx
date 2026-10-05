import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/app/admin/actions", () => ({
  markSubmissionRead: vi.fn(),
  addDeliverable: vi.fn(),
  deleteDeliverable: vi.fn(),
  updateMerchOrderStatus: vi.fn(),
  sendMerchPaymentLink: vi.fn(),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }) }));

import Dashboard, { type SubmissionRow } from "@/components/admin/Dashboard";

const row: SubmissionRow = {
  id: 9,
  type: "merch_order",
  created_at: "2026-10-05T12:00:00.000Z",
  read_at: "2026-10-05T12:05:00.000Z",
  data: {
    firstName: "Pat",
    lastName: "Lee",
    email: "pat@example.com",
    product: "Galway Vest (Navy)",
    quantity: "18",
    total: 1000,
    status: "new",
    items: [
      { productId: "vest", name: "Galway Vest", color: "Navy", quantity: 6, unitPrice: 90, lineTotal: 540 },
      { productId: "vest", name: "Galway Vest", color: "Black", quantity: 12, unitPrice: 90, lineTotal: 1080 },
      // Stored before colors were recorded.
      { productId: "pen", name: "Metal Pen", quantity: 250, unitPrice: 1.5, lineTotal: 375 },
    ],
  },
};

describe("admin dashboard cart items", () => {
  it("shows the color on each cart line, and 'not specified' on legacy lines", () => {
    render(<Dashboard submissions={[row]} username="ben" deliverablesBySubmission={{}} />);
    fireEvent.click(screen.getByText(/Galway Vest \(Navy\)/));

    const cartItems = screen.getByText("Cart Items").parentElement as HTMLElement;
    const lines = within(cartItems).getAllByRole("listitem");
    expect(lines).toHaveLength(3);
    expect(within(lines[0]).getByText("Color: Navy")).toBeInTheDocument();
    expect(within(lines[1]).getByText("Color: Black")).toBeInTheDocument();
    expect(within(lines[2]).getByText("Color: not specified")).toBeInTheDocument();
  });

  it("includes the color in the backend order sheet", () => {
    render(<Dashboard submissions={[row]} username="ben" deliverablesBySubmission={{}} />);
    fireEvent.click(screen.getByText(/Galway Vest \(Navy\)/));

    const sheet = (screen.getByText("Backend order sheet").parentElement?.parentElement as HTMLElement).querySelector(
      "textarea"
    ) as HTMLTextAreaElement;
    expect(sheet.value).toContain("1. 6 x Galway Vest\n   Color: Navy");
    expect(sheet.value).toContain("2. 12 x Galway Vest\n   Color: Black");
    expect(sheet.value).toContain("3. 250 x Metal Pen\n   Color: not specified");
  });
});
