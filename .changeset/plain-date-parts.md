---
'@oztix/roadie-core': minor
---

Add `plainDateParts` to `@oztix/roadie-core/datetime`, which reads an ISO date's year, month and day as numbers and throws on anything that isn't one. Calendar now reads dates through it, not by slicing the string.
