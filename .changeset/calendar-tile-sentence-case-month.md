---
'@oztix/roadie-core': patch
'@oztix/roadie-components': patch
---

`CalendarTile` no longer puts its month or weekday in capitals, because the
writing rule keeps all caps for acronyms. The tile shows `Nov`, not `NOV`, and
the band drops the wide letter spacing that only suited capitals. The
`calendar-tile-top` utility changes the same way, and `formatGlyph` now
returns `month` and `weekday` as the locale abbreviates them (`Nov`, `Fri`)
rather than uppercased. If you pass your own strings, pass them in sentence
case.
