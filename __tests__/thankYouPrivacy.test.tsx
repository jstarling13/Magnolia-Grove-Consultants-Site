/**
 * The customer's email must never ride in the thank-you URL (browser history,
 * server logs, referrers). It travels in sessionStorage and only the signup
 * prompt reads it.
 */
import { act, render, renderHook, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const nav = vi.hoisted(() => ({
  push: vi.fn(),
  redirect: vi.fn((to: string) => {
    throw new Error(`NEXT_REDIRECT:${to}`);
  }),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: nav.push }),
  redirect: nav.redirect,
}));
vi.mock("@/hooks/useClientProfile", () => ({ useClientProfile: () => null }));
vi.mock("@/components/merchandise/MerchPurchaseTracker", () => ({ default: () => null }));

import { readThankYouEmail, rememberThankYouEmail } from "@/lib/thankYouEmail";
import CreateAccountPrompt from "@/components/CreateAccountPrompt";
import ThankYouPage from "@/app/thank-you/page";
import { useContactForm } from "@/hooks/useContactForm";

beforeEach(() => window.sessionStorage.clear());
afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("thankYouEmail storage", () => {
  it("round-trips an email and drops it after 30 minutes", () => {
    rememberThankYouEmail(" pat@example.com ", 1_000);
    expect(readThankYouEmail(1_000 + 29 * 60_000)).toBe("pat@example.com");
    expect(readThankYouEmail(1_000 + 31 * 60_000)).toBe("");
  });

  it("ignores blank input and malformed stored values", () => {
    rememberThankYouEmail("   ");
    expect(readThankYouEmail()).toBe("");
    window.sessionStorage.setItem("mg-thankyou-email", "not json");
    expect(readThankYouEmail()).toBe("");
    window.sessionStorage.setItem(
      "mg-thankyou-email",
      JSON.stringify({ email: 5, at: Date.now() })
    );
    expect(readThankYouEmail()).toBe("");
  });

  it("never throws when storage is blocked", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(() => rememberThankYouEmail("a@b.co")).not.toThrow();
    expect(readThankYouEmail()).toBe("");
    vi.restoreAllMocks();
  });
});

describe("thank-you page", () => {
  it("redirects away from any URL that carries an email, dropping it but keeping the source", async () => {
    await expect(
      ThankYouPage({ searchParams: Promise.resolve({ source: "merch", email: "pat@example.com" }) })
    ).rejects.toThrow("NEXT_REDIRECT:/thank-you?source=merch");
    await expect(
      ThankYouPage({ searchParams: Promise.resolve({ email: "pat@example.com" }) })
    ).rejects.toThrow("NEXT_REDIRECT:/thank-you");
    expect(nav.redirect.mock.calls.flat().join(" ")).not.toContain("pat");
  });

  it("renders normally without an email and never prints one", async () => {
    const tree = await ThankYouPage({ searchParams: Promise.resolve({ source: "merch" }) });
    const { container } = render(tree);
    expect(container.textContent).toContain("Placing Your Order");
    expect(container.textContent?.toLowerCase()).not.toContain("supplier");
    expect(nav.redirect).not.toHaveBeenCalled();
  });
});

describe("CreateAccountPrompt", () => {
  it("links to plain signup when nothing is remembered", async () => {
    render(<CreateAccountPrompt />);
    expect(screen.getByRole("link", { name: /create a free account/i })).toHaveAttribute(
      "href",
      "/account/signup"
    );
  });

  it("prefills the signup link from sessionStorage, not from the URL", async () => {
    rememberThankYouEmail("pat@example.com");
    render(<CreateAccountPrompt />);
    await waitFor(() =>
      expect(screen.getByRole("link", { name: /create a free account/i })).toHaveAttribute(
        "href",
        "/account/signup?email=pat%40example.com"
      )
    );
  });
});

describe("useContactForm hand-off", () => {
  it("navigates to a URL with no email and stores the email in sessionStorage", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({ success: true }) })
    );
    const { result } = renderHook(() =>
      useContactForm<{ email: string }>({
        formType: "lead",
        initialFields: { email: "pat@example.com" },
        validate: () => ({}),
        defaultErrorMessage: "x",
      })
    );
    await act(async () => {
      await result.current.handleSubmit({
        preventDefault() {},
      } as React.FormEvent<HTMLFormElement>);
    });
    expect(nav.push).toHaveBeenCalledWith("/thank-you?source=lead");
    expect(readThankYouEmail()).toBe("pat@example.com");
  });
});
