# Post-deploy smoke test

`scripts/smoke.mjs` is a read-only health check for a deployed copy of the store. It needs
Node 18 or newer and nothing else (no npm install, global `fetch`). It prints a PASS/FAIL table and
a final `HEALTHY` or `PROBLEM` line.

```
npm run smoke                                   # https://www.magnoliagrovega.com
npm run smoke -- https://preview-abc.vercel.app # any other deployment
npm run smoke -- http://localhost:3000          # a local `next start`
npm run smoke -- --json --sample 10             # machine output, smaller sample
npm run smoke -- --probe-webhook                # also send the one opt-in POST
```

## Flags

| Flag              | Default                           | Meaning                                                                   |
| ----------------- | --------------------------------- | ------------------------------------------------------------------------- |
| `<base-url>`      | `https://www.magnoliagrovega.com` | Site to test. A missing scheme is added (`http` for localhost).           |
| `--json`          | off                               | Print one JSON document on stdout instead of the table.                   |
| `--sample N`      | 40                                | Product pages to sample from the sitemap.                                 |
| `--seed N`        | random                            | Seed for the sampler. The seed used is printed, so a run can be repeated. |
| `--min-sitemap N` | 800                               | Fail if the sitemap lists fewer URLs.                                     |
| `--probe-webhook` | off                               | Run check 8 (the only non-GET request).                                   |
| `--timeout MS`    | 15000                             | Per-request timeout.                                                      |
| `--help`          |                                   | Usage.                                                                    |

## Checks

Statuses are `PASS`, `FAIL`, `WARN` (reported, does not fail the run) and `SKIP`.

| #   | Check                      | Passes when                                                                                                                                                                                                                                                                      |
| --- | -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `/merchandise`             | 200 and at least one product link.                                                                                                                                                                                                                                               |
| 2   | category pages             | Every `/merchandise/category/...` URL in the sitemap returns 200.                                                                                                                                                                                                                |
| 3   | sitemap and product sample | `/sitemap.xml` is 200 with at least `--min-sitemap` URLs. A random sample of `--sample` product URLs each return 200 with a non-empty `<title>`, an `<h1>`, a price table or `$` price, an `<img>`, and JSON-LD that parses. One row per property, so a regression names itself. |
| 4   | `robots.txt`               | 200, still disallows `/api/`, `/admin`, `/orders`, `/merchandise/cart`, and does not `Disallow: /`.                                                                                                                                                                              |
| 5   | `/admin` not public        | Redirects to a login page (3xx), or 401, 403 or 404. A 200 fails.                                                                                                                                                                                                                |
| 6   | `/orders/MG-00001`         | 404 (order pages must not be guessable).                                                                                                                                                                                                                                         |
| 7   | hidden products            | The first 3 ids in `src/config/hiddenProducts.json` return 404, and none appear in the sitemap. Skipped when the script is run outside the repo (file not found).                                                                                                                |
| 8   | webhook rejects unsigned   | Opt-in with `--probe-webhook`. An unsigned empty POST to `/api/webhooks/square` returns 400, 401 or 403. **503 fails**: it means the Square webhook environment variables are missing on that deployment. A 2xx also fails (unsigned request accepted).                          |
| 9   | product images             | The first product photo of each sampled page returns 200 with an `image/*` content-type. The URL is the page's own `/_next/image` URL, re-pointed at `w=640` (a width the srcset already uses) so the check does not force expensive 3840px renders.                             |
| 10  | weight and speed           | `/merchandise/cart` and one category page: size and time are reported, `WARN` over 300 KB or 3 s.                                                                                                                                                                                |

Also reported first: **apex redirect**. When the base is `www.` or an apex domain, the apex host is
requested without following redirects, and the row says whether it redirects to `www` (`PASS`) or
answers on its own (`WARN`). If you pass the apex as the base URL and it redirects, the rest of the
run follows it to `www`. The sitemap advertises the apex hostname, so the script keeps only each
URL's path and requests it on the origin under test; a preview deployment is therefore tested
against its own pages, not production.

## Safety and politeness

- Every request is a GET, except the check 8 POST, which only happens with `--probe-webhook`. A guard
  throws on any other method or any POST to another path. The image check is a GET whose body is
  cancelled after the headers arrive, instead of a HEAD, so the webhook stays the only non-GET.
- Requests are spaced to at most 5 per second (about 110 requests, roughly 25 seconds, for a default run).
- User-Agent is `mg-smoke/1.0`. Redirects are never followed implicitly.
- A GET that fails at the network level is retried once; HTTP error statuses are not retried.
- Nothing is written to disk, and no credentials are used.

## Exit codes

| Code | Meaning                                                     |
| ---- | ----------------------------------------------------------- |
| 0    | `HEALTHY`: no `FAIL` rows (warnings and skips are allowed). |
| 1    | `PROBLEM`: at least one `FAIL`.                             |
| 2    | Bad usage (unknown flag, bad number, unparseable URL).      |

## JSON output

`--json` prints `{ base, healthy, counts: { pass, fail, warn, skip }, seed, sample, durationMs,
requests: { total, nonGet }, results: [{ check, status, detail }] }`. The human table is not printed,
so stdout is always valid JSON. `requests.nonGet` is 0 unless `--probe-webhook` was used (then 1).

## Running it from a deploy monitor

Run it once per production deployment, after the deployment is live and aliased to the domain, so it
sees what customers see.

1. Wait until the new deployment answers (poll `/merchandise` until 200, 30 to 60 seconds at most).
   Static pages are cached at the edge, so also give it a few seconds after promotion.
2. Run `npm run smoke -- https://www.magnoliagrovega.com --json > smoke.json` from a checkout of
   the deployed commit. Checking out the commit matters for check 7: `hiddenProducts.json` must match
   what was deployed. Add `--probe-webhook` if the monitor should also catch a deployment that lost
   its Square webhook environment variables; leave it off for frequent or anonymous runs, since it is
   a POST (rejected without side effects, but still the one write-method request).
3. Treat exit code 1 as a failed deployment: page or roll back to the previous deployment, and attach
   `smoke.json` (or the printed table) to the alert. A `FAIL` row names the check and the first few
   offending URLs. Exit code 2 means the monitor invoked the script wrongly.
4. A flaky result can be reproduced with the same sample by passing the printed `--seed`. If a sampled
   product failed, rerun with `--sample 1340` (or any number up to the sitemap size) to find every
   broken page; each product costs two requests (page and image) at 5 per second, so the full catalog takes about 9 minutes.
5. `WARN` rows (an apex that does not redirect, a page over 300 KB or 3 s) should be logged, not
   paged on. Trend the `perf` rows from the JSON over time.

Example post-deploy step (shell):

```sh
npm run smoke -- "$SITE_URL" --json --probe-webhook > smoke.json
status=$?
jq -r '.results[] | select(.status=="FAIL") | "\(.check): \(.detail)"' smoke.json
exit $status
```

## Tests

The pure helpers (sitemap parsing, JSON-LD extraction, seeded sampling, robots and response
classification, rate limiter, result formatting) are unit tested without network access in
`__tests__/smokeHelpers.test.ts` (`npx vitest run __tests__/smokeHelpers.test.ts`).
