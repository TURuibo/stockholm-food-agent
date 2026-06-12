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

const data = { home: HOME, title, places, feedback };
const template = await readFile(TEMPLATE, "utf8");
const inject = `<script>window.FOOD_DATA = ${JSON.stringify(data)};</script>`;
const html = template.replace("<!--DATA-->", inject);

await writeFile(VIEW, html, "utf8");
console.log(`Wrote ${VIEW} (${places.length} places) — title: "${title}"`);
