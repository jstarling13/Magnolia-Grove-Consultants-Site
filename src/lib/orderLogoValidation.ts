import {
  LOGO_EXTENSIONS,
  LOGO_MESSAGES,
  LOGO_MIME,
  MAX_LOGO_BYTES,
  logoExtension,
  sanitizeLogoFilename,
  type LogoKind,
} from "./orderLogo";

/**
 * Server-side checks on an uploaded logo. The file's name decides which kind
 * it must be; the bytes must then prove it. The browser's reported content
 * type is never read.
 */

export type LogoValidation =
  | { ok: true; kind: LogoKind; mime: string; filename: string; size: number }
  | { ok: false; status: 400 | 413; error: string };

const startsWith = (bytes: Uint8Array, signature: readonly number[], offset = 0): boolean =>
  bytes.length >= offset + signature.length && signature.every((b, i) => bytes[offset + i] === b);

const ascii = (bytes: Uint8Array, from: number, to: number): string =>
  Buffer.from(bytes.subarray(from, to)).toString("latin1");

const isPng = (b: Uint8Array) => startsWith(b, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const isJpeg = (b: Uint8Array) => startsWith(b, [0xff, 0xd8, 0xff]);
const isWebp = (b: Uint8Array) => ascii(b, 0, 4) === "RIFF" && ascii(b, 8, 12) === "WEBP";
const isPdf = (b: Uint8Array) => ascii(b, 0, 5) === "%PDF-";
const isPostScript = (b: Uint8Array) => ascii(b, 0, 4) === "%!PS";
/** EPS files exported on Windows can start with this binary header before the PostScript. */
const isDosEps = (b: Uint8Array) => startsWith(b, [0xc5, 0xd0, 0xd3, 0xc6]);

// ---------------------------------------------------------------------------
// SVG: it is a document that can carry scripts, so it is accepted only when it
// is plain drawing markup. Anything that can run code or fetch something from
// elsewhere is refused outright (we do not try to "clean" it).
// ---------------------------------------------------------------------------

const SAFE_DATA_IMAGE = /^data:image\/(?:png|jpe?g|webp|gif);base64,[A-Za-z0-9+/=\s]*$/i;

export function isSafeSvg(text: string): boolean {
  const body = text.replace(/^﻿/, "").trimStart();
  if (!/^(?:<svg[\s>]|<\?xml\s)/i.test(body)) return false;

  // Code and embedded documents.
  if (/<\s*(?:script|foreignObject|iframe|embed|object|link|meta|audio|video)\b/i.test(body)) {
    return false;
  }
  if (/javascript\s*:|vbscript\s*:/i.test(body)) return false;
  // Event handler attributes (onclick=, onload=, ...).
  if (/[\s"'/]on[a-z]+\s*=/i.test(body)) return false;
  // Entity tricks and internal DTD subsets.
  if (/<!ENTITY/i.test(body) || /<!DOCTYPE[^>]*\[/i.test(body)) return false;
  // Stylesheet imports.
  if (/@import/i.test(body)) return false;

  // Every link must stay inside the file: "#id" or a small embedded raster.
  for (const match of body.matchAll(/(?:^|[\s"'])(?:xlink:)?href\s*=\s*(["'])([\s\S]*?)\1/gi)) {
    const target = match[2].trim();
    if (!(target.startsWith("#") || SAFE_DATA_IMAGE.test(target))) return false;
  }
  // Same rule for CSS url(...) references.
  for (const match of body.matchAll(/url\(\s*(["']?)\s*([^"')]*)/gi)) {
    if (!match[2].trim().startsWith("#")) return false;
  }
  // An unquoted href is not valid XML; treat it as hostile.
  if (/(?:^|[\s"'])(?:xlink:)?href\s*=\s*[^"'\s]/i.test(body)) return false;
  return true;
}

function decodeUtf8(bytes: Uint8Array): string | null {
  if (bytes.includes(0)) return null; // UTF-16 or binary: not a plain SVG
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return null;
  }
}

/**
 * Validates one uploaded logo: size, extension, and that the bytes really are
 * that kind of file. Returns the sanitized file name and the content type we
 * record (derived from the bytes, never from the client).
 */
export function validateLogoUpload(input: { filename: string; bytes: Uint8Array }): LogoValidation {
  const { bytes } = input;
  const bad = (error: string): LogoValidation => ({ ok: false, status: 400, error });

  if (bytes.length === 0) return bad(LOGO_MESSAGES.empty);
  if (bytes.length > MAX_LOGO_BYTES) {
    return { ok: false, status: 413, error: LOGO_MESSAGES.tooLarge };
  }

  const filename = sanitizeLogoFilename(input.filename);
  const kind = LOGO_EXTENSIONS[logoExtension(filename)];
  if (!kind) return bad(LOGO_MESSAGES.type);

  let matches: boolean;
  switch (kind) {
    case "png":
      matches = isPng(bytes);
      break;
    case "jpg":
      matches = isJpeg(bytes);
      break;
    case "webp":
      matches = isWebp(bytes);
      break;
    case "pdf":
      matches = isPdf(bytes);
      break;
    case "ai":
      matches = isPdf(bytes) || isPostScript(bytes);
      break;
    case "eps":
      matches = isPdf(bytes) || isPostScript(bytes) || isDosEps(bytes);
      break;
    case "svg": {
      const text = decodeUtf8(bytes);
      if (text === null || !/^(?:﻿)?\s*(?:<svg[\s>]|<\?xml\s)/i.test(text)) {
        return bad(LOGO_MESSAGES.contentMismatch);
      }
      return isSafeSvg(text)
        ? { ok: true, kind, mime: LOGO_MIME[kind], filename, size: bytes.length }
        : bad(LOGO_MESSAGES.unsafeSvg);
    }
  }
  if (!matches) return bad(LOGO_MESSAGES.contentMismatch);
  return { ok: true, kind, mime: LOGO_MIME[kind], filename, size: bytes.length };
}
