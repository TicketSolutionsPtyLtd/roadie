---
'@oztix/roadie-charts': patch
---

Charts run on `@tanstack/charts` and `@tanstack/react-charts` 1.1. Tooltips
are unchanged: charts draw Roadie's own tooltip, not the engine's, so 1.1's
change to custom tooltip bodies doesn't reach them.
