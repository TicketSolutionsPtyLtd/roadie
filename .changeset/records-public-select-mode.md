---
'@oztix/roadie-components': minor
---

Add `setSelecting` to what `useRecords` returns, so your own control, such as a Select item in a phone's More menu, can start Select mode. Its type is `RecordsSetSelecting`. `setSelecting(false)` leaves and clears the selection, as Done does, and records that aren't `selectable` never enter it.

On a wide table, which has a checkbox per record, Select mode now waits until the table narrows. Until then, the status doesn't announce it and Escape doesn't clear the selection.
