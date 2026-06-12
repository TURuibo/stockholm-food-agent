// Single choke point for all outbound fetches to the Michelin Guide.
// - Sends a normal browser User-Agent (plain fetch is 403'd otherwise).
// - Rate-limits with a delay between requests (be a good citizen).
// - Caches responses to data/cache/michelin/ keyed by URL -> provenance + offline reruns.
//
// robots.txt compliance is the caller's job: only pass canonical sitemap / detail URLs,
// never disallowed query-param forms (sort=, search?, showMap=, lat=/lon=/radius=, etc.).

import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile, stat } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CACHE_DIR = join(__dirname, "..", "..", "data", "cache", "michelin");

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

const DELAY_MS = 1500; // polite gap between live fetches
const CACHE_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let lastFetch = 0;

function cachePath(url) {
  const h = createHash("sha1").update(url).digest("hex").slice(0, 16);
  return join(CACHE_DIR, `${h}.html`);
}

// Fetch a URL as text, using cache when fresh. Returns { text, fromCache }.
export async function politeText(url, { force = false } = {}) {
  await mkdir(CACHE_DIR, { recursive: true });
  const cp = cachePath(url);

  if (!force) {
    try {
      const s = await stat(cp);
      if (Date.now() - s.mtimeMs < CACHE_TTL_MS) {
        return { text: await readFile(cp, "utf8"), fromCache: true };
      }
    } catch { /* no cache yet */ }
  }

  const since = Date.now() - lastFetch;
  if (since < DELAY_MS) await sleep(DELAY_MS - since);

  let lastErr;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": UA, "Accept-Language": "en-US,en;q=0.9" },
      });
      lastFetch = Date.now();
      if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
      const text = await res.text();
      await writeFile(cp, text, "utf8");
      return { text, fromCache: false };
    } catch (err) {
      lastErr = err;
      await sleep(DELAY_MS * attempt); // backoff
    }
  }
  throw lastErr;
}
