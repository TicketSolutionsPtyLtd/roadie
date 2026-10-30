---
'@oztix/roadie-core': patch
---

Fix the date formatters naming the wrong month in locales whose default calendar isn't Gregorian, such as `fa` and `ps`, which showed a Persian month beside a Gregorian day and year. They also drop Japanese's 月, so `ja` read `27 11 2026`; it now reads `27 11月 2026`.
