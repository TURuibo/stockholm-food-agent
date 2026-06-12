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
const TASTE = join(__dirname, "..", "data", "taste_profile.md");

const args = process.argv.slice(2);
const opt = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };

const inFile = opt("--in");
const typeFilter = opt("--type");
const title = opt("--title") || (typeFilter ? `Stockholm ${typeFilter}s` : "Stockholm Food Map");

// ---- minimal taste-profile frontmatter parser (same shape recommend.mjs reads) ----
function parseScalar(v) {
  if (v === "null" || v === "~" || v === "") return null;
  if (/^\[.*\]$/.test(v)) { try { return JSON.parse(v.replace(/'/g, '"')); } catch { return []; } }
  if (/^-?\d+(\.\d+)?$/.test(v)) return Number(v);
  return v.replace(/^["']|["']$/g, "");
}
function parseFrontmatter(md) {
  const m = md.match(/^---\n([\s\S]*?)\n---/);
  if (!m) return {};
  const out = {}; let cur = null;
  for (const raw of m[1].split("\n")) {
    const line = raw.replace(/\s+#.*$/, "");
    if (!line.trim()) continue;
    const indent = line.length - line.trimStart().length;
    const t = line.trim(); const ci = t.indexOf(":"); if (ci < 0) continue;
    const key = t.slice(0, ci).trim(); const val = t.slice(ci + 1).trim();
    if (indent === 0) { if (val === "") { out[key] = {}; cur = key; } else { out[key] = parseScalar(val); cur = null; } }
    else if (cur && out[cur] && typeof out[cur] === "object") out[cur][key] = parseScalar(val);
  }
  return out;
}

// ---- per-place match score (0–100) + components, used for the "Best match" sort & badge ----
function scorePlace(p, config, taste) {
  const W = config.weights || { taste: 1.0, dna: 0.7, vibe: 0.6, value: 0.8, dist: 0.3 };
  const VS = config.value_score || { everyday: 1.0, mid: 0.7, splurge: 0.15 };
  const lc = (s) => (s || "").toLowerCase();
  const likeC = (taste.likes?.cuisines || []).map(lc), disC = (taste.dislikes?.cuisines || []).map(lc);
  const likeV = (taste.likes?.vibes || []).map(lc), disV = (taste.dislikes?.vibes || []).map(lc);
  const cuis = (p.cuisine || []).map(lc), vibes = (p.vibe_tags || []).map(lc);

  let taste_fit = 0.5;
  if (cuis.some((c) => likeC.includes(c))) taste_fit += 0.4;
  if (cuis.some((c) => disC.includes(c))) taste_fit -= 0.5;
  taste_fit = Math.max(0, Math.min(1, taste_fit));

  let vibe_fit = 0.5;
  if (vibes.some((v) => likeV.includes(v))) vibe_fit += 0.3;
  if (vibes.some((v) => disV.includes(v))) vibe_fit -= 0.4;
  vibe_fit = Math.max(0, Math.min(1, vibe_fit));

  const dna = p.michelin_dna_score ?? 0.5;
  const value = VS[p.value_tier] ?? 0.5;
  const distpen = Math.min(1, (p.distance_km ?? 5) / 10);
  const wt = W.taste ?? 1, wd = W.dna ?? 0.7, wv = W.vibe ?? 0.6, wval = W.value ?? 0.8, wdist = W.dist ?? 0.3;
  const raw = wt * taste_fit + wd * dna + wv * vibe_fit + wval * value - wdist * distpen;
  const max = wt + wd + wv + wval;                       // distance only subtracts, so max ignores it
  const match_score = Math.max(0, Math.min(100, Math.round((raw / max) * 100)));
  return { match_score, _match: { taste_fit, vibe_fit, dna, value, distpen } };
}

let places = JSON.parse(await readFile(inFile || PLACES, "utf8"));
if (typeFilter) places = places.filter((p) => p.type === typeFilter);

// ---- preference (match) score: rank every place by how well it fits the brief, not just distance.
// Mirrors the recommender's scoring so the map agrees with /recommend. Driven by config weights:
//   match = W.taste·taste_fit + W.dna·michelin_dna + W.vibe·vibe_fit + W.value·value(price) − W.dist·distance
// then normalised to 0–100. taste_fit/vibe_fit use the local taste profile when present (gitignored,
// so in CI they default to neutral 0.5 and the score reflects DNA · value · near-home — the brief).
let config = {};
try { config = JSON.parse(await readFile(CONFIG, "utf8")); } catch { /* defaults below */ }
let taste = {};
try { taste = parseFrontmatter(await readFile(TASTE, "utf8")); } catch { /* no local taste -> neutral */ }
for (const p of places) Object.assign(p, scorePlace(p, config, taste));
const feedback = config.feedback || null;

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
