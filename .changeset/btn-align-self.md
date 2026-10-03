---
'@oztix/roadie-core': patch
'@oztix/roadie-components': patch
---

Buttons now follow their parent's alignment. The `btn` utility set
`place-self: start`, which overrode a flex row's `items-center` and a grid's
`justify-items`, so every `Button`, `IconButton` and `Toggle` in a taller row
sat at the top. It now sets `width: fit-content` instead: a button still keeps
its own size in a grid cell or a flex column, and takes the row's
`align-items` (including `items-baseline` and `items-end`), a grid's
`justify-items`, or a flex column's `items-center`. To widen a button, use
`w-full`; `self-stretch` and `items-stretch` don't stretch it.
