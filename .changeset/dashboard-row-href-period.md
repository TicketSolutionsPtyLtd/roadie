---
'@oztix/roadie-charts': minor
---

Add the dashboard's period to `DashboardView`'s `getRowHref`, as a third argument, so a row link can open the same dates without reading the spec. A custom comparison that can't be described now fails loudly instead of reading "vs custom dates"; only date-times with no `timeZone` still fall back to it.
