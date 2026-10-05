#!/usr/bin/env node
/**
 * Run after `next build`. Fails (exit 1) if backend-only ESP+ data reaches any
 * public output: client JS, prerendered HTML/RSC payloads, or server bundles of
 * public pages. /admin and /api are excluded because they are the only places
 * allowed to touch ESP links (admin dashboard, admin notification email).
 *
 * Needles: "espplus.com/products", "espOrderNumber", plus every ESP id in the ESP link data files.
 *
 * Usage: node scripts/check-no-esp-leak.mjs [--dir <path-to-.next>]
 */
import { readdirSync, readFileSync, existsSync, statSync } from "node:fs";
import { join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const dirFlag = process.argv.indexOf("--dir");
const nextDir = resolve(dirFlag > -1 ? process.argv[dirFlag + 1] : join(root, ".next"));

if (!existsSync(nextDir)) {
  console.error(`No build output at ${nextDir}. Run \`next build\` first.`);
  process.exit(2);
}

// Needles ---------------------------------------------------------------
const needles = [
  { label: "espplus.com/products", test: (text) => text.includes("espplus.com/products") },
  // Internal supplier order number stored on merch orders (admin dashboard only).
  { label: "espOrderNumber", test: (text) => text.includes("espOrderNumber") },
];
const espIds = new Set();
for (const file of ["espLinks.curated.json", "espLinks.imported.json"]) {
  const path = join(root, "src", "lib", file);
  if (!existsSync(path)) continue;
  const data = JSON.parse(readFileSync(path, "utf8"));
  for (const entry of Object.values(data)) {
    if (entry && typeof entry.espId === "string" && entry.espId.trim())
      espIds.add(entry.espId.trim());
  }
}
for (const id of espIds) {
  const escaped = id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  // Not part of a longer token, so a short id doesn't match inside unrelated numbers.
  const pattern = new RegExp(`(?<![\\w.-])${escaped}(?![\\w-]|\\.\\d)`);
  needles.push({ label: `ESP id ${id}`, test: (text) => pattern.test(text) });
}

// Which files are "public" ----------------------------------------------
const TEXT_EXT = /\.(js|mjs|cjs|html|rsc|json|txt|css|xml|webmanifest|map|body)$/i;
const segments = (path) => relative(nextDir, path).split(sep);

function isExcluded(path) {
  const parts = segments(path);
  // Route output for /admin and /api (pages, handlers, their manifests/traces).
  if (
    parts[0] === "server" &&
    parts[1] === "app" &&
    ["admin", "api"].includes(
      parts[2]?.replace(/\.(html|rsc|js|json|body|meta|nft\.json|segments)$/, "")
    )
  )
    return true;
  if (parts[0] === "static" && parts[1] === "chunks" && parts[2] === "app" && parts[3] === "admin")
    return true;
  if (parts[0] === "static" && parts[1] === "chunks" && parts[2] === "app" && parts[3] === "api")
    return true;
  return false;
}

// Public surface: client assets and the prerendered/server output of app routes.
// Shared server chunks (.next/server/chunks) are skipped because route handlers
// and admin pages legitimately bundle espLinks there; public pages that import it
// would still show up in their own page output or in client JS.
const scanRoots = [join(nextDir, "static"), join(nextDir, "server", "app")];

function* walk(dir) {
  if (!existsSync(dir)) return;
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const stat = statSync(full);
    if (stat.isDirectory()) yield* walk(full);
    else yield full;
  }
}

let scanned = 0;
const findings = [];
for (const scanRoot of scanRoots) {
  for (const file of walk(scanRoot)) {
    if (isExcluded(file) || !TEXT_EXT.test(file)) continue;
    const text = readFileSync(file, "latin1");
    scanned++;
    for (const needle of needles) {
      if (needle.test(text)) findings.push(`${relative(root, file)}: ${needle.label}`);
    }
  }
}

if (scanned === 0) {
  console.error("Scanned 0 files; is the build output complete?");
  process.exit(2);
}

if (findings.length > 0) {
  console.error(
    `ESP LEAK: backend-only ESP data found in public build output (${findings.length}):`
  );
  for (const finding of findings) console.error(`  ${finding}`);
  process.exit(1);
}

console.log(
  `check-no-esp-leak: OK. Scanned ${scanned} public build files for "espplus.com/products" and ${espIds.size} ESP id(s); none found.`
);
