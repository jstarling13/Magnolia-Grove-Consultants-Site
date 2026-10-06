/**
 * Shared building blocks for every email the site sends: escaping, safe
 * truncation, one table-based 600px layout, and a matching plain-text writer.
 *
 * Rules that keep the markup working in real inboxes:
 *  - table layout and inline styles only (no external CSS, images, or icons);
 *  - system fonts; light card on a cream page, onyx header band, gold accents;
 *  - text colors chosen for WCAG AA contrast on the surface they sit on;
 *  - everything that came from a form is escaped here or by the caller helper
 *    that takes it (text(), multiline()). Block helpers that take `html: string`
 *    expect already-escaped content.
 */

import { brand, contactDetails } from "@/config/siteConfig";

// ---------------------------------------------------------------------------
// Palette (all contrast ratios are against the surface noted)
// ---------------------------------------------------------------------------

export const COLORS = {
  onyx: "#0d0d0d",
  /** Gold for use on onyx (header, button background). */
  gold: "#c5a059",
  /** Darker gold that stays readable as text on white (about 5:1). */
  goldText: "#7a5c17",
  cream: "#f6f1e7",
  creamDeep: "#ece4d3",
  card: "#ffffff",
  ink: "#1a1a1a",
  /** Secondary text on white (about 7:1). */
  muted: "#5a5a5a",
  rule: "#e4dccb",
} as const;

const FONT_STACK = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

// ---------------------------------------------------------------------------
// Escaping and limits
// ---------------------------------------------------------------------------

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Strips control characters (except tab and newline) that have no place in an email. */
export function stripControl(value: string): string {
  // eslint-disable-next-line no-control-regex
  return value.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "");
}

/**
 * Caps text at `max` characters (counted by code point so an emoji is never cut
 * in half) and marks the cut. Used on anything a customer typed.
 */
export function truncate(value: string, max: number): string {
  const clean = stripControl(value);
  const chars = Array.from(clean);
  if (chars.length <= max) return clean;
  return `${chars.slice(0, max).join("").replace(/\s+$/, "")}… (shortened)`;
}

/** Longest values we echo back, by kind. Generous: real input is validated far below these. */
export const LIMITS = {
  name: 100,
  line: 200,
  detail: 400,
  notes: 2500,
  adminNotes: 5000,
  tracking: 80,
} as const;

/** Escapes, then keeps the author's line breaks. */
export function multiline(value: string): string {
  return escapeHtml(value).replace(/\r?\n/g, "<br/>");
}

/** Header-safe single line for use in an email subject. */
export function oneLine(value: string): string {
  return value.replace(/[\r\n]+/g, " ").trim();
}

/** Only http(s) links are ever rendered as hrefs. */
export function safeHref(url: string): string | undefined {
  const value = url.trim();
  return /^https?:\/\//i.test(value) && !/\s/.test(value) ? value : undefined;
}

export function money(value: number): string {
  return `$${value.toFixed(2)}`;
}

// ---------------------------------------------------------------------------
// Business contact details (from siteConfig, the single source of truth)
// ---------------------------------------------------------------------------

export interface BusinessContact {
  name: string;
  address?: string;
  phone?: string;
  phoneHref?: string;
  email?: string;
}

export function businessContact(): BusinessContact {
  const find = (label: string) => contactDetails.find((detail) => detail.label === label);
  const clean = (value: string | undefined) => (value?.trim() ? value.trim() : undefined);
  return {
    name: brand.name,
    address: clean(find("Address")?.value),
    phone: clean(find("Phone")?.value),
    phoneHref: clean(find("Phone")?.href),
    email: clean(find("Email")?.value),
  };
}

// ---------------------------------------------------------------------------
// Block helpers (HTML)
// ---------------------------------------------------------------------------

export function paragraphHtml(innerHtml: string): string {
  return `<p style="margin:0 0 16px;color:${COLORS.ink};font-size:16px;line-height:1.55;">${innerHtml}</p>`;
}

export function smallPrintHtml(innerHtml: string): string {
  return `<p style="margin:0 0 16px;color:${COLORS.muted};font-size:13px;line-height:1.5;">${innerHtml}</p>`;
}

export function headingHtml(text: string): string {
  return `<h2 style="margin:24px 0 8px;color:${COLORS.ink};font-size:17px;line-height:1.3;font-weight:700;">${escapeHtml(text)}</h2>`;
}

export function greetingHtml(firstName: string): string {
  const name = truncate(firstName.trim(), LIMITS.name);
  return paragraphHtml(`Hi ${escapeHtml(name) || "there"},`);
}

export function greetingText(firstName: string): string {
  return `Hi ${truncate(firstName.trim(), LIMITS.name) || "there"},`;
}

/** One labelled value. `valueHtml` must already be escaped. */
export function fieldHtml(label: string, valueHtml: string): string {
  return `<p style="margin:0 0 14px;color:${COLORS.ink};font-size:15px;line-height:1.5;"><span style="display:block;margin-bottom:2px;color:${COLORS.muted};font-size:12px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;">${escapeHtml(label)}</span>${valueHtml}</p>`;
}

/** The order reference, shown large so a customer can quote it. */
export function referenceHtml(orderRef: string): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 20px;"><tr><td style="background:${COLORS.cream};border-left:4px solid ${COLORS.gold};padding:12px 16px;"><span style="display:block;color:${COLORS.muted};font-size:12px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;">Order Reference</span><span style="display:block;color:${COLORS.ink};font-size:22px;font-weight:700;letter-spacing:0.02em;">${escapeHtml(orderRef)}</span></td></tr></table>`;
}

/** A full-width-on-mobile call-to-action button (bulletproof: a padded link in a table cell). */
export function buttonHtml(label: string, url: string): string {
  const href = safeHref(url);
  if (!href) return "";
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 20px;"><tr><td bgcolor="${COLORS.gold}" style="background:${COLORS.gold};border-radius:6px;"><a href="${escapeHtml(href)}" style="display:inline-block;padding:14px 28px;color:${COLORS.onyx};font-size:16px;font-weight:700;text-decoration:none;border-radius:6px;">${escapeHtml(label)} &rarr;</a></td></tr></table>`;
}

export function linkHtml(label: string, url: string): string {
  const href = safeHref(url);
  if (!href) return escapeHtml(label);
  return `<a href="${escapeHtml(href)}" style="color:${COLORS.goldText};text-decoration:underline;">${escapeHtml(label)}</a>`;
}

export function numberedListHtml(steps: string[]): string {
  return `<ol style="margin:0 0 16px;padding-left:22px;color:${COLORS.ink};font-size:15px;line-height:1.6;">${steps
    .map((step) => `<li style="margin:0 0 6px;">${escapeHtml(step)}</li>`)
    .join("")}</ol>`;
}

// ---------------------------------------------------------------------------
// Order lines
// ---------------------------------------------------------------------------

/**
 * What a customer may see of a cart line. No supplier, product number, or link
 * fields exist on this type, and the builders copy only these fields, so
 * backend-only data on a stored line can never reach a customer email.
 */
export interface CustomerOrderLine {
  name: string;
  color?: string;
  /** What the customer typed: size breakdown and imprint notes. */
  sizes?: string;
  imprintNotes?: string;
  quantity: number;
  unitPrice?: number;
  lineTotal?: number;
}

/** Copies only the customer-safe fields, dropping anything else stored on the line. */
export function pickLines(items: CustomerOrderLine[]): CustomerOrderLine[] {
  return items.map(({ name, color, sizes, imprintNotes, quantity, unitPrice, lineTotal }) => ({
    name,
    ...(color ? { color } : {}),
    ...(sizes?.trim() ? { sizes } : {}),
    ...(imprintNotes?.trim() ? { imprintNotes } : {}),
    quantity,
    ...(typeof unitPrice === "number" ? { unitPrice } : {}),
    ...(typeof lineTotal === "number" ? { lineTotal } : {}),
  }));
}

/**
 * Builds customer-safe lines from whatever a stored order holds (the JSON
 * `items` array), keeping only name, color, sizes, imprint notes, quantity and
 * prices. Anything malformed is skipped. Use this when a caller has a stored
 * order rather than a typed payload.
 */
export function customerLinesFromStored(items: unknown): CustomerOrderLine[] {
  if (!Array.isArray(items)) return [];
  const lines: CustomerOrderLine[] = [];
  for (const raw of items) {
    if (!raw || typeof raw !== "object") continue;
    const item = raw as Record<string, unknown>;
    if (typeof item.name !== "string" || !item.name.trim()) continue;
    if (typeof item.quantity !== "number" || !Number.isFinite(item.quantity)) continue;
    const price = (value: unknown) =>
      typeof value === "number" && Number.isFinite(value) ? value : undefined;
    const unitPrice = price(item.unitPrice);
    const lineTotal = price(item.lineTotal);
    lines.push({
      name: item.name,
      quantity: item.quantity,
      ...(typeof item.color === "string" && item.color.trim() ? { color: item.color } : {}),
      ...(typeof item.sizes === "string" && item.sizes.trim() ? { sizes: item.sizes } : {}),
      ...(typeof item.imprintNotes === "string" && item.imprintNotes.trim()
        ? { imprintNotes: item.imprintNotes }
        : {}),
      ...(unitPrice !== undefined ? { unitPrice } : {}),
      ...(lineTotal !== undefined ? { lineTotal } : {}),
    });
  }
  return lines;
}

function allPriced(items: CustomerOrderLine[]): boolean {
  return (
    items.length > 0 &&
    items.every((item) => typeof item.unitPrice === "number" && typeof item.lineTotal === "number")
  );
}

/** The muted sub-lines under a product name: color, sizes, imprint notes. Escaped. */
function lineNotesHtml(item: CustomerOrderLine): string {
  const sub = (text: string) =>
    `<div style="margin-top:2px;color:${COLORS.muted};font-size:13px;line-height:1.4;">${escapeHtml(text)}</div>`;
  const color = item.color?.trim();
  const sizes = item.sizes?.trim();
  const imprint = item.imprintNotes?.trim();
  return [
    color ? sub(truncate(color, LIMITS.line)) : "",
    sizes ? sub(`Sizes and quantities: ${truncate(sizes, LIMITS.detail)}`) : "",
    imprint ? sub(`Imprint notes: ${truncate(imprint, LIMITS.detail)}`) : "",
  ].join("");
}

const TH = `padding:8px 0;border-bottom:2px solid ${COLORS.ink};color:${COLORS.muted};font-size:12px;font-weight:700;letter-spacing:0.05em;text-transform:uppercase;`;
const TD = `padding:10px 0;border-bottom:1px solid ${COLORS.rule};color:${COLORS.ink};font-size:15px;line-height:1.4;vertical-align:top;`;

/**
 * The itemized table for a customer email. Shows Unit and Line Total columns
 * only when every line has both prices; otherwise just Item and Qty.
 */
export function itemsTableHtml(items: CustomerOrderLine[]): string {
  if (items.length === 0) return "";
  const priced = allPriced(items);
  const head = [
    `<th align="left" style="${TH}text-align:left;">Item</th>`,
    `<th align="right" style="${TH}text-align:right;padding-left:8px;">Qty</th>`,
    ...(priced
      ? [
          `<th align="right" style="${TH}text-align:right;padding-left:8px;">Unit</th>`,
          `<th align="right" style="${TH}text-align:right;padding-left:8px;">Line Total</th>`,
        ]
      : []),
  ].join("");
  const body = items
    .map((item) => {
      const cells = [
        `<td align="left" style="${TD}text-align:left;word-break:break-word;">${escapeHtml(truncate(item.name, LIMITS.line))}${lineNotesHtml(item)}</td>`,
        `<td align="right" style="${TD}text-align:right;padding-left:8px;">${item.quantity}</td>`,
        ...(priced
          ? [
              `<td align="right" style="${TD}text-align:right;padding-left:8px;white-space:nowrap;">${money(item.unitPrice as number)}</td>`,
              `<td align="right" style="${TD}text-align:right;padding-left:8px;white-space:nowrap;">${money(item.lineTotal as number)}</td>`,
            ]
          : []),
      ];
      return `<tr>${cells.join("")}</tr>`;
    })
    .join("");
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 8px;border-collapse:collapse;"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`;
}

/** A right-aligned total line under the table, e.g. "Total due  $2450.50". */
export function totalRowHtml(label: string, amount: number): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 16px;"><tr><td align="right" style="padding:6px 0;color:${COLORS.ink};font-size:17px;font-weight:700;">${escapeHtml(label)}&nbsp;&nbsp;${money(amount)}</td></tr></table>`;
}

/** Plain-text version of the items table, one block per line. */
export function itemsText(items: CustomerOrderLine[]): string {
  const priced = allPriced(items);
  return items
    .map((item, index) => {
      const lines = [`${index + 1}. ${truncate(item.name, LIMITS.line)}`];
      const color = item.color?.trim();
      if (color) lines.push(`   ${truncate(color, LIMITS.line)}`);
      const sizes = item.sizes?.trim();
      if (sizes) lines.push(`   Sizes and quantities: ${truncate(sizes, LIMITS.detail)}`);
      const imprint = item.imprintNotes?.trim();
      if (imprint) lines.push(`   Imprint notes: ${truncate(imprint, LIMITS.detail)}`);
      lines.push(
        priced
          ? `   Qty ${item.quantity} x ${money(item.unitPrice as number)} = ${money(item.lineTotal as number)}`
          : `   Qty ${item.quantity}`
      );
      return lines.join("\n");
    })
    .join("\n");
}

// ---------------------------------------------------------------------------
// Shell
// ---------------------------------------------------------------------------

export interface ShellOptions {
  /** Document title and the large heading inside the card. */
  title: string;
  /** Hidden inbox-preview text shown after the subject. */
  preheader: string;
  /** Already-escaped body HTML. */
  bodyHtml: string;
  /** Internal emails skip the customer-facing contact footer and say so. */
  audience?: "customer" | "internal";
}

/** Invisible padding so inboxes don't pull body text into the preview. */
const PREHEADER_FILLER = "&nbsp;&zwnj;".repeat(40);

function footerHtml(audience: "customer" | "internal"): string {
  const contact = businessContact();
  if (audience === "internal") {
    return `<p style="margin:0;color:${COLORS.muted};font-size:12px;line-height:1.5;">Internal notification from the ${escapeHtml(brand.shortName)} site. Customer-facing wording is separate; this message includes back-office details. Do not forward it to customers.</p>`;
  }
  const lines = [
    `<strong style="color:${COLORS.ink};">${escapeHtml(contact.name)}</strong>`,
    contact.address ? escapeHtml(contact.address) : "",
    contact.phone
      ? contact.phoneHref
        ? `Phone: <a href="${escapeHtml(contact.phoneHref)}" style="color:${COLORS.goldText};text-decoration:underline;">${escapeHtml(contact.phone)}</a>`
        : `Phone: ${escapeHtml(contact.phone)}`
      : "",
    contact.email
      ? `Email: <a href="mailto:${escapeHtml(contact.email)}" style="color:${COLORS.goldText};text-decoration:underline;">${escapeHtml(contact.email)}</a>`
      : "",
  ].filter(Boolean);
  return `<p style="margin:0 0 8px;color:${COLORS.muted};font-size:13px;line-height:1.6;">${lines.join("<br/>")}</p><p style="margin:0;color:${COLORS.muted};font-size:12px;line-height:1.5;">You can reply to this email and it will reach us directly.</p>`;
}

export function renderShell(options: ShellOptions): string {
  const audience = options.audience ?? "customer";
  const title = escapeHtml(options.title);
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="color-scheme" content="light" />
<meta name="supported-color-schemes" content="light" />
<title>${title}</title>
<style>
  @media only screen and (max-width: 480px) {
    .mg-pad { padding-left: 18px !important; padding-right: 18px !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background:${COLORS.cream};-webkit-text-size-adjust:100%;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:${COLORS.cream};font-size:1px;line-height:1px;">${escapeHtml(options.preheader)}${PREHEADER_FILLER}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${COLORS.cream}" style="background:${COLORS.cream};">
<tr><td align="center" style="padding:24px 12px;font-family:${FONT_STACK};">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background:${COLORS.card};border:1px solid ${COLORS.rule};">
<tr><td class="mg-pad" bgcolor="${COLORS.onyx}" style="background:${COLORS.onyx};padding:22px 32px;border-bottom:4px solid ${COLORS.gold};font-family:${FONT_STACK};"><span style="color:#ffffff;font-size:20px;font-weight:700;letter-spacing:0.03em;">${escapeHtml(brand.name)}</span></td></tr>
<tr><td class="mg-pad" style="padding:32px;font-family:${FONT_STACK};text-align:left;">
<h1 style="margin:0 0 20px;color:${COLORS.ink};font-size:24px;line-height:1.25;font-weight:700;">${title}</h1>
${options.bodyHtml}
</td></tr>
<tr><td class="mg-pad" bgcolor="${COLORS.cream}" style="background:${COLORS.cream};padding:20px 32px;border-top:1px solid ${COLORS.rule};font-family:${FONT_STACK};">${footerHtml(audience)}</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// Plain text
// ---------------------------------------------------------------------------

/** Joins blocks with blank lines, dropping empty ones. */
export function joinText(blocks: Array<string | undefined | false>): string {
  return blocks
    .filter((block): block is string => typeof block === "string" && block.trim() !== "")
    .join("\n\n");
}

export function footerText(audience: "customer" | "internal" = "customer"): string {
  if (audience === "internal") {
    return `--\nInternal notification from the ${brand.shortName} site. Includes back-office details; do not forward to customers.`;
  }
  const contact = businessContact();
  return [
    "--",
    contact.name,
    contact.address,
    contact.phone ? `Phone: ${contact.phone}` : undefined,
    contact.email ? `Email: ${contact.email}` : undefined,
    "You can reply to this email and it will reach us directly.",
  ]
    .filter(Boolean)
    .join("\n");
}

export function numberedText(steps: string[]): string {
  return steps.map((step, index) => `${index + 1}. ${step}`).join("\n");
}

export interface BuiltEmail {
  subject: string;
  html: string;
  /** Plain-text alternative carrying the same facts as `html`. */
  text: string;
}
