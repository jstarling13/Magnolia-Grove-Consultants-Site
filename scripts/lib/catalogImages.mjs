/**
 * Image download + compression for the catalog import.
 *
 * Source: public ASI CDN (no auth). Output: public/images/merch/<id>.webp,
 * fit inside 900x900 without enlargement, webp q76 effort 4.
 * `fetchBuffer` is injectable so tests never touch the network.
 */

import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

export const IMAGE_CDN = "https://media.asicdn.com/images/jpgc";
export const MAX_DIMENSION = 900;
export const WEBP_QUALITY = 76;
export const WEBP_EFFORT = 4;
export const DOWNLOAD_RETRIES = 2;
export const DOWNLOAD_CONCURRENCY = 4;
/**
 * The CDN answers HTTP 200 with a ~720-byte blank 600x600 placeholder for ids
 * that have no photo. Real product photos are tens of KB or more.
 */
export const MIN_SOURCE_BYTES = 2500;

export function imageUrl(imgId) {
  return `${IMAGE_CDN}/${imgId}.webp`;
}

export async function defaultFetchBuffer(url) {
  const res = await fetch(url, { signal: AbortSignal.timeout(30_000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

/** Resize + recompress a source image buffer to the site's webp spec. */
export async function compressImage(input) {
  return sharp(input)
    .rotate()
    .resize({
      width: MAX_DIMENSION,
      height: MAX_DIMENSION,
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({ quality: WEBP_QUALITY, effort: WEBP_EFFORT })
    .toBuffer();
}

/**
 * Ensure public image exists for one product.
 * @param {{ id: string, imgId: string }} item
 * @param {string} outDir
 * @param {(url: string) => Promise<Uint8Array>} [fetchBuffer]
 * @returns {Promise<{status:"exists"|"downloaded"|"failed", bytes:number, error?:string}>}
 */
export async function ensureImage({ id, imgId }, outDir, fetchBuffer = defaultFetchBuffer) {
  const file = path.join(outDir, `${id}.webp`);
  try {
    const stat = await fs.stat(file);
    if (stat.size > 0) return { status: "exists", bytes: 0 };
  } catch {
    // not there yet
  }

  let lastError = "unknown error";
  for (let attempt = 0; attempt <= DOWNLOAD_RETRIES; attempt++) {
    try {
      const source = await fetchBuffer(imageUrl(imgId));
      if (source.length < MIN_SOURCE_BYTES) {
        // deterministic content problem, not a transient one: do not retry
        return {
          status: "failed",
          bytes: 0,
          error: `placeholder image (${source.length} bytes)`,
        };
      }
      const output = await compressImage(source);
      // write atomically so an interrupted run never leaves a truncated file
      const tmp = `${file}.${process.pid}.tmp`;
      await fs.writeFile(tmp, output);
      await fs.rename(tmp, file);
      return { status: "downloaded", bytes: output.length };
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
    }
  }
  return { status: "failed", bytes: 0, error: lastError };
}

/** Run `worker` over `items` with at most `limit` in flight; keeps result order. */
export async function mapConcurrent(items, limit, worker) {
  const results = new Array(items.length);
  let next = 0;
  async function lane() {
    while (next < items.length) {
      const i = next++;
      results[i] = await worker(items[i], i);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, lane));
  return results;
}
