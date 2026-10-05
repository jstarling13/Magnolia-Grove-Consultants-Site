/**
 * Captures what the app would send through Resend, so tests can inspect the
 * recipient, subject and HTML of every email. Use `createResendModuleMock`
 * as the factory for `vi.mock("resend", ...)`; the real email builders in
 * src/lib/email.ts then run unmodified and their `resend.emails.send(...)`
 * call lands here.
 */

export interface CapturedEmail {
  from: string;
  to: string;
  replyTo?: string;
  subject: string;
  html: string;
  /** What Resend was told, whether or not the "provider" accepted it. */
  accepted: boolean;
}

interface SendParams {
  from: string;
  to: string | string[];
  replyTo?: string;
  subject: string;
  html: string;
}

type Rejection = {
  predicate: (email: CapturedEmail) => boolean;
  message: string;
  remaining: number;
};

export class EmailOutbox {
  /** Every send attempt, in order, including ones the provider rejected. */
  readonly attempts: CapturedEmail[] = [];
  private rejections: Rejection[] = [];

  constructor(public readonly businessInbox: string) {}

  /** Emails the provider accepted (what actually reached someone's inbox). */
  get delivered(): CapturedEmail[] {
    return this.attempts.filter((e) => e.accepted);
  }

  /** Delivered emails addressed to anyone other than the business inbox. */
  get toCustomers(): CapturedEmail[] {
    return this.delivered.filter((e) => e.to !== this.businessInbox);
  }

  /** Delivered emails addressed to the business inbox. */
  get toBusiness(): CapturedEmail[] {
    return this.delivered.filter((e) => e.to === this.businessInbox);
  }

  /** Delivered emails whose subject matches. */
  withSubject(pattern: RegExp): CapturedEmail[] {
    return this.delivered.filter((e) => pattern.test(e.subject));
  }

  /**
   * Makes the provider reject the next `times` sends that satisfy `predicate`
   * (default: any), mirroring Resend returning `{ error }`.
   */
  rejectNext(
    options: { times?: number; when?: (email: CapturedEmail) => boolean; message?: string } = {}
  ): void {
    this.rejections.push({
      predicate: options.when ?? (() => true),
      message: options.message ?? "fake resend: rejected",
      remaining: options.times ?? 1,
    });
  }

  clear(): void {
    this.attempts.length = 0;
    this.rejections = [];
  }

  /** Mirrors `resend.emails.send`: resolves `{ data, error }`, never throws. */
  readonly send = async (params: SendParams) => {
    if (Array.isArray(params.to)) {
      throw new Error("EmailOutbox: the app is expected to send to a single recipient string");
    }
    const email: CapturedEmail = {
      from: params.from,
      to: params.to,
      replyTo: params.replyTo,
      subject: params.subject,
      html: params.html,
      accepted: true,
    };
    const rejection = this.rejections.find((r) => r.remaining > 0 && r.predicate(email));
    if (rejection) {
      rejection.remaining -= 1;
      email.accepted = false;
      this.attempts.push(email);
      return { data: null, error: { name: "validation_error", message: rejection.message } };
    }
    this.attempts.push(email);
    return { data: { id: `fake-email-${this.attempts.length}` }, error: null };
  };
}

/**
 * Factory for `vi.mock("resend", () => createResendModuleMock(() => world.outbox))`.
 * The outbox is looked up on every send, so replacing it between tests works.
 */
export function createResendModuleMock(getOutbox: () => EmailOutbox) {
  class FakeResend {
    emails = { send: (params: SendParams) => getOutbox().send(params) };
    constructor(apiKey?: string) {
      if (!apiKey) throw new Error("FakeResend constructed without an API key");
    }
  }
  return { Resend: FakeResend };
}

/** Visible text of an HTML email (tags dropped, entities left as-is). */
export function htmlText(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
