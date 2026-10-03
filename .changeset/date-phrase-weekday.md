---
'@oztix/roadie-core': patch
---

`parseDatePhrase` reads a date that leads with its weekday, such as "Fri 27 Nov
2026" or "Friday, 27 November 2026", so the formatters' own output reads back.
The weekday is ignored and the date wins.
