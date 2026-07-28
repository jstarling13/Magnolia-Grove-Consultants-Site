import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import PaymentForm from "@/components/PaymentForm";

describe("PaymentForm package selector", () => {
  it("fills in amount and memo when a fixed-price package is selected", () => {
    render(<PaymentForm />);

    const select = screen.getByLabelText("What Are You Paying For?");
    fireEvent.change(select, { target: { value: "Website Creation ($3,000 one-time)" } });

    const amount = screen.getByLabelText("Amount (USD)") as HTMLInputElement;
    const memo = screen.getByLabelText("Memo / Invoice Reference") as HTMLInputElement;

    expect(amount.value).toBe("3000");
    expect(memo.value).toBe("Website Creation");
  });
});
