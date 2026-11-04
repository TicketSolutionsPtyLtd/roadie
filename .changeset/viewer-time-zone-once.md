---
'@oztix/roadie-core': patch
---

`viewerTimeZone` reads the viewer's time zone once, and again only when the UTC offset changes, rather than building an `Intl.DateTimeFormat` on every call. React calls it for every date a RecordTable or RecordGrid renders, so scrolling 10,000 cards spent a fifth of its main-thread time there.
