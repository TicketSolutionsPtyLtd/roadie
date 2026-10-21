---
'@oztix/roadie-components': minor
---

Add `totals` to `RecordTable` and `useRecords`: a row of totals under the headings, over every record the search and filters match. `totals` sums the number and money fields in the browser; with server data, pass the server's sums as `{ values }`, or resolve them from `loadRange` beside `rowCount`. It labels itself "Totals for 1,234 shows" from `recordName`, and reads as one line above the rows on a phone. A column's `total: false` leaves it blank. Tables without `totals` don't change.
