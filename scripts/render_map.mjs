// Render map/view.html from places.json (or a shortlist passed on stdin/file).
//
// Usage:
//   node scripts/render_map.mjs                       # all places
//   node scripts/render_map.mjs --type cafe           # filter by type
//   node scripts/render_map.mjs --in shortlist.json --title "Quiet fika near home"
//
// A shortlist JSON is an array of place objects optionally carrying { rank, reason, score }
// so recommendation results render with rank-emphasis + "why it fits" in the popup.

import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { HOME } from "./geo.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const TEMPLATE = join(__dirname, "..", "map", "template.html");
const VIEW = join(__dirname, "..", "map", "view.html");
const PLACES = join(__dirname, "..", "data", "places.json");
const CONFIG = join(__dirname, "..", "data", "config.json");
const VISITS = join(__dirname, "..", "data", "visits.jsonl");

const args = process.argv.slice(2);
const opt = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };

const inFile = opt("--in");
const typeFilter = opt("--type");
const title = opt("--title") || (typeFilter ? `Stockholm ${typeFilter}s` : "Stockholm Food Map");

let places = JSON.parse(await readFile(inFile || PLACES, "utf8"));
if (typeFilter) places = places.filter((p) => p.type === typeFilter);

// feedback config (review form -> GitHub Issue). Optional; map works without it.
let feedback = null;
try { feedback = JSON.parse(await readFile(CONFIG, "utf8")).feedback || null; } catch { /* no config */ }

// Join visit history (data/visits.jsonl) onto each place so the map can show a "✓ Visited"
// badge plus your ratings/comments. NOTE: docs/index.html is published on GitHub Pages, so any
// comment embedded here is PUBLIC. Each place gets p.visited = { count, last:{rating,comment,…},
// log:[…newest-first] }. Skipped silently when there are no visits yet.
try {
  const lines = (await readFile(VISITS, "utf8")).split("\n").filter((l) => l.trim());
  const byId = new Map();
  for (const line of lines) {
    let v; try { v = JSON.parse(line); } catch { continue; }
    if (!v || !v.id) continue;
    (byId.get(v.id) || byId.set(v.id, []).get(v.id)).push(v);
  }
  for (const p of places) {
    const log = byId.get(p.id);
    if (!log || !log.length) continue;
    log.sort((a, b) => String(b.ts || "").localeCompare(String(a.ts || ""))); // newest first
    const slim = log.map((v) => ({
      ts: v.ts || null, rating: v.rating ?? null, comment: v.comment || "",
      occasion: v.occasion || "", would_return: v.would_return ?? null, companions: v.companions || "",
    }));
    p.visited = { count: slim.length, last: slim[0], log: slim };
  }
} catch { /* no visits.jsonl yet — map renders without visited state */ }

const data = { home: HOME, title, places, feedback };
const template = await readFile(TEMPLATE, "utf8");
const inject = `<script>window.FOOD_DATA = ${JSON.stringify(data)};</script>`;
const html = template.replace("<!--DATA-->", inject);

await writeFile(VIEW, html, "utf8");
console.log(`Wrote ${VIEW} (${places.length} places) — title: "${title}"`);
