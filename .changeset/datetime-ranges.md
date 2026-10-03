---
'@oztix/roadie-core': minor
---

`@oztix/roadie-core/datetime` gains date ranges. A `DateRangeValue` is either
two inclusive ends or a `RelativeRange` with one fixed meaning: today, this
weekend, next week, the next 7 days, month to date, last quarter, this
financial year and more. `resolveDateRange` works out what a range covers on
a given day in a given zone, as plain dates for calendar ranges and instants
for hour windows and open ranges. `resolveComparison` finds the previous
period or the previous year to compare with, by date or, with
`alignWeekday`, by weekday. A calendar period's previous period is the one
before it: this month compares with last month, and month to date with last
month to the same day; other ranges compare with the same number of days,
ending the day before. It returns `{ status, range }`: given the data's
`dataStart` and `dataEnd`, a comparison the data only partly covers is
`partial`, and one it misses, or one with an open-ended range, is
`unavailable`. A period that runs past `dataEnd` compares only as far as the
data goes. `describeDateRange` returns the words to show and the dates they
stand for, and `describeComparison` the context line under a delta.

`parseDatePhrase` turns typed text such as "this weekend", "next 7 days",
"14 mar", "1/12", "after 1 dec" or "7:30pm" into ranked suggestions with
explicit values. Plain-date helpers come with it: `plainDateOf`, `addDays`,
`addMonths`, `compareDates`, `dayOfWeek`, `startOfWeek` and `monthGrid`, plus
the `isAbsoluteRange`, `isRollingRange` and `isPeriodRange` guards.
