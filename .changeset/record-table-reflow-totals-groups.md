---
'@oztix/roadie-components': minor
---

Breaking: under 40rem, a `RecordTable` with totals or groups keeps its table and re-flows its rows too, instead of swapping them for a list once the page hydrates. The totals row wraps onto one line above the rows, its label first and each total beside its column's heading, and each group's title row stays above its rows, its text lined up with theirs. Tests or selectors that look for `[data-slot="record-table-list-row"]`, `listitem`, a grouped `list`, or a totals paragraph in such a table need updating, and a totals cell's text now includes its heading, hidden from screen readers. Only deprecated cards still swap.
