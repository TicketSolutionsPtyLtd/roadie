---
'@oztix/roadie-components': minor
---

Add `Map.Clusters` to show places with values, such as totals by postcode, as bands that add up the places near each other and split as the map zooms in. Each band shows its value and, below it, its share of the total. `locked` keeps the groups as they are while the map zooms. A place's `region`, such as its state, keeps it from grouping with places in other regions. `onGroupsChange` gives the bands on the map as they change, and `highlight` lights the bands holding places by label, such as to list what the map shows in a table beside it and light a band while its row is hovered. Show all fits the map to the data too.
