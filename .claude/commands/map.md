---
description: Rebuild the full map of all known places
argument-hint: [optional: cafe | restaurant]
---

Run `node scripts/render_map.mjs` (add `--type cafe` or `--type restaurant` if $ARGUMENTS asks) to
rebuild `map/view.html` from all of `data/places.json`, then tell the user the file path to open.
