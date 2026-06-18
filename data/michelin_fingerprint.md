# Michelin Fingerprint — "what good looks like"

> Auto-derived from `data/places.json` (20 reference places: stars + Bib Gourmand).
> Last derived: 2026-06-15. Re-run `node scripts/derive_fingerprint.mjs`.

## Purpose
This is the target the **hunter** searches against. Goal = find places that share this DNA but are
**not yet starred and priced everyday/mid** ("Michelin-adjacent value"). Bib Gourmand is the seed.

## Cuisine DNA (reference set)
- Modern Cuisine (8)
- Creative (4)
- Japanese (2)
- Traditional Cuisine (1)
- French (1)
- Farm to table (1)
- Grills (1)
- Seafood (1)
- Swedish (1)

## Bib Gourmand cuisines (the value sweet-spot)
- Modern Cuisine (4)
- Traditional Cuisine (1)
- French (1)
- Farm to table (1)
- Swedish (1)

## Price/value distribution of reference set
- splurge: 12
- mid: 5
- everyday: 3

## Vibe / language signature (frequent words in inspector notes)
restaurant (10) · neighbourhood (5) · back (4) · lively (4) · counter (4) · kitchen (4) · cooking (3) · pared (3) · feel (3) · place (3) · japanese (3) · high (3) · chef (3) · open (3) · chefs (3) · swedish (3) · world (2) · experiences (2) · through (2) · buzzy (2) · seat (2) · look (2) · classic (2) · level (2) · spot (2)

## Bib Gourmand seed list (closest to home first)
- **Lilla Ego** (Modern Cuisine) — 4.7km, mid
- **Rolfs Kök** (Traditional Cuisine) — 5.5km, mid
- **Babette** (Modern Cuisine) — 5.5km, everyday
- **Allegrine** (French) — 5.7km, everyday
- **ÄRLA** (Farm to table) — 5.9km, mid
- **Matbaren** (Modern Cuisine) — 7km, mid
- **Triton** (Modern Cuisine) — 8km, mid
- **Bar Agrikultur** (Swedish) — 8.3km, everyday

## Hunt guidance
Look for: chefs who trained at the starred places above; new openings echoing the Bib cuisines
(Modern Cuisine, Traditional Cuisine, French, Farm to table, Swedish); natural-wine bars,
neighborhood bistros, and bakeries-turned-lunch near the Bib clusters; Swedish food-press
"best value / hidden gem / neighbourhood favourite" coverage. **Reject** anything priced like the
starred splurge set. Add finds as `confidence: candidate`.
