// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const sent = vi.hoisted(() => ({
  emails: [] as { to: string; replyTo?: string; subject: string; html: string }[],
}));
vi.mock("resend", () => ({
  Resend: class {
    emails = {
      send: async (message: { to: string; replyTo?: string; subject: string; html: string }) => {
        sent.emails.push(message);
        return { error: null };
      },
    };
  },
}));

// email.ts reads these when the module loads, so set them before the import is evaluated.
vi.hoisted(() => {
  process.env.RESEND_API_KEY = "re_test_mock";
  process.env.CONTACT_EMAIL_FROM = "Test <test@example.com>";
  process.env.CONTACT_EMAIL_TO = "inbox@example.com";
});

import {
  sendCartOrderNotification,
  sendLeadAutoResponder,
  sendLeadNotification,
  sendMerchOrderNotification,
  sendPaymentRequestNotification,
  sendStrategySessionAutoResponder,
  sendStrategySessionNotification,
} from "@/lib/email";

const SCRIPT = `<script>alert("pwn")</script>`;
const IMG = `<img src=x onerror=alert(1)>`;
const ANCHOR = `"><a href="https://evil.example">click</a>`;
const HOSTILE = `${SCRIPT}${IMG}${ANCHOR}`;

/** Fails on any tag an attacker could have injected; our own markup uses none of these. */
function expectNoInjectedMarkup(html: string) {
  expect(html).not.toContain("<script");
  expect(html).not.toContain("<img");
  expect(html).not.toContain('evil.example">click');
  expect(html).not.toContain(`<a href="https://evil.example"`);
  expect(html).toContain("&lt;script&gt;");
}

beforeEach(() => {
  sent.emails.length = 0;
});

describe("business-inbox emails escape every submitted field", () => {
  it("lead notification", async () => {
    await sendLeadNotification({
      formType: "lead",
      firstName: HOSTILE,
      lastName: HOSTILE,
      email: "a@example.com",
      phone: HOSTILE,
      service: HOSTILE,
      message: `${HOSTILE}\nsecond line`,
    });
    const [mail] = sent.emails;
    expectNoInjectedMarkup(mail.html);
    // Line breaks in the message still render as <br/>.
    expect(mail.html).toContain("second line");
    expect(mail.html).toContain("<br/>");
  });

  it("strategy session notification", async () => {
    await sendStrategySessionNotification({
      formType: "strategy",
      orgName: HOSTILE,
      contactName: HOSTILE,
      role: HOSTILE,
      email: "a@example.com",
      phone: HOSTILE,
      pillar: HOSTILE,
      budget: HOSTILE,
      timeline: HOSTILE,
      message: HOSTILE,
    });
    expectNoInjectedMarkup(sent.emails[0].html);
  });

  it("payment request notification", async () => {
    await sendPaymentRequestNotification({
      organizationName: HOSTILE,
      firstName: HOSTILE,
      lastName: HOSTILE,
      email: "a@example.com",
      memo: HOSTILE,
      amount: 12.5,
    });
    expectNoInjectedMarkup(sent.emails[0].html);
    expect(sent.emails[0].html).toContain("$12.50");
  });

  it("merch order request notification", async () => {
    await sendMerchOrderNotification({
      firstName: HOSTILE,
      lastName: HOSTILE,
      email: "a@example.com",
      phone: HOSTILE,
      product: HOSTILE,
      quantity: HOSTILE,
      budget: HOSTILE,
      deadline: HOSTILE,
      notes: `${HOSTILE}\nline two`,
    });
    expectNoInjectedMarkup(sent.emails[0].html);
    expect(sent.emails[0].html).toContain("line two");
  });

  it("cart order notification", async () => {
    await sendCartOrderNotification({
      orderRef: HOSTILE,
      firstName: HOSTILE,
      lastName: HOSTILE,
      email: "a@example.com",
      phone: HOSTILE,
      notes: HOSTILE,
      total: 10,
      items: [
        {
          productId: "p",
          name: HOSTILE,
          color: HOSTILE,
          quantity: 1,
          unitPrice: 10,
          lineTotal: 10,
          supplier: HOSTILE,
          productNo: HOSTILE,
        },
      ],
    });
    expectNoInjectedMarkup(sent.emails[0].html);
  });
});

describe("auto-responders to the submitter escape the name", () => {
  // The recipient is whatever address the attacker typed, so injected markup
  // would arrive in a third party's inbox, signed by the business.
  it("lead auto-responder", async () => {
    await sendLeadAutoResponder({
      formType: "lead",
      firstName: HOSTILE,
      lastName: "x",
      email: "victim@example.com",
      phone: "5555555555",
      service: "s",
      message: "m",
    });
    expect(sent.emails[0].to).toBe("victim@example.com");
    expectNoInjectedMarkup(sent.emails[0].html);
  });

  it("strategy auto-responder", async () => {
    await sendStrategySessionAutoResponder({
      formType: "strategy",
      orgName: "o",
      contactName: HOSTILE,
      role: "r",
      email: "victim@example.com",
      phone: "5555555555",
      pillar: "p",
      budget: "b",
      timeline: "t",
      message: "m",
    });
    expectNoInjectedMarkup(sent.emails[0].html);
  });
});

describe("subjects cannot carry header injection", () => {
  it("collapses CR/LF in customer-controlled subject text", async () => {
    await sendLeadNotification({
      formType: "lead",
      firstName: "Pat\r\nBcc: attacker@example.com",
      lastName: "Lee\nX-Evil: 1",
      email: "a@example.com",
      phone: "5555555555",
      service: "s",
      message: "m",
    });
    await sendPaymentRequestNotification({
      organizationName: "Org\r\nBcc: attacker@example.com",
      firstName: "a",
      lastName: "b",
      email: "a@example.com",
      memo: "m",
      amount: 5,
    });
    await sendMerchOrderNotification({
      firstName: "a",
      lastName: "b",
      email: "a@example.com",
      phone: "5555555555",
      product: "Pen\r\nBcc: attacker@example.com",
      quantity: "10",
    });
    for (const mail of sent.emails) expect(mail.subject).not.toMatch(/[\r\n]/);
  });
});
