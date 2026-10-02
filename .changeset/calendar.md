---
'@oztix/roadie-components': minor
---

Add `Calendar` (`@oztix/roadie-components/calendar`), a month grid for
choosing a date, several dates or a range, built on the plain-date math in
`@oztix/roadie-core/datetime`. Every value is an ISO date string, never a
`Date`. `mode` is `single`, `multiple` or `range`, with `selected`,
`defaultSelected` and `onSelect`; a range's `min` and `max` limit its length
in days. `disabled` and `modifiers` take matchers: a date, a list,
`{ start, end }`, `{ before }`, `{ after }`, `{ dayOfWeek }` or a function.
Each modifier renders as a data attribute on its days, such as
`data-has-session`.

It shows `numberOfMonths` side by side where they fit and stacked where they
don't, with month and year selects under `captionLayout='dropdown'`,
`fixedWeeks`, `showOutsideDays`, `weekStart`, `startMonth` and `endMonth`,
and a controlled `month`. Focus moves separately from selection with a roving
tab stop: arrows, Page Up and Down (with Shift for a year), Home and End.
Disabled days stay focusable, ranges preview under the pointer or keyboard,
and a polite live region announces the month and the selection. Days carry
`data-selected`, `data-range-start`, `data-range-middle`, `data-range-end`,
`data-range-preview`, `data-today`, `data-outside`, `data-disabled` and
`data-focused` for styling.
