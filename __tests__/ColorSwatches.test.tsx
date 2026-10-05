import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ColorSwatches from "@/components/merchandise/ColorSwatches";

const THIRTY = Array.from({ length: 30 }, (_, i) => `Color ${i + 1}`);

describe("ColorSwatches", () => {
  it("renders every color as a real button with an accessible name", () => {
    render(<ColorSwatches colors={["Navy Blue", "Black/Gray"]} onSelect={() => {}} />);
    const navy = screen.getByRole("button", { name: "Select color Navy Blue" });
    expect(navy.tagName).toBe("BUTTON");
    expect(navy).toHaveAttribute("type", "button");
    expect(navy).toHaveAttribute("title", "Navy Blue");
    expect(screen.getByRole("button", { name: "Select color Black/Gray" })).toBeInTheDocument();
  });

  it("reflects the selection with aria-pressed and calls onSelect", () => {
    const onSelect = vi.fn();
    const { rerender } = render(
      <ColorSwatches colors={["Red", "Navy Blue"]} onSelect={onSelect} selected="Navy Blue" />
    );
    expect(screen.getByRole("button", { name: "Select color Navy Blue" })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
    expect(screen.getByRole("button", { name: "Select color Red" })).toHaveAttribute(
      "aria-pressed",
      "false"
    );

    fireEvent.click(screen.getByRole("button", { name: "Select color Red" }));
    expect(onSelect).toHaveBeenCalledWith("Red");

    rerender(<ColorSwatches colors={["Red", "Navy Blue"]} onSelect={onSelect} selected="Red" />);
    expect(screen.getByRole("button", { name: "Select color Red" })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
  });

  it("is keyboard operable: swatches are natively focusable buttons", () => {
    render(<ColorSwatches colors={["Red"]} onSelect={() => {}} />);
    const button = screen.getByRole("button", { name: "Select color Red" });
    button.focus();
    expect(button).toHaveFocus();
    expect(button).not.toHaveAttribute("tabindex", "-1");
    expect(button.className).toMatch(/focus-visible:outline/);
  });

  it("shows the selected color's name, or the color count when none is selected", () => {
    const { rerender } = render(
      <ColorSwatches colors={["Red", "Blue"]} onSelect={() => {}} showLabel />
    );
    expect(screen.getByText("2 colors")).toBeInTheDocument();
    rerender(
      <ColorSwatches colors={["Red", "Blue"]} onSelect={() => {}} selected="Blue" showLabel />
    );
    expect(screen.getByText("Blue")).toBeInTheDocument();
    expect(screen.queryByText("2 colors")).not.toBeInTheDocument();
  });

  it("uses singular wording for a single color", () => {
    render(<ColorSwatches colors={["Black"]} showLabel />);
    expect(screen.getByText("1 color")).toBeInTheDocument();
  });

  it("renders static non-interactive dots when no onSelect is given", () => {
    render(<ColorSwatches colors={["Red", "Blue"]} />);
    expect(screen.queryAllByRole("button")).toHaveLength(0);
  });

  it("collapses overflow into a '+N more' link to the detail page when moreHref is set", () => {
    render(
      <ColorSwatches colors={THIRTY} max={6} onSelect={() => {}} moreHref="/merchandise/x#colors" />
    );
    expect(screen.getAllByRole("button", { name: /^Select color/ })).toHaveLength(6);
    const more = screen.getByRole("link", { name: "+24 more" });
    expect(more).toHaveAttribute("href", "/merchandise/x#colors");
  });

  it("expands in place, then collapses, when there is no moreHref", () => {
    render(<ColorSwatches colors={THIRTY} max={10} onSelect={() => {}} />);
    expect(screen.getAllByRole("button", { name: /^Select color/ })).toHaveLength(10);

    fireEvent.click(screen.getByRole("button", { name: "+20 more" }));
    expect(screen.getAllByRole("button", { name: /^Select color/ })).toHaveLength(30);

    const toggle = screen.getByRole("button", { name: "Show fewer" });
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    fireEvent.click(toggle);
    expect(screen.getAllByRole("button", { name: /^Select color/ })).toHaveLength(10);
  });

  it("shows all 30 colors by default", () => {
    render(<ColorSwatches colors={THIRTY} onSelect={() => {}} />);
    expect(screen.getAllByRole("button", { name: /^Select color/ })).toHaveLength(30);
  });

  it("renders nothing for an empty list", () => {
    const { container } = render(<ColorSwatches colors={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});
