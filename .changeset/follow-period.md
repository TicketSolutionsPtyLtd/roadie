---
'@oztix/roadie-charts': minor
---

Add `followPeriod(card, period, options)` to `@oztix/roadie-charts/tables`. It returns a dashboard card as `DashboardView` draws it for the period: a line or bar plot's comparison, small multiples' panels too, is dropped unless the period compares with Roadie's previous period, previous year, or custom dates and `history` isn't `unavailable`, and is named after the comparison. Pass the card through it before `cardTable` or `renderChartSvg` on a server, such as a CSV route, so the file matches the Table view. `options` takes the `timeZone` and `locale` the period uses.
