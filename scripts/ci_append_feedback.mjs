// CI-only: parse a "feedback" GitHub Issue body and append one line to data/feedback.jsonl.
// Runs in the tune-feedback Action (Node on the runner), NOT during normal local use.
//
// Two kinds of feedback come from the "This weekend" board:
//   { "kind":"react", "id":"<place-id>", "signal": 1 | -1, "note":"optional" }
//       a lightweight interest reaction (❤️ more like this / 🚫 not for me) — you haven't
//       necessarily been there; it's a signal about the place's *features* (cuisine/vibe/value/dist).
//   { "kind":"note", "note":"free text about what you want" }
//       an explicit ask in your own words (e.g. "more cozy cafés near home, less seafood").
//
// We re-stamp ts server-side and, for reactions, snapshot the place's features from places.json so
// the /tune step (or taste-analyst) can re-derive taste even if places.json later changes.
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

const clip = (s, n = 600) => (typeof s === "string" ? s.slice(0, n) : "");
const kind = payload.kind === "note" ? "note" : "react";

const rec = { ts: new Date().toISOString(), kind, source: "weekend" };

if (kind === "note") {
  const note = clip(payload.note, 600).trim();
  if (!note) { console.error("Note feedback missing 'note' text."); process.exit(1); }
  rec.note = note;
} else {
  const id = (payload.id || "").trim();
  if (!id) { console.error("Reaction feedback missing required field: id"); process.exit(1); }
  let signal = parseInt(payload.signal, 10);
  if (signal !== 1 && signal !== -1) { console.error("signal must be 1 or -1"); process.exit(1); }
  rec.id = id;
  rec.signal = signal;
  if (payload.note) rec.note = clip(payload.note, 300).trim();
  // snapshot the place's features so taste can be re-derived later
  rec.name = payload.name || id;
  try {
    const places = JSON.parse(await readFile(join(D, "places.json"), "utf8"));
    const place = places.find((p) => p.id === id);
    if (place) {
      rec.name = place.name;
      rec.features = {
        type: place.type ?? null,
        cuisine: place.cuisine ?? [],
        vibe_tags: place.vibe_tags ?? [],
        value_tier: place.value_tier ?? null,
        michelin: place.michelin ?? null,
        distance_km: place.distance_km ?? null,
      };
    } else {
      console.log(`[warn] id "${id}" not found in places.json — logging without features.`);
    }
  } catch { /* places.json optional for append */ }
}

await appendFile(join(D, "feedback.jsonl"), JSON.stringify(rec) + "\n", "utf8");
console.log(`Appended feedback: ${kind === "note" ? "note — " + rec.note.slice(0, 60) : rec.name + " (" + (rec.signal > 0 ? "+more" : "-less") + ")"}`);
