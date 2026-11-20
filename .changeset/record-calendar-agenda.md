---
'@oztix/roadie-components': minor
---

`RecordCalendar` and `calendarLayout` show an agenda on a phone, with the month's records as list rows under sticky day headings. The calendar now sends the days it shows to the server: the request carries a `between` filter on the date field for the visible weeks, unpaged, and changing the month sends that month's request. In the browser the same filter applies, and `Records.Pagination` shows nothing under a calendar.
