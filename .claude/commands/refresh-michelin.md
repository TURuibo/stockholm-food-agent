---
description: Re-scrape Michelin Stockholm data and refresh the fingerprint
---

Delegate to the **scraper** subagent to run `scripts/michelin_scrape.mjs` and
`scripts/derive_fingerprint.mjs`. Use `--force` only if $ARGUMENTS says "force"/"hard". Report
parsed/failed counts and any notable changes vs the previous data.
