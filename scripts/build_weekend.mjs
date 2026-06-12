// Build the phone-first "This weekend" board -> docs/index.html (the published landing page).
//
// Runs the deterministic recommender (scripts/recommend.mjs) twice — a few cafés and a few
// restaurants — and renders a compact, mobile-first card list themed for the upcoming weekend.
// Meant to be regenerated automatically every day by .github/workflows/daily-weekend.yml, so the
// page the user opens on their phone is always fresh without anyone triggering anything by hand.
//
// In CI the private taste profile + suggestions log are gitignored and absent, so the board is
// driven by the deterministic core (Michelin-DNA · value · near-home), minus places visited in the
// last few weeks (data/visits.jsonl is tracked). Locally it also picks up your taste profile.
//
// Usage:
//   node scripts/build_weekend.mjs                 # write docs/index.html
//   node scripts/build_weekend.mjs --out some.html # write elsewhere
//   node scripts/build_weekend.mjs --cafes 3 --restaurants 3

import { spawnSync } from "node:child_process";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { HOME } from "./geo.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const TEMPLATE = join(root, "map", "weekend_template.html");

const args = process.argv.slice(2);
const opt = (k, d = null) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const nCafes = parseInt(opt("--cafes", "3"), 10);
const nRest = parseInt(opt("--restaurants", "3"), 10);
const outFile = opt("--out", join(root, "docs", "index.html"));

// Run the recommender for one type and return its ranked shortlist (array of place objects).
function recommend(type, n) {
  const r = spawnSync(process.execPath,
    [join(here, "recommend.mjs"), "--type", type, "--n", String(n)],
    { encoding: "utf8" });
  if (r.status !== 0) {
    console.error(`recommend.mjs --type ${type} failed:\n${r.stderr || ""}`);
    return [];
  }
  try { return JSON.parse(r.stdout).shortlist || []; }
  catch (e) { console.error(`Could not parse recommend output for ${type}: ${e.message}`); return []; }
}

// ---- the upcoming weekend's Saturday + Sunday (or the current one if it's already Sat/Sun) ----
function weekendDates(now) {
  const dow = now.getDay();                 // 0 Sun … 6 Sat
  const sat = new Date(now);
  if (dow === 0) sat.setDate(now.getDate() - 1);          // Sunday -> Saturday was yesterday
  else sat.setDate(now.getDate() + ((6 - dow + 7) % 7));  // otherwise the next Saturday (0 if today is Sat)
  const sun = new Date(sat);
  sun.setDate(sat.getDate() + 1);
  const iso = (d) => d.toISOString().slice(0, 10);
  return { sat: iso(sat), sun: iso(sun) };
}

const now = new Date();
const cafes = recommend("cafe", nCafes).map((p) => ({ ...p, _kind: "cafe" }));
const restaurants = recommend("restaurant", nRest).map((p) => ({ ...p, _kind: "restaurant" }));
// Restaurants first (the weekend "occasion"), then cafés (fika / brunch). Renumber for display.
const picks = [...restaurants, ...cafes].map((p, i) => ({ ...p, rank: i + 1 }));

const data = {
  generated: now.toISOString(),
  weekend: weekendDates(now),
  home: HOME,
  map_href: "map.html",
  picks,
};

const template = await readFile(TEMPLATE, "utf8");
const inject = `<script>window.WEEKEND_DATA = ${JSON.stringify(data)};</script>`;
const html = template.replace("<!--DATA-->", inject);

await mkdir(dirname(outFile), { recursive: true });
await writeFile(outFile, html, "utf8");
console.log(`Wrote ${outFile} — ${picks.length} weekend picks (${restaurants.length} restaurants, ${cafes.length} cafés) for ${data.weekend.sat}–${data.weekend.sun}.`);
