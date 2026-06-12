// Merge a place into data/places.json (used by the hunter to add candidate gems).
// Enforces the value gate: rejects splurge-priced finds (the "not as expensive" rule).
// Usage:
//   node scripts/add_place.mjs --json '{"name":"...","type":"restaurant","cuisine":["Nordic"],
//      "value_tier":"mid","lat":59.34,"lng":18.05,"neighborhood":"Vasastan",
//      "michelin_dna_score":0.75,"source_url":"https://...","vibe_tags":["natural-wine"]}'
// Reads JSON from --json or stdin. Prints the result line.

import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { distanceFromHome } from "./geo.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PLACES = join(__dirname, "..", "data", "places.json");
const args = process.argv.slice(2);
const opt = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };

function slug(s) { return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
  .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""); }

let raw = opt("--json");
if (!raw) raw = await new Promise((res) => { let s = ""; process.stdin.on("data", (d) => s += d).on("end", () => res(s)); });
const incoming = JSON.parse(raw);

// value gate
if (incoming.value_tier === "splurge") {
  console.log(`SKIP (too pricey / splurge): ${incoming.name}`);
  process.exit(0);
}

const places = JSON.parse(await readFile(PLACES, "utf8"));
const id = incoming.id || slug(incoming.name);
if (places.some((p) => p.id === id)) { console.log(`SKIP (duplicate): ${incoming.name}`); process.exit(0); }

const place = {
  id,
  name: incoming.name,
  type: incoming.type || "restaurant",
  cuisine: incoming.cuisine || [],
  michelin: "none",
  green_star: false,
  price: incoming.price || null,
  value_tier: incoming.value_tier || "mid",
  lat: incoming.lat ?? null,
  lng: incoming.lng ?? null,
  address: incoming.address || null,
  neighborhood: incoming.neighborhood || null,
  distance_km: null,
  vibe_tags: incoming.vibe_tags || [],
  michelin_dna_score: incoming.michelin_dna_score ?? 0.6,
  confidence: "candidate",
  inspector_note: incoming.note || null,
  // Provenance/merit fields — see scripts/annotate_provenance.mjs for the canonical
  // derivation. New finds are always candidates added by the hunter's web search.
  why_listed: incoming.why_listed
    || "Michelin-adjacent value candidate — similar DNA to the starred spots, but cheaper and not yet famous. Auto-grown to widen your everyday options.",
  highlights: incoming.highlights || [],
  accepts_reservations: null,
  added_via: incoming.added_via
    || "Surfaced by the gem-hunter agent through live web search (/hunt) and saved as a value candidate.",
  source: incoming.source || ["web"],
  source_url: incoming.source_url || null,
  last_verified: new Date().toISOString().slice(0, 10),
  notes: incoming.notes || "",
};
place.distance_km = distanceFromHome(place);
places.push(place);
places.sort((a, b) => (a.distance_km ?? 999) - (b.distance_km ?? 999));
await writeFile(PLACES, JSON.stringify(places, null, 2) + "\n", "utf8");
console.log(`ADDED candidate: ${place.name} [${place.value_tier}, dna ${place.michelin_dna_score}, ${place.distance_km ?? "?"}km]`);
