---
'@oztix/roadie-components': minor
---

Add `Calendar` (`@oztix/roadie-components/calendar`), a month or week
grid for choosing a date, several dates or a range, built on the plain-date math in
`@oztix/roadie-core/datetime`. Every value is an ISO date string, never a
`Date`. `mode` is `single`, `multiple` or `range`, with `selected`,
`defaultSelected` and `onSelect`; a range's `min` and `max` limit its length
in days. Days that would break them dim, and pressing one keeps the start and
announces the rule, such as "Ranges can be up to 14 days". `disabled` and `modifiers` take matchers: a date, a list,
`{ start, end }`, `{ before }`, `{ after }`, `{ dayOfWeek }` or a function.
Each modifier renders as a data attribute on its days, such as
`data-has-session`.

It fills its container: seven columns share the width, each day stays a
circle up to 48px across (or a tile, below) in the middle of its column, and a range's band runs
edge to edge. In a popover it takes 280px a month. It shows `numberOfMonths`
side by side where they fit and stacked where they don't, or with
`layout='scroll'` stacks months in a list that scrolls under one pinned row of
weekdays, adding months as it nears either end. It takes month and year
selects under `captionLayout='dropdown'`,
`fixedWeeks`, `showOutsideDays`, `weekStart`, `startMonth` and `endMonth`,
and a controlled `month`. The month's name sits at the start of the header
and both arrows at the end, together even with several months.

On a touch screen a swipe turns the page, the days following the finger
unless motion is reduced, and the other way in a right-to-left page.
`direction='vertical'` turns the months up and down instead: the arrows
point up and down and a finger swipes up for the next month.
`view='week'` (with `defaultView` and `onViewChange`) shows one week as a
row of larger days that turns a week at a time, and `views={['week',
'month']}` adds a "Month view" toggle beside the title, or above several
months. `getDayContent` puts
content such as a price or a status mark under each day's number in either
view. Every day then becomes a tile, up to 64px wide (80px in a week), that
grows to fit; days with content are filled, the content describes the day to
screen readers, and a disabled day with content is struck through. A month
without `getDayContent` keeps compact circles. Week view turns `onMonthChange`
as its weeks leave a month, and ignores `numberOfMonths`, `fixedWeeks` and
`showOutsideDays`. The root carries `data-view`, `data-direction` and
`data-tiles`, and the parts carry `calendar-header`, `calendar-nav`,
`calendar-grid`, `calendar-day-number` and `calendar-day-content` slots.

Focus moves separately from selection with a roving tab stop: arrows, Page
Up and Down (with Shift for a year), Home and End. Disabled days stay
focusable, ranges preview under the pointer or keyboard, and a polite live
region announces the month, or the week's dates, and the selection. Days carry
`data-selected`, `data-range-start`, `data-range-middle`, `data-range-end`,
`data-range-preview`, `data-today`, `data-outside`, `data-disabled`,
`data-out-of-range`, `data-focused` and `data-content` for styling.

Today follows midnight in `timeZone` and catches up when a hidden tab is shown
again. The server leaves today unmarked, so cached HTML read on a later day
hydrates without a mismatch, and a calendar with no `today`, `month`,
`defaultMonth` or selection renders an empty frame until the browser knows
today.
