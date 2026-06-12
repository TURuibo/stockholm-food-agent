---
name: hunt-gems
description: Grow the restaurant/café list by discovering Michelin-adjacent value places in Stockholm — similar quality to starred spots but not yet famous and cheaper. Use when the user asks to find new places, expand the list, "hunt for gems", or on the weekly auto-refresh. Adds finds as candidates with provenance.
---

# Hunt Gems (auto-growth)

Find places that share the Michelin fingerprint but are **not yet starred and priced everyday/mid**.
This is the engine that grows the knowledge base. Delegate the search to the `hunter` subagent for
clean context, or run inline. Read `data/michelin_fingerprint.md` first.

## Steps
1. **Read the fingerprint** (`data/michelin_fingerprint.md`) — target cuisines, the Bib seed list,
   vibe language, and hunt guidance.
2. **Search across angles** (use WebSearch; each angle is blind to the others, so run several):
   - Chef pedigree: chefs who trained at the starred/Bib places, now running their own spots.
   - New openings: "new restaurant Stockholm 2026", neighborhood bistros, natural-wine bars,
     bakeries/cafés for fika.
   - Food-press value: Swedish coverage of "best value / hidden gem / neighbourhood favourite".
   - Clusters: good spots near the Bib places in the seed list.
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
