---
name: recommend
description: Recommend Stockholm cafés/restaurants for the user (home base Sundbyberg). Use whenever they ask where to eat, drink coffee, have fika, find a place for a date/lunch/dinner, "somewhere near me", or similar. Runs the content-based recommender, explains why each pick fits, logs the shortlist, and renders the map.
---

# Recommend

Run the recommendation pipeline and present results. Philosophy: **Michelin-adjacent value** — favor
cheaper, not-yet-starred places that share Michelin DNA. Read `CLAUDE.md` for weights/conventions.

## Steps
1. **Parse the request into flags.** Infer from natural language:
   - type: `--type cafe` (coffee/fika) or `--type restaurant` (dinner/lunch/date). Omit if unclear.
   - proximity: "near home" / "walking" / "in Sundbyberg" → `--max-dist 3`; "not too far" → `--max-dist 6`.
   - budget: "cheap/affordable" → `--budget everyday`; "treat/splurge/special" → `--budget splurge`.
   - cuisine/vibe: `--cuisine <c>`, `--vibe <v>` when stated (quiet, lively, natural-wine, date…).
   - novelty: "surprise me / something new / adventurous" → `--explore 0.6`.
   - "go again / a favorite" → `--go-again` (disables anti-repeat).
   - Always pass `--query "<their words>"` and `--out data/.last_shortlist.json`.
2. **Run it:** `node scripts/recommend.mjs <flags>`. Note `excluded` counts and `candidates`.
3. **Layer taste nuance.** Read `data/taste_profile.md` (prose + frontmatter). Apply things the
   script can't: **hard-exclude any pick that conflicts with allergies/dietary** in the profile;
   gently reorder or re-word reasons to reflect learned patterns. Keep it honest — don't invent facts.
4. **Log the shortlist:** `node scripts/log_suggestion.mjs --in data/.last_shortlist.json --query "<words>"`.
5. **Render the map:** `node scripts/render_map.mjs --in data/.last_shortlist.json --title "<short title>"`.
6. **Present** a tight ranked list: each line = name, cuisine, value tier, distance, and a one-line
   **why it fits you**. Flag the 🧭 explore pick if present. Add one transparency line, e.g.
   "(filtered out 15 splurge + 17 too-far places)". End by pointing to `map/view.html` and inviting
   feedback: "Been to one? Tell me how it went and I'll learn from it."

## Notes
- If `candidates` is 0, loosen the gate (raise `--max-dist` or `--budget`) and say what you relaxed.
- Never recommend a `splurge` place unless the user explicitly asked for a treat.
- For deeper taste reasoning on a big/important request, delegate scoring to the `ranker` subagent.
