---
'@oztix/roadie-components': patch
---

Fix `DashboardPeriod` shrinking to nothing in a flex row beside other controls, an `inline-flex` parent, or an `auto` grid track. In a flex row it keeps at least 20rem, or the row's width when that's less; in an `inline-flex` parent or an `auto` track it takes 20rem, and an `auto` track narrows it when the grid has less room. The `DateRangePicker` button also gives its calendar icon more room at each size: 8px from the edge and before the dates at `sm`, 12px and 10px at `md`, and 14px and 12px at `lg`.
