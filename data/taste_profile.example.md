---
# Structured part — parsed by scripts/recommend.mjs (hard filters + baseline taste_fit).
# Copy this file to data/taste_profile.md (or run /onboard) and fill it in. The real
# taste_profile.md is gitignored so your preferences stay local.
hard_constraints:
  allergies: []          # e.g. ["shellfish"] -> conflicting places are EXCLUDED
  dietary: []            # e.g. ["vegetarian"]
  max_distance_km: null  # null = no hard cap (distance still a soft penalty)
  budget_ceiling: null   # null = use config price_ceiling; or "everyday" | "mid" | "splurge"
likes:
  cuisines: []           # e.g. ["Japanese","Nordic","Farm to table"]
  vibes: []              # e.g. ["quiet","fika","neighbourhood"]
dislikes:
  cuisines: []
  vibes: []              # e.g. ["loud","natural-wine"]
vetoed: []               # never-again: matches place id, name, or cuisine substring (/veto)
adventurousness: 0.5     # 0 = stick to favorites, 1 = loves novelty
---

# Taste Profile (template)

Run `/onboard` to generate your real `data/taste_profile.md` from a short interview, or copy this
file there and edit by hand. It evolves from your visits via the `taste-analyst`.
