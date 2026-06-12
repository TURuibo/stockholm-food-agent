// Append a visit to data/visits.jsonl (explicit feedback signal).
// Usage: node scripts/log_visit.mjs --id lilla-ego --rating 2 --occasion dinner --comment "loved it, a bit noisy"
import { appendFile, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const D = join(__dirname, "..", "data");
const args = process.argv.slice(2);
const opt = (k, d = null) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };

const id = opt("--id");
if (!id) { console.error("need --id"); process.exit(1); }
const places = JSON.parse(await readFile(join(D, "places.json"), "utf8"));
const place = places.find((p) => p.id === id);

const rec = {
  ts: new Date().toISOString(),
  id,
  name: place?.name || id,
  rating: opt("--rating") != null ? parseInt(opt("--rating"), 10) : null, // -2..+2
  occasion: opt("--occasion", null),
  comment: opt("--comment", ""),
};
await appendFile(join(D, "visits.jsonl"), JSON.stringify(rec) + "\n", "utf8");
console.log(`Logged visit: ${rec.name} (rating ${rec.rating ?? "—"}). ${place ? "" : "[warning: id not in places.json]"}`);
