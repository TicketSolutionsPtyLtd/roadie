---
'@oztix/roadie-charts': minor
'@oztix/roadie-core': minor
---

Add `other` and `sort` to `RankedBars` and the dashboard `ranked-bars` plot. `other={false}` leaves the bars past `limit` off instead of rolling them into Other, for a label that already says "Top 5 of 40". A highlighted bar past `limit` takes the place of the lowest bar that isn't highlighted, so it never drops off. `sort={false}` keeps the data's order, for categories such as age bands. `Scatter` now titles both axes with their field names, so a reader knows what each counts.
