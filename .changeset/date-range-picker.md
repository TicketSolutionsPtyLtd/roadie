---
'@oztix/roadie-components': minor
---

Add `DateRangePicker` (`@oztix/roadie-components/date-range-picker`), a button
showing a date range that opens presets, typed start and end dates, and a range
`Calendar` in a `Popover`, or below 48rem in a bottom `Drawer`.

The value is a `DateRangeValue` from `@oztix/roadie-core/datetime`. A preset
stays relative, so "Last 30 days" is still the last 30 days when a saved view
opens, and typed or picked dates become an absolute `{ start, end }`. The
button shows the range in words with the dates it stands for.

`presets` replaces the default list (`dateRangePresets`), and `commit='apply'`
holds changes until Apply is pressed, for a dashboard period.
`granularity='minute'` adds a time to each end, read in `timeZone`. It also
takes `min`, `max`, `disabled` matchers, `readOnly`, `numberOfMonths`, `size`, and
`emphasis`, and inherits its label, `invalid`, `required`, and `disabled`
from `Field`.
