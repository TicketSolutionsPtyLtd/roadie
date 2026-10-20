---
'@oztix/roadie-core': minor
---

Add date ranges and typed date phrases to `@oztix/roadie-core/datetime`.

- A `DateRangeValue` is two inclusive ends or a `RelativeRange` with one fixed meaning, such as today, this weekend, the next 7 days, month to date, or this financial year. Each meaning has one form, which `canonicalDateRange` writes: `{ period: 'month', offset: -1 }` becomes `'last-month'`.
- `resolveDateRange` works out what a range covers on a given day in a given zone, and `describeDateRange` returns the words to show and the dates they stand for.
- `resolveComparison` finds the previous period or previous year to compare with, by date or, with `alignWeekday`, by weekday. Given the data's `dataStart` and `dataEnd`, it says whether the data covers the comparison: `partial` or `unavailable`. `describeComparison` writes the context line under a delta, and `Comparison<App>` adds an app's own comparison, such as `'similar'`.
- `parseDatePhrase` turns typed text, such as "this weekend", "next 7 days", "14 mar", "1/12", "Fri 27 Nov 2026", "after 1 dec", or "7:30pm", into ranked suggestions with explicit values.
- Plain-date helpers come with it: `plainDateOf`, `addDays`, `addMonths`, `compareDates`, `dayOfWeek`, `startOfWeek`, and `monthGrid`, plus the `isAbsoluteRange`, `isRollingRange`, and `isPeriodRange` guards.
