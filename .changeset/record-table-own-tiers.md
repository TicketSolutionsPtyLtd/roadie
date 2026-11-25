---
'@oztix/roadie-components': patch
---

`RecordTable` hides its priority columns, picks each tier's column template, and covers a row's title cell with the row link using classes in its own components, and the stylesheet's `record-table` rules are gone. The tier widths and their classes now sit together in one file. Cells no longer carry `data-priority-start` or `data-priority-end`. Nothing looks different.
