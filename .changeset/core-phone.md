---
'@oztix/roadie-core': minor
---

Add `@oztix/roadie-core/phone`, with `parsePhone`, `formatPhone`, `isPossiblePhone`, and `phoneCountries`, for reading a typed phone number as E.164 and formatting it back. It carries a small table of dial codes and number lengths instead of a phone library, so it checks that a number's length fits its country, not that the number exists.
