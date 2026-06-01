---
"@oztix/roadie-widgets": patch
---

`groupEventsByDay` no longer throws when a cart event is missing its
`eventStartAtUtc` (ordering key) or `eventDateKey` (grouping key). Previously a
single undefined key crashed the `.localeCompare` sort, which — because it runs
inside the `CartContents` render — blanked the entire cart list (and surfaced as
`TypeError: Cannot read properties of undefined (reading 'localeCompare')`).

The grouping now coerces absent keys defensively (consistent with the package's
untrusted-payload trust seam): every item still renders, dated events keep their
correct order/grouping, and any undated events trail in a final group rather
than taking down the whole drawer. Date headers/times for undated events fall
back to empty via the existing render-layer guards.

Note: this is defence-in-depth. Correct ordering/day-grouping still requires the
consuming app to supply `eventStartAtUtc` + `eventDateKey` on each event.
