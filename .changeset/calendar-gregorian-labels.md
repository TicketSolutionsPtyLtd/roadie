---
'@oztix/roadie-components': patch
---

Fix `Calendar` naming months from the locale's own calendar, so in `fa` or `ps` its caption, month picker and week captions showed Persian months over a Gregorian grid, and `th` showed the Buddhist year. They now name the Gregorian month and year.
