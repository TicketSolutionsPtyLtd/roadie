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
cleared. Nothing is emitted while typed text names no date. The typed Start
and End are comboboxes that suggest single dates as `DateField` does, never
ranges, and End suggests nothing before the start. The button shows the range in words with the dates
a relative range stands for, and is named "Choose dates, <label> (<range>)".
A value that is one of the presets, fixed dates or relative, shows that
preset's label with its dates.

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
and `disabled` from `Field`. The drawer fills the screen's height. Under its title a line sums up the dates
chosen ("8 Sept to 7 Oct 2026 · 30 days"), and Periods and Calendar tabs
switch between a list of presets, each with its dates, and Start and End over
months that scroll under a pinned weekday row. Tapping End or Start picks
which end the next day sets. With `commit='apply'`, Clear and Apply stay in
view at its foot, with the header's Close as Cancel.
