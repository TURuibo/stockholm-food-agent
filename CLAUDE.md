# Stockholm Food Agent

A personalized café/restaurant recommender for **Stockholm**, home base **Sundbyberg**.
Seeds from the Michelin Guide, then auto-grows a list of **Michelin-adjacent value** places —
similar DNA to starred spots but **not yet famous and cheaper**. Learns the user's taste from
feedback. This file is loaded every session; read it before acting.

## Home base
- Sundbyberg, Stockholm. Coordinates: **59.3614, 17.9710** (`HOME` in `scripts/geo.mjs`).
- All distances are haversine km from this point (a tie-breaker, not a hard filter unless asked).

## Core philosophy: "Michelin-adjacent value"
The user cannot eat fine-dining all the time. The agent's job is to **learn what makes Michelin
places good** (`data/michelin_fingerprint.md`) and then **recommend the cheaper, not-yet-starred
cousins**. A 3-star palace is "best" but ranks **low** by default because it violates "not as
expensive." **Bib Gourmand** (Michelin's own good-value badge) is the gold seed.

**Second track — neighbourhood keepers** (user-confirmed 2026-06-12): cozy, well-loved everyday
cafés close to Sundbyberg (≲2 km) also belong on the list even without craft pedigree — e.g.
Juniper Tree (Råsunda), Café Volta (Sundbyberg). They carry an honest low `michelin_dna_score`
(0.25–0.45) and cozy/work-friendly/brunch vibe tags, so they win on "near home / casual / brunch"
asks but never displace craft picks. Full criteria: `.claude/skills/hunt-gems/SKILL.md`.

## Recommendation engine (content-based; one user, no collaborative filtering)
Pipeline, in order — see `.claude/skills/recommend/SKILL.md` for the full spec:
1. **Candidate generation** — pull from `data/places.json` by intent (type, area, cuisine).
2. **Hard filters (a GATE, not scoring)** — exclude on: allergies/dietary, max distance, budget
   ceiling, open-now (if asked), anti-repeat (recently suggested/visited unless "go again").
   Hard constraints EXCLUDE; never down-weight an allergen.
3. **Scoring** — `score = W.taste*taste_fit + W.dna*michelin_dna + W.vibe*vibe_fit
   + W.value*value_factor(price) − W.dist*distance_penalty`.
4. **Re-rank** — diversity (no 5 clones) + **exploration** (`EXPLORE` chance of a novel pick).

### Tunable weights (edit these to retune the recommender)
```
W.taste = 1.0     # taste-fit first
W.dna   = 0.7     # resemblance to Michelin fingerprint
W.vibe  = 0.6     # occasion / atmosphere match
W.value = 0.8     # rewards cheaper-than-starred; splurge sinks
W.dist  = 0.3     # distance-from-Sundbyberg penalty
EXPLORE = 0.2     # prob. of surfacing a novel/serendipitous pick (grows the user's palate)
PRICE_CEILING = mid   # default max value_tier; "splurge" only when explicitly asked
```

## Data files (all human-readable, hand-editable)
- `data/places.json` — the growing list. Fields: id, name, type(restaurant|cafe), cuisine[],
  michelin, price, value_tier(everyday|mid|splurge), lat, lng, address, neighborhood, distance_km,
  vibe_tags[], michelin_dna_score(0–1), confidence(verified|candidate), source[], source_url,
  last_verified, notes. Provenance/merit trio (so a human knows why each place is here):
  **why_listed** (its role in the value brief), **highlights[]** (the good parts, hand-distilled),
  **added_via** (the pathway it entered: Michelin scrape / web seed / hunter search). why_listed and
  added_via are formulaic — `scripts/annotate_provenance.mjs` re-derives them from
  michelin/value_tier/source and is safe to re-run after the scraper or hunter adds rows.
- `data/taste_profile.md` — the user's evolving taste vector + hard constraints. Source of truth
  for `taste_fit`. Re-derived from visits by the `taste-analyst` agent; also hand-editable.
- `data/michelin_fingerprint.md` — "what good looks like," distilled from starred + Bib places.
- `data/visits.jsonl` — append-only: where the user went, rating (−2…+2), context, comment.
- `data/suggestions.jsonl` — append-only: every shortlist shown (implicit signal + anti-repeat).

## Conventions
- **Always log a visit** to `visits.jsonl` after the user reports back on a place; then re-derive
  taste if enough new signal.
- **Always log the shortlist** to `suggestions.jsonl` whenever you recommend.
- New places from the hunter enter as `confidence: candidate` and only affect taste after a real visit.
- Be polite to Michelin: all fetching goes through `scripts/lib/fetch_polite.mjs` (browser UA,
  delay, cache). Never hit disallowed query-param URLs (sort/search/showMap); use the sitemap.
- After changing `places.json`, the map (`map/view.html`) is stale — re-render before showing it.
- **Published site** (`scripts/build_site.mjs` → GitHub Pages): `docs/index.html` is the phone-first
  **"This weekend" board** (a few café + restaurant picks, built by `scripts/build_weekend.mjs`);
  `docs/map.html` is the full interactive map. They cross-link. `.github/workflows/daily-weekend.yml`
  rebuilds and commits the site **every day** (cron), so the board stays fresh with no manual trigger.
  In CI the picks come from the deterministic core only (taste profile is gitignored/absent).

## Commands (in `.claude/commands/`)
`/onboard` seed taste · `/recommend [ctx]` core · `/nearby` walking distance · `/visited` log+learn ·
`/veto` never-again · `/taste` show/edit profile · `/stats` hit-rate · `/hunt` grow list ·
`/refresh-michelin` re-scrape · `/map` rebuild view.html.
