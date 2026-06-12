// SessionStart hook: print a one-glance status of the food agent.
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const D = join(dirname(fileURLToPath(import.meta.url)), "..", "data");
const j = async (f, fb) => { try { return JSON.parse(await readFile(join(D, f), "utf8")); } catch { return fb; } };
const lines = async (f) => { try { return (await readFile(join(D, f), "utf8")).split("\n").filter(Boolean); } catch { return []; } };

const places = await j("places.json", []);
const bib = places.filter((p) => p.michelin === "bib").length;
const stars = places.filter((p) => /star/.test(p.michelin || "")).length;
const cand = places.filter((p) => p.confidence === "candidate").length;
const cafes = places.filter((p) => p.type === "cafe").length;
const visits = (await lines("visits.jsonl")).length;
const onboarded = (await readFile(join(D, "taste_profile.md"), "utf8").catch(() => "")).includes("Not yet onboarded") ? "no" : "yes";

console.log(`🍽️  Stockholm Food Agent — ${places.length} places (${stars} star, ${bib} Bib, ${cand} candidate, ${cafes} café) · ${visits} visits logged · onboarded: ${onboarded}`);
console.log(`   Try: /onboard · /recommend <mood> · /nearby · /hunt · /stats · /visited <place> <rating> <note>`);
