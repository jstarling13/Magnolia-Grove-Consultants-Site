import { describe, expect, it } from "vitest";
import { contactSubmissionSchema } from "@/lib/validation";

const validLead = {
  formType: "lead" as const,
  firstName: "Jane",
  lastName: "Doe",
  email: "jane@example.com",
  phone: "7065550199",
  service: "Field Execution",
  message: "Interested in field operations for a county-wide campaign.",
  company_website: "",
  turnstileToken: "token",
};

const validStrategy = {
  formType: "strategy" as const,
  orgName: "Doe for Congress",
  contactName: "Jane Doe",
  role: "Campaign Manager",
  email: "jane@example.com",
  phone: "7065550199",
  pillar: "digital-marketing",
  budget: "$25k-$50k",
  timeline: "1-3 months",
  message: "Looking for a full digital strategy ahead of the primary.",
  company_website: "",
  turnstileToken: "token",
};

describe("contactSubmissionSchema", () => {
  it("accepts a valid lead submission", () => {
    const result = contactSubmissionSchema.safeParse(validLead);
    expect(result.success).toBe(true);
  });

  it("accepts a valid strategy session submission", () => {
    const result = contactSubmissionSchema.safeParse(validStrategy);
    expect(result.success).toBe(true);
  });

  it("rejects a lead submission missing required fields", () => {
    const result = contactSubmissionSchema.safeParse({
      ...validLead,
      email: "",
      message: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid email address", () => {
    const result = contactSubmissionSchema.safeParse({
      ...validLead,
      email: "not-an-email",
    });
    expect(result.success).toBe(false);
  });

  it("rejects submissions with a filled-in honeypot field", () => {
    const result = contactSubmissionSchema.safeParse({
      ...validLead,
      company_website: "http://spam.example.com",
    });
    expect(result.success).toBe(false);
  });

  it("rejects an unknown formType", () => {
    const result = contactSubmissionSchema.safeParse({
      ...validLead,
      formType: "unknown",
    });
    expect(result.success).toBe(false);
  });
});
