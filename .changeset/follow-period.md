---
'@oztix/roadie-charts': minor
---

Add `followPeriod(card, period, options)` to `@oztix/roadie-charts/tables`. It returns a dashboard card as `DashboardView` draws it for the period. A headline delta marked `comparison` is named on the card's context line, such as "vs previous period", gives way to "Not enough history" or "Nothing to compare" when the period sets `history`, and is dropped with no comparison of Roadie's. The delta it returns has no `comparison` flag. A line or bar plot's comparison, small multiples' panels too, is dropped unless the period compares with Roadie's previous period, previous year, or custom dates and `history` isn't `unavailable`, and is named after the comparison. `DashboardView` draws each card from it, so `cardActions` gets the card on screen. Pass the card through it before `cardTable` or `renderChartSvg` on a server, such as a CSV route, so the file matches the card. `options` takes the `timeZone` and `locale` the period uses.
