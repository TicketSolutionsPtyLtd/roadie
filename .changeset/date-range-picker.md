---
'@oztix/roadie-components': minor
---

Add `DateRangePicker` (`@oztix/roadie-components/date-range-picker`), a button
showing a date range that opens presets, typed start and end dates, and a range
`Calendar` in a `Popover`, or below 48rem in a bottom `Drawer`.
`DateRangePreset` and the default `dateRangePresets` are exported from the
subpath and the package root.

The value is a `DateRangeValue` from `@oztix/roadie-core/datetime`. A preset
is emitted as given, so "Last 30 days" stays relative when saved; typed or
pressed dates become an absolute `{ start, end }`, and null when both are
cleared. Nothing is emitted while typed text names no date. The button shows
the range in words with the dates a relative range stands for, and is named
"Choose dates, <label> (<range>)".

`presets` replaces the default list (today, yesterday, recent periods and
periods to date, with the financial year from `fiscalYearStart`), and `group`
sets presets under a heading. `commit='apply'` holds changes until Apply is
pressed, for a dashboard period; with `required`, Apply stays off while both
dates are empty. `granularity='minute'` adds an optional time
to each end, read in `timeZone`, with `hourCycle` and `minuteStep`. It also
takes `disabled` matchers, `readOnly` (shown with a lock), `invalid`,
`required`, `size`, `emphasis`, `placeholder`, `numberOfMonths` (two on wide
screens, one on narrow), `min`, `max`, `captionLayout`, `startMonth`,
`endMonth`, `today`, `weekStart`, `locale` and `open`, `defaultOpen` and
`onOpenChange`, and inherits its label, description, `invalid`, `required`
and `disabled` from `Field`. In the drawer the presets come first, one month
follows with days up to 48px wide, and Apply stays in view at its foot, with
the header's Close as Cancel.
