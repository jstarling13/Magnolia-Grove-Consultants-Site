import { LOGO_EXTENSIONS, logoExtension } from "./orderLogo";

const EXTENSION_FOR_MIME: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/svg+xml": "svg",
};

/**
 * Turns the logo the shopper already picked in the preview tool (kept as a data
 * URL) back into a File, so the cart can attach that same logo without asking
 * for it a second time. Returns null when the data URL is not usable.
 */
export function logoFileFromDataUrl(dataUrl: string, fileName: string | null): File | null {
  const match = /^data:([^;,]+)((?:;[^;,]+)*),([\s\S]*)$/.exec(dataUrl);
  if (!match) return null;
  const mime = match[1].toLowerCase();
  const isBase64 = /;base64/i.test(match[2]);
  try {
    let bytes: Uint8Array;
    if (isBase64) {
      const binary = atob(match[3]);
      bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    } else {
      bytes = new TextEncoder().encode(decodeURIComponent(match[3]));
    }
    // The server decides what a file is from its extension and bytes, so make sure the name carries one.
    let name = (fileName ?? "").trim() || "logo";
    if (!(logoExtension(name) in LOGO_EXTENSIONS)) {
      const extension = EXTENSION_FOR_MIME[mime];
      if (!extension) return null;
      name = `${name}.${extension}`;
    }
    return new File([bytes as BlobPart], name, { type: mime });
  } catch {
    return null;
  }
}
