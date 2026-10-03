---
'@oztix/roadie-components': minor
---

Add `DateRangePicker` (`@oztix/roadie-components/date-range-picker`), a button
showing a date range that opens presets, typed start and end dates, and a
range `Calendar` in a `Popover`.

The value is a `DateRangeValue` from `@oztix/roadie-core/datetime`. A preset
is emitted as given, so "Last 30 days" stays relative when saved; typed or
pressed dates become an absolute `{ start, end }`. The button shows the range
in words with the dates a relative range stands for, such as "Last 30 days
8 Sept to 7 Oct 2026". `presets` replaces the default list
(`dateRangePresets`: today, yesterday, recent periods and periods to date,
with the financial year from `fiscalYearStart`), and `group` sets presets
under a heading. `commit='apply'` holds changes until Apply is pressed, for a
dashboard period. `granularity='minute'` adds an optional time to each end,
read in `timeZone`. It also takes `disabled` matchers, `readOnly` (shown with
a lock), `invalid`, `size`, `emphasis`, `numberOfMonths` (two on wide
screens, one on narrow), `captionLayout`, `startMonth`, `endMonth`, `today`,
`weekStart` and a controlled `open`, and inherits its label, description,
`invalid` and `disabled` from `Field`. On a phone the presets come first and
one month follows.
