---
'@oztix/roadie-core': patch
---

Fix `parseRecordQuery` reading values joined by "or" as two filters. `city melb or syd` now suggests one filter, "City is in Melbourne or Sydney", first, as a chip's values OR, and `venue is not walrus or kettle` one that rules out both. Values joined by "and" still read as a filter each.
