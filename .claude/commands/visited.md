---
description: Log a visit and learn from it (e.g. "lilla-ego +2 loved the wine, a bit noisy")
argument-hint: <place> <rating -2..2> <comment>
---

The user is reporting back on a place: $ARGUMENTS

1. Identify the place id from `data/places.json` (match name/slug; if ambiguous, ask).
2. Parse a rating (−2…+2) and free-text comment and an occasion if mentioned.
3. Log it: `node scripts/log_visit.mjs --id <id> --rating <r> --occasion <o> --comment "<text>"`.
4. Acknowledge warmly and note what you learned (cuisine/vibe signal).
5. If there are several new visits since the profile was last updated (or the comment is strongly
   directional), delegate to the **taste-analyst** subagent to re-derive `data/taste_profile.md`.
