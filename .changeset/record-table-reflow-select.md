---
'@oztix/roadie-components': minor
---

Breaking: under 40rem, a selectable `RecordTable` keeps its table and re-flows its rows too, instead of swapping them for a list once the page hydrates. Its checkboxes hide until Select mode, then take each row's leading place, and a tap on a row selects it while the row's link steps aside. The bulk actions take the header row, which shows again while records are selected, rather than floating at the foot. Tests or selectors that look for `[data-slot="record-table-list-row"]`, `listitem`, or the floating `Bulk actions` group in such a table need updating. `Records.Select` now renders from the first paint for a table, hidden in CSS above 40rem of the header, and a layout definition can say so with `selectMode: 'narrow'`. Tables with totals or groups, and deprecated cards, still swap for now.
