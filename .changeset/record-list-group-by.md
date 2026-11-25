---
'@oztix/roadie-components': minor
---

Add grouping to `listLayout()`: a view's `layout.groupBy` groups the list's rows by its first field with options under a title and count per option, with records that have no value last. Grouping applies to one page of rows at a time, and a list that loads by range stays ungrouped. `toggleRow` takes an `order`, so a Shift range follows the order a layout shows, such as grouped.
