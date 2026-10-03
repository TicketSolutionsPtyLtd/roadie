---
'@oztix/roadie-components': patch
---

`DateRangePicker` no longer puts `aria-required` on its button, where ARIA
doesn't allow it. A required picker, and so every `DashboardPeriod`, failed
axe's `aria-allowed-attr` check.
