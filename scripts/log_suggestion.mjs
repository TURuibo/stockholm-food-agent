// Append a shown shortlist to data/suggestions.jsonl (implicit signal + anti-repeat source).
// Usage: node scripts/log_suggestion.mjs --in data/.last_shortlist.json --query "dinner near home"
import { appendFile, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const D = join(__dirname, "..", "data");
const args = process.argv.slice(2);
const opt = (k, d = null) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };

const inFile = opt("--in", join(D, ".last_shortlist.json"));
const shortlist = JSON.parse(await readFile(inFile, "utf8"));
const rec = {
  ts: new Date().toISOString(),
  query: opt("--query", ""),
  place_ids: shortlist.map((p) => p.id),
};
await appendFile(join(D, "suggestions.jsonl"), JSON.stringify(rec) + "\n", "utf8");
console.log(`Logged suggestion of ${rec.place_ids.length} places.`);
