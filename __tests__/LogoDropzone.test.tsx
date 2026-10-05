import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import LogoDropzone from "@/components/merchandise/LogoDropzone";
import { LogoProvider } from "@/components/merchandise/LogoContext";

const png = (name = "logo.png") => new File(["x"], name, { type: "image/png" });

function setup() {
  return render(
    <LogoProvider>
      <LogoDropzone />
    </LogoProvider>
  );
}

const fileInput = (container: HTMLElement) =>
  container.querySelector("input[type='file']") as HTMLInputElement;

describe("LogoDropzone", () => {
  beforeEach(() => window.localStorage.clear());

  it("has no interactive control nested inside another one", () => {
    const { container } = setup();
    const selector = "button, a[href], input, select, textarea, [role='button'], [tabindex]";
    for (const control of container.querySelectorAll(selector)) {
      expect(control.parentElement?.closest(selector), control.outerHTML).toBeNull();
    }
    expect(container.querySelector("[role='button']")).toBeNull();
  });

  it("opens the file picker through a real label tied to the file input", () => {
    const { container } = setup();
    const input = fileInput(container);
    const label = screen.getByText(/Drag & drop your logo here/).closest("label");
    expect(label).not.toBeNull();
    expect(label).toHaveAttribute("for", input.id);
    // Visually hidden, but still focusable (not display:none / hidden).
    expect(input).not.toHaveAttribute("hidden");
    expect(input.className).toMatch(/sr-only/);
  });

  it("is keyboard reachable: the file input is a natively focusable control", () => {
    const { container } = setup();
    const input = fileInput(container);
    expect(input).not.toHaveAttribute("tabindex", "-1");
    input.focus();
    expect(input).toHaveFocus();
    // The zone shows a focus ring while the input inside it has focus.
    expect(screen.getByTestId("logo-dropzone").className).toMatch(/focus-within:ring-2/);
  });

  it("accepts a chosen file and shows it with a Remove logo button", async () => {
    const { container } = setup();
    fireEvent.change(fileInput(container), { target: { files: [png("acme.png")] } });
    expect(await screen.findByAltText("Your uploaded logo")).toBeInTheDocument();
    expect(screen.getByText("acme.png")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Remove logo" })).toBeInTheDocument();
    expect(screen.getByText("Choose a different logo").tagName).toBe("LABEL");
  });

  it("accepts a dropped file", async () => {
    setup();
    const zone = screen.getByTestId("logo-dropzone");
    fireEvent.drop(zone, { dataTransfer: { files: [png("dropped.png")] } });
    expect(await screen.findByText("dropped.png")).toBeInTheDocument();
  });

  it("highlights while a file is dragged over and clears on leave", () => {
    setup();
    const zone = screen.getByTestId("logo-dropzone");
    fireEvent.dragOver(zone);
    expect(zone.className).toMatch(/bg-gold\/10/);
    fireEvent.dragLeave(zone);
    expect(zone.className).not.toMatch(/bg-gold\/10/);
  });

  it("removes the logo with the button and hands focus back to the file input", async () => {
    const { container } = setup();
    fireEvent.change(fileInput(container), { target: { files: [png()] } });
    const remove = await screen.findByRole("button", { name: "Remove logo" });
    await act(async () => {
      fireEvent.click(remove);
    });
    await waitFor(() =>
      expect(screen.queryByAltText("Your uploaded logo")).not.toBeInTheDocument()
    );
    expect(screen.getByText(/Drag & drop your logo here/)).toBeInTheDocument();
    expect(fileInput(container)).toHaveFocus();
    expect(window.localStorage.getItem("mg-merch-logo")).toBeNull();
  });

  it("rejects an unsupported file type with a described alert", () => {
    const { container } = setup();
    fireEvent.change(fileInput(container), {
      target: { files: [new File(["x"], "doc.pdf", { type: "application/pdf" })] },
    });
    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("Please upload a PNG, JPG, WEBP, or SVG file.");
    expect(fileInput(container)).toHaveAttribute("aria-describedby", alert.id);
  });
});
