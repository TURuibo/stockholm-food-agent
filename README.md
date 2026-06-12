# Stockholm Food Agent 🍽️

A personalized café/restaurant recommender built with Claude Code. Home base: **Sundbyberg**.
It seeds from the **Michelin Guide**, then auto-grows a list of **"Michelin-adjacent value"** places
— similar DNA to starred spots but **not yet famous and cheaper** — and learns your taste from feedback.

🗺️ **Live map:** https://turuibo.github.io/stockholm-food-agent/
(rebuild with `node scripts/build_site.mjs`, which writes `docs/index.html` served by GitHub Pages.
Personal files — `data/taste_profile.md`, `visits.jsonl`, `suggestions.jsonl` — are gitignored and stay local.)

## Quick start
```
/onboard                      # 4-question taste interview (do this first)
/recommend quiet fika near home
/nearby restaurant            # closest value picks
/visited lilla-ego +2 cozy, great wine   # log feedback -> it learns
/hunt                         # discover new value gems (grows the list)
/stats                        # suggested -> visited -> liked hit-rate
/map                          # rebuild map/view.html and open it in a browser
```
Other commands: `/taste` (show/edit profile), `/veto <thing>` (never again),
`/refresh-michelin` (re-scrape).

## How it recommends (content-based pipeline)
1. **Candidate generation** from `data/places.json`.
2. **Hard filters** (gate): allergies/dietary, budget ceiling, max distance, anti-repeat, vetoes.
3. **Scoring**: `taste-fit · Michelin-DNA · vibe · value(price) − distance`. Weights in
   `data/config.json` (and documented in `CLAUDE.md`) — edit to retune.
4. **Re-rank** for diversity + **exploration** (a chance to surface a novel pick — this grows your palate).

A 3-star splurge ranks *low* by default — the point is the cheaper cousins. Bib Gourmand is the seed.

## Data (all human-readable, hand-editable)
- `data/places.json` — the growing list (43 Michelin Stockholm places seeded; hunter adds candidates).
- `data/taste_profile.md` — your taste (YAML frontmatter = machine-read; prose = nuance).
- `data/michelin_fingerprint.md` — "what good looks like," derived from stars + Bib.
- `data/visits.jsonl` / `data/suggestions.jsonl` — feedback + implicit signals.

## Scripts (Node, zero deps)
`michelin_scrape.mjs` · `derive_fingerprint.mjs` · `recommend.mjs` · `render_map.mjs` ·
`add_place.mjs` · `log_visit.mjs` · `log_suggestion.mjs` · `stats.mjs` · `weekly_refresh.mjs`

## Claude Code features used
Skills (`recommend`, `hunt-gems`, `onboard`) · subagents (`scraper`, `hunter`, `ranker`,
`taste-analyst`) · slash commands · hooks (SessionStart status, post-write JSON validation) ·
`CLAUDE.md` project memory · permissions · WebSearch. A weekly cron (refresh + hunt) is optional.

## Compliance
All Michelin fetching goes through `scripts/lib/fetch_polite.mjs` (browser UA, 1.5s delay, 7-day
cache) and uses only the sitemap + canonical detail pages — never robots-disallowed query URLs.
