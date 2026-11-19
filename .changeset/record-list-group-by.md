---
'@oztix/roadie-components': minor
---

Add `groupBy` to `listLayout()`, grouping a list's rows by a field with options under a title and count per option, with records that have no value last. A view saves its own `layout.groupBy`, which wins over the list's. Grouping applies to one page of rows at a time, and a list that loads by range stays ungrouped. `toggleRow` takes an `order`, so a Shift range follows the order a layout shows, such as grouped.
