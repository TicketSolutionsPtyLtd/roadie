---
'@oztix/roadie-charts': patch
---

LineChart's end label for the highlighted series, such as "Forecast 96%" on a pace chart, now uses the subtle text colour instead of `--chart-highlight`, so it meets body text contrast (APCA Lc 75) in light and dark. A dot in `--chart-highlight` sits beside it, so it still reads as the highlighted line's label. When one shows, every end label moves right by 10px to leave room for the dot, and the plot is 10px narrower.
