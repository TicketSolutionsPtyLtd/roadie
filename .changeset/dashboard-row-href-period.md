---
'@oztix/roadie-charts': minor
---

Add the dashboard's period to `DashboardView`'s `getRowHref`, as a third argument, so a row link can open the same dates without reading the spec. A custom comparison `DashboardView` can't describe still reads "vs custom dates", and now says why in a development console error.
