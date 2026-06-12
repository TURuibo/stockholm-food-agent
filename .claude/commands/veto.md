---
description: Never recommend this again (a place, cuisine, or pattern)
argument-hint: <place name | cuisine | keyword>
---

Add a never-again rule for: $ARGUMENTS

Edit `data/taste_profile.md` frontmatter: append the term to the `vetoed:` list (it matches a place
id, name, or cuisine substring). If it's really a disliked *cuisine* or *vibe*, also add it to
`dislikes`. Confirm what will now be excluded. The recommender excludes vetoed places at the hard-filter stage.
