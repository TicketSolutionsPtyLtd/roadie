---
'@oztix/roadie-core': patch
'@oztix/roadie-components': patch
---

Buttons now follow their row's alignment. The `btn` utility set
`place-self: start`, so its `align-self` overrode a flex row's `items-center`
and pinned every `Button`, `IconButton` and `Toggle` in a taller row to the
top. It now sets only `justify-self: start`: a button keeps its own height and
width in a grid cell, and takes the row's `align-items` in flex. In a flex
column left at the default `items-stretch`, a button now spans the column's
width; add `items-start` to keep it at its own width. `Sortable.Handle` drops
the `self-auto` it carried to work around this.
