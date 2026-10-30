---
'@oztix/roadie-components': patch
---

Fix `DashboardPeriod` offering Previous period and Previous year for a range with no end, such as Upcoming, which then showed "Nothing to compare" on every card. Both choices now turn off for such a range, Compare turns on with the first choice that has dates, and Apply drops either one when the range is changed to an open-ended one.
