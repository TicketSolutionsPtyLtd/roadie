---
'@oztix/roadie-components': minor
---

Add grouping to `listLayout()`: a view's `layout.groupBy` groups the list's rows by up to three fields with options, each inside the one before, under a title and count per option, as `h2` to `h4` headings, with records that have no value last. Each group is an Accordion item whose title row opens and closes it, for the session only, and a field's `groupHeading` draws content under its groups' titles, such as a venue's suburb, at any level. Grouping applies to one page of rows at a time, and a list that loads by range stays ungrouped. `toggleRow` takes an `order`, so a Shift range follows the order a layout shows, such as grouped.
