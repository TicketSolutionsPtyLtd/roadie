---
'@oztix/roadie-components': minor
---

Add `Calendar` (`@oztix/roadie-components/calendar`), a month or week grid for choosing a date, several dates, or a range.

Every value is an ISO date string, never a `Date`, built on the plain-date math in `@oztix/roadie-core/datetime`. `mode` is `single`, `multiple`, or `range`, with `selected`, `defaultSelected`, and `onSelect`, and a range's `min` and `max` limit its length in days. `disabled` and `modifiers` take matchers: a date, a list, `{ start, end }`, `{ before }`, `{ after }`, `{ dayOfWeek }`, or a function, and each modifier marks its days with a data attribute.

It fills its container and shows `numberOfMonths` side by side where they fit, or with `layout='scroll'` stacks months under one pinned weekday row. `view='week'` shows one week of larger days, and `views={['week', 'month']}` adds a toggle between them. `direction='vertical'` turns months up and down. A swipe or drag turns the page, and `getDayContent` puts a price or status under each day. `captionLayout='dropdown'` adds month and year selects.

Focus moves apart from selection, with arrows, Page Up and Page Down (Shift for a year), Home, and End, and a live region announces the month and the selection. Today follows midnight in `timeZone`, and the server leaves today unmarked, so cached HTML hydrates without a mismatch.
