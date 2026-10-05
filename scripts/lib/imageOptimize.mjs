/**
 * Core of the product-photo optimizer (see scripts/optimizeImages.mjs).
 *
 * Pure-ish helpers: no CLI parsing, no manifest I/O. Everything that decides
 * whether a re-encoded image is acceptable lives here so it can be unit tested.
 */

import { createHash } from "node:crypto";
import sharp from "sharp";

export const MAX_DIMENSION = 1000;
/** Only files above this many bytes are considered at all. */
export const MIN_BYTES = 90 * 1024;
/** colors/ files are only touched above this size. */
export const COLORS_MIN_BYTES = 150 * 1024;
/** A re-encode must be at least this much smaller to replace the original. */
export const MIN_SAVING = 0.25;

export const WEBP_QUALITY = 78;
export const WEBP_EFFORT = 5;
export const JPEG_QUALITY = 80;

/** Safety thresholds (all on 0-255 scales). */
export const MAX_MAD_64 = 3; // mean abs diff, 64x64 grayscale, original vs result
export const MAX_COLOR_MAD_64 = 4; // same, per RGB channel (catches hue shifts)
export const MAX_ALPHA_MAD_64 = 3; // same, alpha plane (transparent images only)
export const MIN_PSNR_DB = 34; // full-res, result vs lossless resize of the original

export function sha256(buf) {
  return createHash("sha256").update(buf).digest("hex");
}

/**
 * Target size: fit inside MAX_DIMENSION x MAX_DIMENSION, never enlarge, keep
 * the aspect ratio (the long side is exact, the short side is rounded).
 */
export function targetSize(width, height, max = MAX_DIMENSION) {
  const scale = Math.min(1, max / width, max / height);
  if (scale === 1) return { width, height };
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

/**
 * True when (w2, h2) has the same aspect ratio as (w1, h1) to within 1 px of
 * rounding on either axis.
 */
export function sameAspect(w1, h1, w2, h2) {
  return Math.abs(w2 - (w1 * h2) / h1) <= 1 && Math.abs(h2 - (h1 * w2) / w1) <= 1;
}

/** Re-encode into the given container format. */
export function encode(pipeline, format) {
  switch (format) {
    case "webp":
      return pipeline.webp({ quality: WEBP_QUALITY, effort: WEBP_EFFORT }).toBuffer();
    case "jpeg":
      return pipeline.jpeg({ quality: JPEG_QUALITY, mozjpeg: true }).toBuffer();
    case "png":
      return pipeline
        .png({ compressionLevel: 9, effort: 10, palette: true, quality: 90 })
        .toBuffer();
    default:
      throw new Error(`unsupported format: ${format}`);
  }
}

async function planes(input, size, { flatten }) {
  let p = sharp(input)
    .rotate()
    .resize(size.width, size.height, { fit: "fill", fastShrinkOnLoad: false });
  if (flatten) p = p.flatten({ background: "#ffffff" });
  const { data, info } = await p.removeAlpha().raw().toBuffer({ resolveWithObject: true });
  return { data, channels: info.channels };
}

function meanAbsDiff(a, b) {
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += Math.abs(a[i] - b[i]);
  return a.length ? sum / a.length : 0;
}

async function smallStats(input, hasAlpha) {
  const gray = await sharp(input)
    .rotate()
    .flatten({ background: "#ffffff" })
    .resize(64, 64, { fit: "fill", fastShrinkOnLoad: false })
    .greyscale()
    .raw()
    .toBuffer();
  const rgb = await sharp(input)
    .rotate()
    .flatten({ background: "#ffffff" })
    .resize(64, 64, { fit: "fill", fastShrinkOnLoad: false })
    .removeAlpha()
    .raw()
    .toBuffer();
  let alpha = null;
  if (hasAlpha) {
    alpha = await sharp(input)
      .rotate()
      .ensureAlpha()
      .resize(64, 64, { fit: "fill", fastShrinkOnLoad: false })
      .extractChannel(3)
      .raw()
      .toBuffer();
  }
  return { gray, rgb, alpha };
}

function psnr(a, b) {
  let se = 0;
  for (let i = 0; i < a.length; i++) {
    const d = a[i] - b[i];
    se += d * d;
  }
  if (se === 0) return Infinity;
  return 10 * Math.log10((255 * 255) / (se / a.length));
}

/**
 * Compare a candidate re-encode against the original and return metrics plus
 * a list of failures (empty when the candidate is visually safe).
 *
 * @param {Buffer} original
 * @param {Buffer} candidate
 * @param {{width:number,height:number,hasAlpha:boolean}} origInfo oriented size of the original
 */
export async function similarity(original, candidate, origInfo) {
  const cm = await sharp(candidate).metadata();
  const failures = [];
  const metrics = {};
  const cw = cm.width;
  const ch = cm.height;

  if (!sameAspect(origInfo.width, origInfo.height, cw, ch)) {
    failures.push(`aspect ratio changed (${origInfo.width}x${origInfo.height} -> ${cw}x${ch})`);
  }
  if (Boolean(cm.hasAlpha) !== Boolean(origInfo.hasAlpha)) {
    failures.push("alpha channel presence changed");
  }

  const [a, b] = await Promise.all([
    smallStats(original, origInfo.hasAlpha),
    smallStats(candidate, origInfo.hasAlpha),
  ]);
  metrics.mad64 = meanAbsDiff(a.gray, b.gray);
  metrics.colorMad64 = meanAbsDiff(a.rgb, b.rgb);
  if (metrics.mad64 > MAX_MAD_64) failures.push(`64x64 grayscale MAD ${metrics.mad64.toFixed(2)}`);
  if (metrics.colorMad64 > MAX_COLOR_MAD_64) {
    failures.push(`64x64 color MAD ${metrics.colorMad64.toFixed(2)}`);
  }
  if (origInfo.hasAlpha && a.alpha && b.alpha) {
    metrics.alphaMad64 = meanAbsDiff(a.alpha, b.alpha);
    if (metrics.alphaMad64 > MAX_ALPHA_MAD_64) {
      failures.push(`64x64 alpha MAD ${metrics.alphaMad64.toFixed(2)}`);
    }
  }

  // Full-resolution encoder fidelity: candidate vs a lossless resize of the
  // original to exactly the candidate's size (isolates encoding loss from the
  // intended downscale).
  const size = { width: cw, height: ch };
  const [ref, got] = await Promise.all([
    planes(original, size, { flatten: true }),
    planes(candidate, size, { flatten: true }),
  ]);
  metrics.psnr = psnr(ref.data, got.data);
  if (metrics.psnr < MIN_PSNR_DB) failures.push(`PSNR ${metrics.psnr.toFixed(1)} dB`);

  // Rounded so the committed manifest stays compact (lossless PSNR is Infinity).
  for (const k of Object.keys(metrics)) {
    metrics[k] = Number.isFinite(metrics[k]) ? Math.round(metrics[k] * 1000) / 1000 : 99;
  }
  return { ok: failures.length === 0, failures, metrics };
}

/**
 * Process one image buffer. Returns the decision without touching the disk.
 *
 * @returns {Promise<{status:"optimized"|"kept", reason?:string, buffer?:Buffer,
 *   format:string, original:{bytes:number,sha256:string,width:number,height:number,hasAlpha:boolean},
 *   optimized?:{bytes:number,sha256:string,width:number,height:number}, metrics?:object}>}
 */
export async function processImage(original) {
  const meta = await sharp(original).metadata();
  const format = meta.format;
  // Oriented dimensions (EXIF 5-8 swap width/height).
  const swap = meta.orientation && meta.orientation >= 5;
  const width = swap ? meta.height : meta.width;
  const height = swap ? meta.width : meta.height;
  const hasAlpha = Boolean(meta.hasAlpha);
  const info = {
    bytes: original.length,
    sha256: sha256(original),
    width,
    height,
    hasAlpha,
  };
  const base = { format, original: info };

  if (!["webp", "jpeg", "png"].includes(format)) {
    return { ...base, status: "kept", reason: `unsupported format ${format}` };
  }
  if (meta.pages && meta.pages > 1) {
    return { ...base, status: "kept", reason: "animated image" };
  }

  const target = targetSize(width, height);
  let pipeline = sharp(original).rotate();
  if (target.width !== width || target.height !== height) {
    pipeline = pipeline.resize(target.width, target.height, { fit: "fill", kernel: "lanczos3" });
  }
  const buffer = await encode(pipeline, format);

  const saving = 1 - buffer.length / original.length;
  if (saving < MIN_SAVING) {
    return {
      ...base,
      status: "kept",
      reason: `only ${(saving * 100).toFixed(0)}% smaller (needs >= ${MIN_SAVING * 100}%)`,
    };
  }
  const check = await similarity(original, buffer, info);
  if (!check.ok) {
    return {
      ...base,
      status: "kept",
      reason: `failed safety check: ${check.failures.join("; ")}`,
      metrics: check.metrics,
    };
  }
  const om = await sharp(buffer).metadata();
  return {
    ...base,
    status: "optimized",
    buffer,
    optimized: { bytes: buffer.length, sha256: sha256(buffer), width: om.width, height: om.height },
    metrics: check.metrics,
  };
}
