---
'@oztix/roadie-components': minor
---

Add a calendar layout to `Records`: `calendarLayout({ dateField, title })` from `@oztix/roadie-components/record-calendar` shows records on a month grid, each on its days, saved as `{ type: 'calendar', dateField }`, with previous, next and Today. Today is read in the browser only, so a server render reads no clock. A layout definition can now carry the `layout` a view switches to when it hasn't shown it, which the layout switch in `Records.View` and `Records.Options` uses.
