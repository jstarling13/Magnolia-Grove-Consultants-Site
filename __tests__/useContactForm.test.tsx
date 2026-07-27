import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useContactForm } from "@/hooks/useContactForm";

const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

interface FormFields {
  email: string;
  message: string;
}

const initialFields: FormFields = { email: "", message: "" };

function validate(fields: FormFields) {
  const errors: Partial<Record<keyof FormFields, string>> = {};
  if (!fields.email) errors.email = "Email is required.";
  if (!fields.message) errors.message = "Message is required.";
  return errors;
}

function setup() {
  return renderHook(() =>
    useContactForm<FormFields>({
      formType: "lead",
      initialFields,
      validate,
      defaultErrorMessage: "Something went wrong.",
    })
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  mockPush.mockClear();
});

describe("useContactForm", () => {
  it("starts idle with the given initial fields", () => {
    const { result } = setup();
    expect(result.current.status).toBe("idle");
    expect(result.current.fields).toEqual(initialFields);
  });

  it("blocks submission and sets errors when validation fails", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const { result } = setup();

    await act(async () => {
      await result.current.handleSubmit({
        preventDefault: () => {},
      } as React.FormEvent<HTMLFormElement>);
    });

    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.current.errors.email).toBe("Email is required.");
  });

  it("submits successfully and resets fields", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    });
    vi.stubGlobal("fetch", fetchMock);
    const { result } = setup();

    act(() => {
      result.current.handleChange({
        target: { name: "email", value: "jane@example.com" },
      } as React.ChangeEvent<HTMLInputElement>);
      result.current.handleChange({
        target: { name: "message", value: "Hello there." },
      } as React.ChangeEvent<HTMLInputElement>);
    });

    await act(async () => {
      await result.current.handleSubmit({
        preventDefault: () => {},
      } as React.FormEvent<HTMLFormElement>);
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/contact",
      expect.objectContaining({ method: "POST" })
    );
    await waitFor(() => expect(result.current.status).toBe("success"));
    expect(result.current.fields).toEqual(initialFields);
    expect(mockPush).toHaveBeenCalledWith("/thank-you?source=lead");
  });

  it("surfaces a server error message on a failed submission", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ success: false, error: "Rate limited." }),
    });
    vi.stubGlobal("fetch", fetchMock);
    const { result } = setup();

    act(() => {
      result.current.handleChange({
        target: { name: "email", value: "jane@example.com" },
      } as React.ChangeEvent<HTMLInputElement>);
      result.current.handleChange({
        target: { name: "message", value: "Hello there." },
      } as React.ChangeEvent<HTMLInputElement>);
    });

    await act(async () => {
      await result.current.handleSubmit({
        preventDefault: () => {},
      } as React.FormEvent<HTMLFormElement>);
    });

    await waitFor(() => expect(result.current.status).toBe("error"));
    expect(result.current.submitError).toBe("Rate limited.");
    expect(mockPush).not.toHaveBeenCalled();
  });
});
