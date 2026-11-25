---
'@oztix/roadie-components': minor
---

Update the `Dashboard` grid's and most of `DataTable`'s stylesheet rules to sit in the components layer, so a `className` you pass now wins over them as it does over Roadie's other classes. A `col-span-*` on a card in a `Dashboard`, which the grid used to override, now takes effect.
