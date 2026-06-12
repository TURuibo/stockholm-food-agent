---
name: onboard
description: Cold-start taste setup. Use the first time the user wants recommendations, or when they ask to set up / reset / redo their taste profile. Runs a short interview and writes data/taste_profile.md so the very first recommendation is informed, not random.
---

# Onboard (cold start)

Seed `data/taste_profile.md` via a short interview so recommendations start informed.

## Steps
1. **Interview** using the AskUserQuestion tool — keep it to ~4 questions, multi-select where natural:
   - Favorite cuisines (offer Nordic, Japanese, French, Italian, Middle Eastern, farm-to-table,
     seafood, Modern/Creative — multi-select) and any hard dislikes.
   - Vibe/occasions they care about (quiet fika, lively dinner, date-night, work-friendly café,
     natural-wine bar, neighbourhood spot).
   - Budget comfort for everyday outings (everyday / mid / occasional splurge) and how far they'll
     travel from Sundbyberg (walking ~3km / short transit ~6km / anywhere in Stockholm).
   - Allergies or dietary needs (free-text / none), and how adventurous they are (stick to favorites
     ↔ love trying new things).
2. **Write `data/taste_profile.md`**: fill the YAML frontmatter (`hard_constraints`, `likes`,
   `dislikes`, `adventurousness`) from the answers — this is what `recommend.mjs` reads — and write a
   short prose **Summary** capturing the person in 2–3 sentences. Set Confidence to "Medium — from
   onboarding".
3. **Confirm** the captured profile back to the user in a couple of lines, and suggest a first
   `/recommend` (e.g. matched to something they said). Mention they can edit the file anytime or just
   give feedback after visits to refine it.

## Notes
- Don't over-ask; infer sensible defaults and state them. The profile is meant to evolve from real
  visits via the `taste-analyst`, so onboarding only needs to get in the right ballpark.
- Keep frontmatter machine-readable (arrays like `["Japanese","Nordic"]`, scalars for the rest).
