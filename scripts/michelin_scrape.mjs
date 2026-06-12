// Michelin Guide scraper for Stockholm.
//   sitemap (se) -> filter Stockholm restaurant URLs -> fetch detail -> parse JSON-LD
// Writes/merges into data/places.json. Compliant: only sitemap + canonical detail URLs.
//
// Usage:
//   node scripts/michelin_scrape.mjs            # full Stockholm seed
//   node scripts/michelin_scrape.mjs --limit 8  # quick test
//   node scripts/michelin_scrape.mjs --force    # bypass cache

import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { politeText } from "./lib/fetch_polite.mjs";
import { distanceFromHome } from "./geo.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PLACES = join(__dirname, "..", "data", "places.json");

const SITEMAPS = [
  "https://guide.michelin.com/sitemap/restaurant/se/page/1.xml",
  "https://guide.michelin.com/sitemap/restaurant/se/page/2.xml",
];
const STOCKHOLM_MATCH = "/stockholm-region/stockholm/restaurant/";

const args = process.argv.slice(2);
const force = args.includes("--force");
const limitIdx = args.indexOf("--limit");
const limit = limitIdx >= 0 ? parseInt(args[limitIdx + 1], 10) : Infinity;

function slugFromUrl(url) {
  return url.replace(/\/$/, "").split("/").pop();
}

// Map Michelin award/star text -> our michelin tier.
function michelinTier(text) {
  if (!text) return "none";
  const t = text.toLowerCase();
  if (t.includes("three star")) return "three-star";
  if (t.includes("two star")) return "two-star";
  if (t.includes("one star")) return "one-star";
  if (t.includes("bib gourmand")) return "bib";
  return "none";
}

// Combine award + price phrase -> value_tier (everyday|mid|splurge).
function valueTier(tier, priceRange) {
  const p = (priceRange || "").toLowerCase();
  if (/spare no expense|expensive|treat yourself/.test(p)) return "splurge";
  if (/moderate|good meal/.test(p)) return "mid";
  if (/value|budget|inexpensive|affordable/.test(p)) return "everyday";
  // fall back to award signal
  if (tier === "bib") return "mid";          // Bib = quality + value
  if (tier.endsWith("star")) return "splurge";
  return "mid";
}

function extractJsonLd(html) {
  const m = [...html.matchAll(
    /<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g
  )];
  for (const b of m) {
    try {
      const j = JSON.parse(b[1].trim());
      if (j && (j["@type"] === "Restaurant" || j["@type"] === "FoodEstablishment")) return j;
    } catch { /* skip malformed */ }
  }
  return null;
}

function toPlace(url, j) {
  const awardText = j.award?.awardFor || j.starRating || "";
  const tier = michelinTier(awardText);
  const isGreen = /green star/i.test(JSON.stringify(j.award || "") + (j.starRating || ""));
  const lat = typeof j.latitude === "number" ? j.latitude : parseFloat(j.latitude);
  const lng = typeof j.longitude === "number" ? j.longitude : parseFloat(j.longitude);
  const cuisine = (j.servesCuisine || "")
    .split(/[,/]/).map((s) => s.trim()).filter(Boolean);
  const value_tier = valueTier(tier, j.priceRange);

  const place = {
    id: slugFromUrl(url),
    name: j.name || slugFromUrl(url),
    type: "restaurant",
    cuisine,
    michelin: tier,
    green_star: isGreen,
    price: j.priceRange || null,
    value_tier,
    lat: Number.isFinite(lat) ? lat : null,
    lng: Number.isFinite(lng) ? lng : null,
    address: j.address?.streetAddress || null,
    neighborhood: j.address?.addressRegion || j.address?.addressLocality || null,
    distance_km: null,
    vibe_tags: [],                                  // filled by fingerprint/analysis step
    michelin_dna_score: tier === "none" ? 0.6 : 1.0, // listed places ARE the fingerprint
    confidence: "verified",
    inspector_note: j.review?.description || null,   // raw signal for DNA + vibe extraction
    accepts_reservations: j.acceptsReservations || null,
    source: ["michelin"],
    source_url: url,
    last_verified: new Date().toISOString().slice(0, 10),
    notes: "",
  };
  place.distance_km = distanceFromHome(place);
  return place;
}

async function collectStockholmUrls() {
  const urls = new Set();
  for (const sm of SITEMAPS) {
    const { text } = await politeText(sm, { force });
    for (const m of text.matchAll(/<loc>([^<]+)<\/loc>/g)) {
      if (m[1].includes(STOCKHOLM_MATCH)) urls.add(m[1].trim());
    }
  }
  return [...urls];
}

async function main() {
  console.log("Collecting Stockholm restaurant URLs from sitemap…");
  let urls = await collectStockholmUrls();
  console.log(`Found ${urls.length} Stockholm restaurant URLs.`);
  if (Number.isFinite(limit)) urls = urls.slice(0, limit);

  // Merge with existing (preserve hunter-added candidates + user notes/vibe_tags).
  let existing = [];
  try { existing = JSON.parse(await readFile(PLACES, "utf8")); } catch { /* empty */ }
  const byId = new Map(existing.map((p) => [p.id, p]));

  let ok = 0, fail = 0;
  for (let i = 0; i < urls.length; i++) {
    const url = urls[i];
    try {
      const { text, fromCache } = await politeText(url, { force });
      const j = extractJsonLd(text);
      if (!j) { fail++; console.log(`  [skip] no JSON-LD: ${url}`); continue; }
      const fresh = toPlace(url, j);
      const prev = byId.get(fresh.id);
      // keep human/analysis-added fields if present
      if (prev) {
        fresh.vibe_tags = prev.vibe_tags?.length ? prev.vibe_tags : fresh.vibe_tags;
        fresh.notes = prev.notes || fresh.notes;
      }
      byId.set(fresh.id, fresh);
      ok++;
      console.log(`  [${i + 1}/${urls.length}]${fromCache ? " (cache)" : ""} ${fresh.name} — ${fresh.michelin}/${fresh.value_tier} — ${fresh.distance_km}km`);
    } catch (err) {
      fail++;
      console.log(`  [fail] ${url}: ${err.message}`);
    }
  }

  const out = [...byId.values()].sort((a, b) => (a.distance_km ?? 999) - (b.distance_km ?? 999));
  await writeFile(PLACES, JSON.stringify(out, null, 2) + "\n", "utf8");
  console.log(`\nDone. ${ok} parsed, ${fail} failed. places.json now has ${out.length} entries.`);
}

main().catch((e) => { console.error(e); process.exit(1); });
