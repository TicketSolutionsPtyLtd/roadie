---
'@oztix/roadie-core': patch
'@oztix/roadie-components': patch
---

`CalendarTile` no longer puts its month or weekday in capitals, because the
writing rule keeps all caps for acronyms. The tile shows `Nov`, not `NOV`, and
the band drops the wide letter spacing that only suited capitals.

Mixed case reads smaller than capitals, so the band's text is one size bigger
and still scales with the tile: 10px at `sm` (was 9px), `text-xs` (12px) at
`md` (was 10px), and `text-sm` (14px) at `lg` (was 11px). The band also has a
set height, about a third of the tile: 14px at `sm`, 16px at `md`, and 18px at
`lg`, with 2px of vertical padding and the text centred.

The `calendar-tile-top` utility changes the same way. The React tile now uses
that utility for its band, and marks its size with `data-size`, so the two
render an identical band.

`formatGlyph` now returns `month` and `weekday` as the locale abbreviates them
(`Nov` and `Fri` in English) rather than uppercased. Some locales abbreviate
in lowercase, such as `nov.` in French, and the tile shows that as given. If
you pass your own strings, pass them in sentence case.
