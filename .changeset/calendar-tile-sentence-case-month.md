---
'@oztix/roadie-core': patch
'@oztix/roadie-components': patch
---

`CalendarTile` no longer puts its month or weekday in capitals, because the
writing rule keeps all caps for acronyms. The tile shows `Nov`, not `NOV`, and
the band drops the wide letter spacing that only suited capitals. Mixed case
reads smaller than capitals, so the band's text is one size bigger and still
scales with the tile: 10px at `sm` (was 9px), `text-xs` at `md` (was 10px),
and `text-sm` at `lg` (was 11px). The band now has a set height, so it
takes about a third of the tile: `h-3.5` at `sm`, `h-4` at `md`, and `h-4.5` at
`lg`. It has 2px of vertical padding, with the text centred.

The `calendar-tile-top` utility changes the same way, and the React tile now
uses it, so both render an identical band. `formatGlyph` now returns `month`
and `weekday` as the locale abbreviates them (`Nov`, `Fri`) rather than
uppercased. If you pass your own strings, pass them in sentence case.
