// Evaluation: suggested -> visited -> liked hit-rate, from suggestions.jsonl + visits.jsonl.
// Usage: node scripts/stats.mjs
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const D = join(__dirname, "..", "data");
async function lines(f) {
  try { return (await readFile(join(D, f), "utf8")).split("\n").filter(Boolean).map((l) => JSON.parse(l)); }
  catch { return []; }
}
const suggestions = await lines("suggestions.jsonl");
const visits = await lines("visits.jsonl");

const visitById = new Map();
for (const v of visits) {
  const t = Date.parse(v.ts);
  const prev = visitById.get(v.id);
  if (!prev || t > prev.t) visitById.set(v.id, { t, rating: v.rating });
}

let suggested = 0, visited = 0, liked = 0;
for (const s of suggestions) {
  const st = Date.parse(s.ts);
  for (const id of s.place_ids || []) {
    suggested++;
    const v = visitById.get(id);
    if (v && v.t >= st) { visited++; if ((v.rating ?? 0) > 0) liked++; }
  }
}
const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);
console.log("=== Recommendation evaluation ===");
console.log(`Shortlists shown : ${suggestions.length}`);
console.log(`Total picks shown: ${suggested}`);
console.log(`Visited after rec: ${visited} (${pct(visited, suggested)}% conversion)`);
console.log(`Liked (rating>0) : ${liked} (${pct(liked, visited)}% of visited)`);
console.log(`Total visits log : ${visits.length}`);
if (suggestions.length === 0) console.log("\n(No data yet — recommend + log some visits to populate.)");
