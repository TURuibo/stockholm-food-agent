// CI-only: parse a "visit" GitHub Issue body and append one line to data/visits.jsonl.
// Runs in the log-visit Action (Node on the runner), NOT during normal local use.
//
// The issue body must contain a fenced ```json ... ``` block with at least { id, rating }.
// We re-stamp ts server-side and look up the canonical name from places.json, so the
// resulting record matches what scripts/log_visit.mjs writes (plus a few extra fields).
import { appendFile, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const D = join(__dirname, "..", "data");

const body = process.env.BODY || "";
const m = body.match(/```json\s*([\s\S]*?)```/i) || body.match(/\{[\s\S]*\}/);
if (!m) { console.error("No JSON payload found in issue body."); process.exit(1); }

let payload;
try { payload = JSON.parse(m[1] ?? m[0]); }
catch (e) { console.error("Payload is not valid JSON:", e.message); process.exit(1); }

const id = (payload.id || "").trim();
if (!id) { console.error("Payload missing required field: id"); process.exit(1); }

let rating = payload.rating;
rating = rating === null || rating === undefined || rating === "" ? null : parseInt(rating, 10);
if (rating !== null && (Number.isNaN(rating) || rating < -2 || rating > 2)) {
  console.error("rating must be an integer in -2..+2 (or null)"); process.exit(1);
}

let name = payload.name || id;
try {
  const places = JSON.parse(await readFile(join(D, "places.json"), "utf8"));
  const place = places.find((p) => p.id === id);
  if (place) name = place.name;
  else console.log(`[warn] id "${id}" not found in places.json — logging anyway.`);
} catch { /* places.json optional for append */ }

const clip = (s, n = 600) => (typeof s === "string" ? s.slice(0, n) : "");
const rec = {
  ts: new Date().toISOString(),          // authoritative server-side timestamp
  id,
  name,
  rating,
  occasion: payload.occasion ? clip(payload.occasion, 80) : null,
  comment: clip(payload.comment, 600),
  would_return: typeof payload.would_return === "boolean" ? payload.would_return : null,
  companions: payload.companions ? clip(payload.companions, 80) : null,
  source: "map",
};

await appendFile(join(D, "visits.jsonl"), JSON.stringify(rec) + "\n", "utf8");
console.log(`Appended visit: ${rec.name} (rating ${rec.rating ?? "—"})`);
