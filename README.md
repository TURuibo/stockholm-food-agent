# Stockholm Food Agent 🍽️

A personalized café/restaurant recommender built with Claude Code. Home base: **Sundbyberg**.
It seeds from the **Michelin Guide**, then auto-grows a list of **"Michelin-adjacent value"** places
— similar DNA to starred spots but **not yet famous and cheaper** — and learns your taste from feedback.

📱 **This weekend (phone-first):** https://turuibo.github.io/stockholm-food-agent/
— a few café + restaurant picks for the upcoming weekend, **auto-rebuilt every day** by a GitHub
Actions cron (`.github/workflows/daily-weekend.yml`), so you just open the page; nothing to trigger.
🗺️ **Full map:** https://turuibo.github.io/stockholm-food-agent/map.html (linked from the board).

Rebuild both with `node scripts/build_site.mjs` — it writes `docs/index.html` (weekend board) and
`docs/map.html` (full map), served by GitHub Pages. `data/taste_profile.md` and `suggestions.jsonl`
are gitignored and stay local, so the daily CI rebuild ranks by the deterministic core (Michelin-DNA
· value · near-home), minus places you've visited recently (`data/visits.jsonl` is tracked).

## Quick start
```
/onboard                      # 4-question taste interview (do this first)
/recommend quiet fika near home
/nearby restaurant            # closest value picks
/visited lilla-ego +2 cozy, great wine   # log feedback -> it learns
/hunt                         # discover new value gems (grows the list)
/stats                        # suggested -> visited -> liked hit-rate
/tune  more cozy cafés near home, less seafood   # fold feedback into your taste
/map                          # rebuild map/view.html and open it in a browser
```
Other commands: `/taste` (show/edit profile), `/veto <thing>` (never again),
`/refresh-michelin` (re-scrape).

**Feedback loop:** on the phone board, tap ❤️/🚫 on a pick or type a request in "💬 Tune my picks" —
it opens a prefilled GitHub Issue that `tune-feedback.yml` records to `data/feedback.jsonl`. Back home,
`/tune` reads the accumulated reactions + your visits, asks a couple of quick questions, and updates
`data/taste_profile.md` (and recommender weights) so the picks lean your way.

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
