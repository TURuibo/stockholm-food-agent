---
description: Fold your feedback (board reactions + free-text + visits) into your taste profile and retune the recommender
argument-hint: [optional free-text preference, e.g. "more cozy cafés near home, less seafood"]
---

The user wants to tune the recommender to their taste. Optional inline preference: $ARGUMENTS

This is the **interactive feedback loop**. Be a thoughtful taste analyst, not a literal logger:
read the *whole* signal, confirm the ambiguous bits with a short interview, then update the model
holistically (re-derive — don't blindly accumulate). Keep it warm and concise.

## 1. Gather the signal
Read all of:
- `data/feedback.jsonl` — board reactions (`kind:"react"` with `signal` ±1 + `features`) and notes
  (`kind:"note"`). This is the new, lightweight interest signal.
- `data/visits.jsonl` — actual visits with ratings (−2…+2). Strongest signal.
- `data/suggestions.jsonl` — what's been shown (context; avoid over-reading silence as dislike).
- `data/taste_profile.md` (current model) and `data/config.json` (current weights).
- `data/places.json` — to resolve ids → features when a feedback row lacks `features`.

If `$ARGUMENTS` is non-empty, treat it as a fresh note and weave it in too.

## 2. Read the pattern (aggregate, don't overfit)
Roll up the reactions/visits by **cuisine**, **vibe**, **value_tier**, **type**, and **distance**:
- Cuisines/vibes that repeatedly get ❤️ / +ratings → candidates for `likes`; repeated 🚫 / −ratings → `dislikes`.
- Notes often carry **hard constraints** ("I can bike up to 6 km" → `max_distance_km`; "no shellfish"
  → `allergies`; "nothing fancy on weekends" → `budget_ceiling` / lower `price_ceiling`).
- Distance complaints ("too far") → raise `W.dist`. "Too expensive/fancy" → raise `W.value` or lower
  `price_ceiling`. "Show me new places / bored" → raise `EXPLORE`. "More adventurous" → raise `adventurousness`.
- One reaction is weak evidence; **a repeated pattern (≥2–3 consistent signals)** is what moves the model.

## 3. Confirm before you change (short interview)
Use **AskUserQuestion** for the genuinely ambiguous or high-impact calls only — at most 2–3 questions.
Examples worth asking: "Several seafood spots got 🚫 — avoid seafood generally, or was it those places?";
"You said ≤6 km — make that a hard cap, or just prefer closer?". Don't ask what the signal already
makes obvious; don't ask permission for tiny nudges.

## 4. Apply the update
- Edit `data/taste_profile.md` frontmatter: `likes`/`dislikes` (cuisines, vibes), `adventurousness`,
  `hard_constraints` (allergies, dietary, max_distance_km, budget_ceiling). Keep the prose section in
  sync with a one-line note on what changed and why.
- If weights clearly need it, edit `data/config.json` (`weights.dist`, `weights.value`, `explore`,
  `price_ceiling`). Be conservative — small steps.
- Leave `feedback.jsonl` as-is (append-only history; you re-derive from the whole each time, so it
  won't double-count).

## 5. Close the loop
- Show a tight **before → after diff** of what you changed and the evidence for each change.
- Rebuild the board so picks reflect the new taste: `node scripts/build_weekend.mjs` (locally this
  uses the updated profile; the daily CI build is taste-agnostic, so the board fully reflects taste
  only after a local rebuild + commit, or via the next `/map`).
- Offer `/recommend` to see it in action. If signal was thin, say so and suggest a few more reactions.
