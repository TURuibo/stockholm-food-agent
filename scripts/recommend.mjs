// Recommendation engine: candidate-gen -> hard filters -> scoring -> diversity/exploration re-rank.
// Deterministic, structured core. The `recommend` skill (Claude) layers taste nuance + nicer reasons
// on top of this output, then logs the shortlist and renders the map.
//
// Usage:
//   node scripts/recommend.mjs --query "quiet fika near home" --type cafe --max-dist 3 --n 5
//   node scripts/recommend.mjs --budget mid --explore 0.4 --out data/.last_shortlist.json
// Flags: --type, --cuisine <c>, --vibe <v>, --max-dist <km>, --budget <tier>, --near,
//        --explore <0..1>, --n <count>, --go-again (disable anti-repeat), --out <file>
// Prints the ranked shortlist as JSON to stdout (and --out if given).

import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { distanceFromHome } from "./geo.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const D = join(__dirname, "..", "data");
const VALUE_ORDER = { everyday: 0, mid: 1, splurge: 2 };

const args = process.argv.slice(2);
const opt = (k, d = null) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const has = (k) => args.includes(k);

// ---------- load ----------
async function loadJson(f, fb) { try { return JSON.parse(await readFile(join(D, f), "utf8")); } catch { return fb; } }
async function loadLines(f) {
  try { return (await readFile(join(D, f), "utf8")).split("\n").filter(Boolean).map((l) => JSON.parse(l)); }
  catch { return []; }
}
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

const config = await loadJson("config.json", { weights: {}, value_score: {}, explore: 0.2, price_ceiling: "mid", anti_repeat_days: 21, shortlist_size: 6 });
const places = await loadJson("places.json", []);
const tasteMd = await readFile(join(D, "taste_profile.md"), "utf8").catch(() => "");
const taste = parseFrontmatter(tasteMd);
const suggestions = await loadLines("suggestions.jsonl");
const visits = await loadLines("visits.jsonl");

// ---------- params ----------
const W = config.weights;
const VS = config.value_score;
const lc = (s) => (s || "").toLowerCase();
const wantType = opt("--type");
const wantCuisine = lc(opt("--cuisine"));
const wantVibe = lc(opt("--vibe"));
const N = parseInt(opt("--n", config.shortlist_size), 10);
const explore = parseFloat(opt("--explore", String(config.explore)));
const goAgain = has("--go-again");
const near = has("--near");
const maxDist = opt("--max-dist") != null ? parseFloat(opt("--max-dist"))
  : (taste.hard_constraints?.max_distance_km ?? null);
const budget = opt("--budget") || taste.hard_constraints?.budget_ceiling || config.price_ceiling;
const likeCuis = (taste.likes?.cuisines || []).map(lc);
const dislikeCuis = (taste.dislikes?.cuisines || []).map(lc);
const likeVibes = (taste.likes?.vibes || []).map(lc);
const dislikeVibes = (taste.dislikes?.vibes || []).map(lc);
const vetoed = (taste.vetoed || []).map(lc);
const adventurousness = taste.adventurousness ?? 0.5;
const isVetoed = (p) => vetoed.some((v) =>
  lc(p.id).includes(v) || lc(p.name).includes(v) || (p.cuisine || []).some((c) => lc(c).includes(v)));

// ---------- anti-repeat set ----------
const cutoff = Date.now() - (config.anti_repeat_days * 86400_000);
const recent = new Set();
if (!goAgain) {
  for (const s of suggestions) if (Date.parse(s.ts) >= cutoff) (s.place_ids || []).forEach((id) => recent.add(id));
  for (const v of visits) if (Date.parse(v.ts) >= cutoff) recent.add(v.id);
}

// ---------- pipeline ----------
const reasons = [];
function scoreOf(p) {
  const cuis = (p.cuisine || []).map(lc);
  let taste_fit = 0.5;
  if (cuis.some((c) => likeCuis.includes(c))) taste_fit += 0.4;
  if (cuis.some((c) => dislikeCuis.includes(c))) taste_fit -= 0.5;
  if (wantCuisine && cuis.some((c) => c.includes(wantCuisine))) taste_fit += 0.3;
  taste_fit = Math.max(0, Math.min(1, taste_fit));

  const vibes = (p.vibe_tags || []).map(lc);
  let vibe_fit = 0.5;
  if (vibes.some((v) => likeVibes.includes(v))) vibe_fit += 0.3;
  if (vibes.some((v) => dislikeVibes.includes(v))) vibe_fit -= 0.4;
  if (wantVibe && vibes.some((v) => v.includes(wantVibe))) vibe_fit += 0.3;
  vibe_fit = Math.max(0, Math.min(1, vibe_fit));

  const dna = p.michelin_dna_score ?? 0.5;
  const value = VS[p.value_tier] ?? 0.5;
  const distpen = Math.min(1, (p.distance_km ?? 5) / 10);
  const score = (W.taste ?? 1) * taste_fit + (W.dna ?? 0.7) * dna
    + (W.vibe ?? 0.6) * vibe_fit + (W.value ?? 0.8) * value - (W.dist ?? 0.3) * distpen;
  return { score: Math.round(score * 1000) / 1000, taste_fit, vibe_fit, dna, value, distpen };
}

function autoReason(p, s) {
  const bits = [];
  if (p.michelin === "bib") bits.push("Bib-value");
  else if (p.michelin === "none" && p.michelin_dna_score >= 0.6) bits.push("under-the-radar");
  else if (p.michelin !== "none") bits.push(p.michelin.replace("-", " "));
  bits.push((p.cuisine || [])[0] || "eatery");
  bits.push(`${p.distance_km}km`);
  bits.push(p.value_tier);
  if (s.taste_fit > 0.7) bits.push("fits your taste");
  return bits.join(" · ");
}

// Stage 1: candidate generation
let cands = places.filter((p) => p.lat != null);
if (wantType) cands = cands.filter((p) => p.type === wantType);
if (wantCuisine) cands = cands.filter((p) => (p.cuisine || []).some((c) => lc(c).includes(wantCuisine)));

// Stage 2: hard filters (a gate)
const excluded = { budget: 0, distance: 0, anti_repeat: 0, vetoed: 0 };
cands = cands.filter((p) => {
  if (isVetoed(p)) { excluded.vetoed++; return false; }
  if (VALUE_ORDER[p.value_tier] > VALUE_ORDER[budget]) { excluded.budget++; return false; }
  if (maxDist != null && (p.distance_km ?? 999) > maxDist) { excluded.distance++; return false; }
  if (recent.has(p.id)) { excluded.anti_repeat++; return false; }
  return true;
});

// Stage 3: scoring
let scored = cands.map((p) => ({ p, s: scoreOf(p) })).sort((a, b) => b.s.score - a.s.score);

// Stage 4: diversity + exploration re-rank
const out = []; const cuisineCount = {};
for (const { p, s } of scored) {
  const c0 = lc((p.cuisine || [])[0] || "");
  if ((cuisineCount[c0] || 0) >= 2) continue;        // diversity: max 2 per primary cuisine
  cuisineCount[c0] = (cuisineCount[c0] || 0) + 1;
  out.push({ ...p, score: s.score, _s: s, reason: autoReason(p, s) });
  if (out.length >= N) break;
}
// exploration: chance to inject a novel pick from the tail (new cuisine / candidate tier)
const effExplore = Math.min(0.9, explore + 0.3 * (adventurousness - 0.5));
if (scored.length > out.length && Math.random() < effExplore) {
  const chosenIds = new Set(out.map((o) => o.id));
  const chosenCuis = new Set(out.flatMap((o) => (o.cuisine || []).map(lc)));
  const novel = scored.map((x) => x).find(({ p }) =>
    !chosenIds.has(p.id) && (!(p.cuisine || []).some((c) => chosenCuis.has(lc(c))) || p.confidence === "candidate"));
  if (novel) {
    const p = novel.p;
    out.pop(); // make room
    out.push({ ...p, score: novel.s.score, _s: novel.s, explore: true,
      reason: "🧭 worth a try — " + autoReason(p, novel.s) });
  }
}

out.forEach((o, i) => { o.rank = i + 1; });

const result = {
  query: opt("--query", ""),
  params: { type: wantType, budget, maxDist, near, explore: effExplore, n: N, goAgain },
  excluded,
  candidates: cands.length,
  shortlist: out,
};

if (opt("--out")) await writeFile(opt("--out"), JSON.stringify(out, null, 2) + "\n", "utf8");
console.log(JSON.stringify(result, null, 2));
