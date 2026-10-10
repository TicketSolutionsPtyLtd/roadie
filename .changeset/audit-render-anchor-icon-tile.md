---
'roadie-skills': patch
---

`/roadie:audit` flags an anchor passed to `render` (I6), which I2 and I3 missed
when its `href` was an expression, and a hand-rolled icon tile (C5), which had
no pattern. `/roadie:migrate` prints why a manifest is missing.
