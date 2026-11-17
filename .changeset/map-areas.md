---
'@oztix/roadie-components': minor
---

Add `Map.Areas` to fill areas, such as postcodes, in heat colours by their values, as an alternative to `Map.Clusters` when values belong to areas. It takes boundaries as GeoJSON or TopoJSON and values by id, and colours a fifth of the areas with each step. `legend` keys each colour's range, hovering an area names it with its value and share, `onAreasChange` gives the areas on the map when they change, and `highlight` lights areas by id, such as while a row is hovered in a table beside the map. `areaTotals` sorts a point for each sale into the areas and adds them up, for a feed that can't send totals. Engines can implement the optional `setActiveAreas`, so lighting an area draws nothing else again.
