---
'@oztix/roadie-components': patch
---

`DateRangePicker` no longer puts `aria-required` on its button, where ARIA
doesn't allow it: a required picker failed axe's `aria-allowed-attr` check,
and so did `DashboardPeriod`, which marks its pickers required. A required
picker now says "Required" in its button's description instead.
