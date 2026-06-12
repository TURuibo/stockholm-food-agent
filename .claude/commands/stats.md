---
description: Show recommendation hit-rate (suggested → visited → liked)
---

Run `node scripts/stats.mjs` and present the result plainly. Interpret it for the user: rising
conversion/like rate means the taste model is converging; low/flat means we should retune weights in
`data/config.json` or explore more. Suggest a concrete next step if the numbers are thin.
