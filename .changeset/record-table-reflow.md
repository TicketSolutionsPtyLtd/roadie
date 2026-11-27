---
'@oztix/roadie-components': minor
---

Breaking: under 40rem, a `RecordTable` that can't be selected and has no totals keeps its table and re-flows its rows with a container query, instead of swapping them for a list once the page hydrates. Nothing moves on hydration at phone widths. Narrow rows are now `row`s of `cell`s under hidden column headers, not `listitem`s, so tests or selectors that look for `[data-slot="record-table-list-row"]` or `listitem` in such a table need updating. Rows are 4rem tall with a description and 3rem without, and the window reads that height from `--record-table-row-height`. Selectable tables, tables with totals, and deprecated cards still swap for now.
