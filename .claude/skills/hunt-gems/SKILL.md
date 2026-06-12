---
name: hunt-gems
description: Grow the restaurant/café list by discovering Michelin-adjacent value places in Stockholm — similar quality to starred spots but cheaper. Use when the user asks to find new places, expand the list, "hunt for gems", or on the weekly auto-refresh. Adds finds as candidates with provenance.
---

# Hunt Gems (auto-growth)

Find places that share the Michelin fingerprint but are **not yet starred and priced everyday/mid**.
This is the engine that grows the knowledge base. Delegate the search to the `hunter` subagent for
clean context, or run inline. Read `data/michelin_fingerprint.md` first.

There are **two admission tracks** (record which one in `notes`):
- **Craft track** (the default) — external craft signal required: chef/baker pedigree, critical
  recognition (White Guide, serious food press), or verifiable ingredient obsession. Self-claims
  and good Google ratings alone don't qualify. Score `michelin_dna_score` ≥ 0.6.
  **Fame is NOT a disqualifier** (user-confirmed 2026-06-12): a famous classic like Vete-Katten is
  welcome as long as it clears the craft bar and the price gate. Only price excludes.
- **Neighbourhood-keeper track** (user-confirmed 2026-06-12 via Juniper Tree & Café Volta) —
  beloved everyday cafés the user actually wants in rotation: cozy/work-friendly/brunch vibe,
  family-run or independent feel, strong sustained local reputation (≳4.3 Google over hundreds of
  reviews), `everyday` price, and **close to Sundbyberg (≲2 km)**. These get an honest low
  `michelin_dna_score` (0.25–0.45) so they surface on "near home / casual / brunch / laptop"
  requests without polluting craft-driven shortlists. Proximity is the point: city-wide
  vibe-only cafés still don't qualify.

## Steps
1. **Read the fingerprint** (`data/michelin_fingerprint.md`) — target cuisines, the Bib seed list,
   vibe language, and hunt guidance.
2. **Search across angles** (use WebSearch; each angle is blind to the others, so run several):
   - Chef pedigree: chefs who trained at the starred/Bib places, now running their own spots.
   - New openings: "new restaurant Stockholm 2026", neighborhood bistros, natural-wine bars,
     bakeries/cafés for fika.
   - Food-press value: Swedish coverage of "best value / hidden gem / neighbourhood favourite".
   - Clusters: good spots near the Bib places in the seed list.
   - Neighbourhood keepers: well-loved everyday cafés in/near Sundbyberg, Solna, Råsunda, Duvbo,
     Huvudsta (see the second admission track above).
3. **Gate each candidate** (enforced again by the script): keep only if it plausibly matches the DNA
   **and** is priced `everyday`/`mid`. Reject anything fine-dining-priced — that's the whole point.
4. **Estimate fields**: cuisine[], neighborhood, value_tier, a `michelin_dna_score` (0–1) for how
   well it matches the fingerprint, vibe_tags from the write-ups, and lat/lng if you can find them
   (else null — it's still usable, just unmapped). Always capture a `source_url`.
5. **Add each:** `node scripts/add_place.mjs --json '<object>'` (auto-dedupes, rejects splurge,
   marks `confidence: candidate`, computes distance).
6. **Refresh the fingerprint:** `node scripts/derive_fingerprint.mjs`.
7. **Digest**: report "added N (list them with cuisine + area), skipped M (dup/too-pricey)". New
   places sit in the candidate pool; they only influence taste after the user visits and reports.

## Quality bar
- Real, currently-open places only — verify existence; don't hallucinate. Provenance is mandatory.
- Prefer places near Sundbyberg, but city-wide value gems are welcome.
- Cafés: treat fika spots as `type: cafe` with fika/quiet/work-friendly vibe tags.
