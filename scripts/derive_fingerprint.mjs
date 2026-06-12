// Derive data/michelin_fingerprint.md from places.json.
// The fingerprint = "what good looks like," distilled from the reference set
// (starred + Bib Gourmand). The hunter searches against this to find cheaper cousins.
// Re-run whenever the list grows (weekly cron) so the model stays current.

import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PLACES = join(__dirname, "..", "data", "places.json");
const OUT = join(__dirname, "..", "data", "michelin_fingerprint.md");

const STOP = new Set(("the a an and or of to in on at with for from this that is are was its his her "
  + "you your their they our we he she it as by be have has had not but so all one two more most "
  + "where which who when while into out up over under also can will just very much many such here "
  + "there about before after both each other than then them him offering set home both your visit")
  .split(/\s+/));

function topCounts(arr, n) {
  const m = new Map();
  for (const x of arr) m.set(x, (m.get(x) || 0) + 1);
  return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, n);
}

function words(text) {
  return (text || "")
    .toLowerCase()
    .replace(/[^a-zåäö\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 3 && !STOP.has(w));
}

const places = JSON.parse(await readFile(PLACES, "utf8"));
const ref = places.filter((p) => p.michelin && p.michelin !== "none"); // stars + bib
const bib = places.filter((p) => p.michelin === "bib");

const cuisineFreq = topCounts(ref.flatMap((p) => p.cuisine || []), 12);
const bibCuisine = topCounts(bib.flatMap((p) => p.cuisine || []), 8);
const valueDist = topCounts(ref.map((p) => p.value_tier), 5);
const noteWords = topCounts(ref.flatMap((p) => words(p.inspector_note)), 25);

const bibList = bib
  .sort((a, b) => (a.distance_km ?? 99) - (b.distance_km ?? 99))
  .map((p) => `- **${p.name}** (${(p.cuisine || []).join(", ") || "—"}) — ${p.distance_km}km, ${p.value_tier}`)
  .join("\n");

const md = `# Michelin Fingerprint — "what good looks like"

> Auto-derived from \`data/places.json\` (${ref.length} reference places: stars + Bib Gourmand).
> Last derived: ${new Date().toISOString().slice(0, 10)}. Re-run \`node scripts/derive_fingerprint.mjs\`.

## Purpose
This is the target the **hunter** searches against. Goal = find places that share this DNA but are
**not yet starred and priced everyday/mid** ("Michelin-adjacent value"). Bib Gourmand is the seed.

## Cuisine DNA (reference set)
${cuisineFreq.map(([c, n]) => `- ${c} (${n})`).join("\n")}

## Bib Gourmand cuisines (the value sweet-spot)
${bibCuisine.map(([c, n]) => `- ${c} (${n})`).join("\n")}

## Price/value distribution of reference set
${valueDist.map(([v, n]) => `- ${v}: ${n}`).join("\n")}

## Vibe / language signature (frequent words in inspector notes)
${noteWords.map(([w, n]) => `${w} (${n})`).join(" · ")}

## Bib Gourmand seed list (closest to home first)
${bibList || "- (none yet)"}

## Hunt guidance
Look for: chefs who trained at the starred places above; new openings echoing the Bib cuisines
(${bibCuisine.map(([c]) => c).join(", ") || "Nordic, bistro, farm-to-table"}); natural-wine bars,
neighborhood bistros, and bakeries-turned-lunch near the Bib clusters; Swedish food-press
"best value / hidden gem / neighbourhood favourite" coverage. **Reject** anything priced like the
starred splurge set. Add finds as \`confidence: candidate\`.
`;

await writeFile(OUT, md, "utf8");
console.log(`Wrote ${OUT}\n  reference=${ref.length} bib=${bib.length}`);
