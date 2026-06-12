---
description: Recommend cafés/restaurants for a request (e.g. "quiet fika near home", "date night dinner")
argument-hint: [what you're in the mood for]
---

Use the **recommend** skill to suggest places for: $ARGUMENTS

Follow the skill: parse the request into flags, run `scripts/recommend.mjs`, layer taste nuance from
`data/taste_profile.md`, log the shortlist, render the map, and present a ranked list with one-line
reasons plus a transparency note. If the request is empty, ask one quick clarifying question (café or
restaurant? near home or anywhere?) then proceed.
