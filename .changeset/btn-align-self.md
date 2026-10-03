---
'@oztix/roadie-core': patch
'@oztix/roadie-components': patch
---

Buttons now follow their parent's alignment. The `btn` utility set
`place-self: start`, which overrode a flex row's `items-center` and a grid's
`justify-items`, so every `Button`, `IconButton` and `Toggle` in a taller row
sat at the top. It now sets `width: fit-content` instead. With a size class
(every `Button`, `IconButton` and `Toggle` has one), a button keeps its own
size in a grid cell or a flex column and takes the row's `align-items`
(including `items-baseline` and `items-end`), a grid's `justify-items`, or a
flex column's `items-center`, as in a horizontal `Card`'s side-column footer.

To widen a button, use `w-full`. `self-stretch`, `justify-self-stretch` and
`place-self-stretch` no longer widen it. To undo `w-full` at a breakpoint, use
`w-fit` rather than `w-auto`, which now lets a grid or flex column stretch it.
If you load `@oztix/roadie-core/css/compiled` beside your own Tailwind build,
import it before your utilities so `w-*` on a button still wins.
