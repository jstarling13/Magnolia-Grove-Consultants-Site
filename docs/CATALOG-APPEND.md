# Appending new products to the catalog

`npm run catalog:import` regenerates the whole catalog from ALL raw ESP+ batches. The old raw
batches are gone, so adding products now uses the additive mode instead:

```
npm run catalog:append -- --raw <dir-of-NEW-raw-json> [--dry-run] [--no-images] [--report <file>] [--root <dir>]
# same thing: npm run catalog:import -- --append --raw <dir> ...
```

`--raw` is required (no default directory). Raw rows use the positional schema documented at the
top of `scripts/lib/catalogClean.mjs`.

## What it does

- Runs the same `buildCatalog` rules as the wholesale importer: vendor gate (rating >= 4.5 and
  > = 10 reviews, Ball Pro `asi/38120` excluded), category mapping and keyword rules, brand, name,
  > description and color cleaning, price tiers, `import-overrides.json`, duplicate clustering with
  > best vendor winning.
- Existing products (importedProducts.json) and hand-curated products (merchandiseConfig.ts) are
  duplicate rivals and always win. A new row is dropped when its espId is already in
  `espLinks.imported.json` or `espLinks.curated.json`, or when it is a duplicate of an existing
  product (same-category Jaccard rule), a cross-supplier near-duplicate of an existing product
  (vendor taken from `espLinks.imported.json`), or a duplicate or name clash of another row.
  Byte-identical photos are duplicates too (existing wins).
- Appends survivors to the END of `src/config/importedProducts.json` (the file is in raw-scrape
  order, not sorted by id) and `src/lib/espLinks.imported.json`, adds their ids to
  `scripts/data/import-manifest.json` (sorted), and downloads/compresses new images only.
- Existing records, existing links, existing images and all `colorImages*.json` files are never
  touched. The new file text is checked to start with the old text byte for byte; if an existing
  file is not in the importer's format the run stops without writing.
- Idempotent: a second run with the same raw input finds every espId already linked and changes
  nothing.
- `--dry-run` writes nothing to the repo (new images are fetched into a scratch dir under the OS
  temp directory, as in the wholesale importer; use `--no-images` to skip that).
- New products stay hidden from the storefront until their ids are added to
  `src/config/photoReviewed.json`.

## Known differences from the wholesale importer

- Raw names of only the NEW batch feed the cut-off-name vocabulary.
- Sizes of existing products are not stored, so the near-duplicate size-conflict guard does not
  apply against existing products (numbers in names still do).
- A new product whose display name equals an existing one is skipped (`name-collision`) rather than
  kept with a warning.
