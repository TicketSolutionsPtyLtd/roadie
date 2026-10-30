---
'@oztix/roadie-core': patch
---

Fix `parseDatePhrase` offering nothing for a month name. "may" now suggests the coming May then the last one, "october" in October suggests this month, and "may 2027" that month. A rolling month from a date the far month lacks now ends on that month's last day, so "next 1 month" from 31 January runs to 28 February, not 27 February.
