/**
 * Rules for the logo a shopper attaches to an order request. Shared by the
 * browser (quick checks before uploading) and the server (the checks that
 * actually count, which never trust anything the browser claims).
 */

/**
 * Hard cap on one logo. Vercel serverless request bodies are limited to about
 * 4.5 MB, so the file plus its multipart envelope has to fit under that.
 */
export const MAX_LOGO_BYTES = 4 * 1024 * 1024;
/** Human wording of the cap, shown next to the file input. */
export const MAX_LOGO_LABEL = "4 MB";
/** A multipart envelope (field names, ref, token, boundaries) is well under this. */
export const LOGO_BODY_OVERHEAD_BYTES = 64 * 1024;
/** Logos kept per order. */
export const MAX_LOGO_FILES_PER_ORDER = 3;

export type LogoKind = "png" | "jpg" | "webp" | "svg" | "pdf" | "ai" | "eps";

/** Extension (lowercase, no dot) to the kind of file it must turn out to be. */
export const LOGO_EXTENSIONS: Readonly<Record<string, LogoKind>> = {
  png: "png",
  jpg: "jpg",
  jpeg: "jpg",
  webp: "webp",
  svg: "svg",
  pdf: "pdf",
  ai: "ai",
  eps: "eps",
};

/** For the file input's accept attribute. */
export const LOGO_ACCEPT = Object.keys(LOGO_EXTENSIONS)
  .map((extension) => `.${extension}`)
  .join(",");

/** For wording: "PNG, JPG, WEBP, SVG, PDF, AI or EPS". */
export const LOGO_TYPES_LABEL = "PNG, JPG, WEBP, SVG, PDF, AI or EPS";

/** Content type recorded for each kind. Derived from the bytes, never from the client. */
export const LOGO_MIME: Readonly<Record<LogoKind, string>> = {
  png: "image/png",
  jpg: "image/jpeg",
  webp: "image/webp",
  svg: "image/svg+xml",
  pdf: "application/pdf",
  ai: "application/postscript",
  eps: "application/postscript",
};

/** Kinds that a browser can safely draw as a small thumbnail in the admin. */
const RASTER_MIMES = new Set(["image/png", "image/jpeg", "image/webp"]);
export function isRasterMime(mime: string): boolean {
  return RASTER_MIMES.has(mime);
}

const MAX_NAME_LENGTH = 100;

/** Lowercase extension of a file name, or "" when it has none. */
export function logoExtension(filename: string): string {
  const match = /\.([A-Za-z0-9]{1,8})$/.exec(filename.trim());
  return match ? match[1].toLowerCase() : "";
}

/**
 * A file name that is safe to store and show: no directory parts, no control
 * characters, quotes or characters that are special in paths or headers, no
 * leading dots, and a bounded length that keeps the extension.
 */
export function sanitizeLogoFilename(raw: string): string {
  const base = (raw ?? "").split(/[\\/]/).pop() ?? "";
  let name = base
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001f\u007f-\u009f\u2028\u2029\u202a-\u202e\u2066-\u2069]/g, "")
    .replace(/[<>:"|?*;,%`$&!{}[\]^~#@=+\\]/g, "_")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^\.+/, "")
    .trim();
  if (name.length > MAX_NAME_LENGTH) {
    const extension = logoExtension(name);
    const suffix = extension ? `.${extension}` : "";
    name = `${Array.from(name)
      .slice(0, MAX_NAME_LENGTH - suffix.length)
      .join("")
      .trimEnd()}${suffix}`;
  }
  return name || "logo";
}

/** "812 KB", "2.4 MB". */
export function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export const LOGO_MESSAGES = {
  empty: "That file is empty. Please choose your logo file again.",
  tooLarge: `That file is too large. Logos can be up to ${MAX_LOGO_LABEL}.`,
  type: `That file type is not accepted. Please attach a ${LOGO_TYPES_LABEL} file.`,
  unreadable: "We could not read that file. Please choose it again.",
  contentMismatch:
    "That file does not look like a real logo of its type. Please export it again, or reply to the confirmation email with it.",
  unsafeSvg:
    "That SVG contains scripts or outside links, which we cannot accept. Please export a plain SVG, or attach a PNG or PDF instead.",
  tooMany: `We already have ${MAX_LOGO_FILES_PER_ORDER} logo files on this request. Reply to the confirmation email with anything else.`,
} as const;

/** Quick browser-side check (name and size only; the server checks the bytes). */
export function checkLogoCandidate(file: { name: string; size: number }): string | null {
  if (!(file.size > 0)) return LOGO_MESSAGES.empty;
  if (file.size > MAX_LOGO_BYTES) return LOGO_MESSAGES.tooLarge;
  if (!(logoExtension(file.name) in LOGO_EXTENSIONS)) return LOGO_MESSAGES.type;
  return null;
}
