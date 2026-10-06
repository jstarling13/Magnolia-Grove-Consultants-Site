/**
 * Pixel size of a photo under /public, read from the file header (WebP, JPEG
 * and PNG). Server-only: it uses the filesystem, so import it from page
 * metadata code, never from a client component. Used to tell link-preview
 * crawlers the real size of the product photo in og:image:width/height.
 *
 * Reads at most the first 64 KB of the file, and never throws: an unreadable
 * or unrecognised file gives `undefined`, and the caller simply omits the
 * size tags.
 */

import { closeSync, openSync, readSync } from "node:fs";
import path from "node:path";

export interface ImageSize {
  width: number;
  height: number;
}

const HEADER_BYTES = 64 * 1024;
const cache = new Map<string, ImageSize | undefined>();

function parseWebp(buf: Buffer): ImageSize | undefined {
  if (buf.length < 30 || buf.toString("ascii", 0, 4) !== "RIFF") return undefined;
  if (buf.toString("ascii", 8, 12) !== "WEBP") return undefined;
  const chunk = buf.toString("ascii", 12, 16);
  if (chunk === "VP8X") {
    return { width: buf.readUIntLE(24, 3) + 1, height: buf.readUIntLE(27, 3) + 1 };
  }
  if (chunk === "VP8L") {
    const bits = buf.readUInt32LE(21);
    return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
  }
  if (chunk === "VP8 ") {
    return { width: buf.readUInt16LE(26) & 0x3fff, height: buf.readUInt16LE(28) & 0x3fff };
  }
  return undefined;
}

function parsePng(buf: Buffer): ImageSize | undefined {
  if (buf.length < 24 || buf.readUInt32BE(0) !== 0x89504e47) return undefined;
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

function parseJpeg(buf: Buffer): ImageSize | undefined {
  if (buf.length < 4 || buf[0] !== 0xff || buf[1] !== 0xd8) return undefined;
  let offset = 2;
  while (offset + 9 < buf.length) {
    if (buf[offset] !== 0xff) {
      offset += 1;
      continue;
    }
    const marker = buf[offset + 1];
    if (marker === 0xff) {
      offset += 1;
      continue;
    }
    // Start-of-frame markers (not DHT 0xC4, JPG 0xC8 or DAC 0xCC) carry the size.
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
      return { height: buf.readUInt16BE(offset + 5), width: buf.readUInt16BE(offset + 7) };
    }
    offset += 2 + buf.readUInt16BE(offset + 2);
  }
  return undefined;
}

/** Size of an image header already in memory, or undefined if not WebP/JPEG/PNG. */
export function parseImageSize(buf: Buffer): ImageSize | undefined {
  const size = parseWebp(buf) ?? parsePng(buf) ?? parseJpeg(buf);
  return size && size.width > 0 && size.height > 0 ? size : undefined;
}

/**
 * Size of the photo at a site path such as "/images/merch/mug.webp", looked up
 * under the project's public folder. `publicDir` is for tests.
 */
export function readImageSize(
  sitePath: string,
  publicDir = path.join(process.cwd(), "public")
): ImageSize | undefined {
  const key = `${publicDir}::${sitePath}`;
  if (cache.has(key)) return cache.get(key);

  let size: ImageSize | undefined;
  try {
    const file = path.join(publicDir, path.normalize(sitePath));
    // Never read outside the public folder, whatever the path says.
    if (file.startsWith(publicDir + path.sep)) {
      const fd = openSync(file, "r");
      try {
        const buf = Buffer.alloc(HEADER_BYTES);
        const read = readSync(fd, buf, 0, HEADER_BYTES, 0);
        size = parseImageSize(buf.subarray(0, read));
      } finally {
        closeSync(fd);
      }
    }
  } catch {
    size = undefined;
  }
  cache.set(key, size);
  return size;
}
