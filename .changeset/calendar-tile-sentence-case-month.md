---
'@oztix/roadie-core': patch
'@oztix/roadie-components': patch
---

`CalendarTile` no longer puts its month or weekday in capitals, because the
writing rule keeps all caps for acronyms. The tile shows `Nov`, not `NOV`, and
the band drops the wide letter spacing that only suited capitals. Mixed case
reads smaller than capitals, so the band's text is one size bigger and still
scales with the tile: 10px at `sm` (was 9px), `text-xs` at `md` (was 10px),
and `text-sm` at `lg` (was 11px). Band padding is on the spacing scale:
`py-0.5` at `sm` (was 3px), `py-1` at `md` (was 3px), and `py-1.5` at `lg`
(was 3px).

The `calendar-tile-top` utility changes the same way, and the React tile now
uses it, so both render an identical band. `formatGlyph` now returns `month`
and `weekday` as the locale abbreviates them (`Nov`, `Fri`) rather than
uppercased. If you pass your own strings, pass them in sentence case.
