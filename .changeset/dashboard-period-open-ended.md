---
'@oztix/roadie-components': patch
---

Fix `DashboardPeriod` offering Previous period and Previous year for a range with no end, such as Upcoming, which then showed "Nothing to compare" on every card. Those choices and Custom dates now turn off for such a range, Compare turns on with the first choice that has dates, and the period reads none of them for such a range, even one given from outside, and Apply drops it. In the picker, Compare shows off with "Nothing to compare" below, and the comparison comes back if the range gets an end again. An app's own comparison still reads.
