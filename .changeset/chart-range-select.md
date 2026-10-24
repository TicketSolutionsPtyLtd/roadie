---
'@oztix/roadie-charts': minor
---

Add `onRangeSelect` to `LineChart`, `BarChart`, and `StackedArea`, so a drag across dated x, or Shift with an arrow key and then Enter, selects a range. It reports an inclusive `AbsoluteRange` in the venue's wall time, such as `{ start: '2026-10-03', end: '2026-10-10' }`, which fits straight into `DateRangePicker` or `onPeriodChange`. Charts without it don't change.
