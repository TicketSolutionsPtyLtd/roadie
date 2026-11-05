---
'@oztix/roadie-editor': minor
---

Add a block handle to the `blocks` preset, to move, copy, and delete blocks by drag, menu, or keyboard.

A grip shows beside the hovered block, or the caret's while the editor has focus. Dragging it moves the block as one undo step, keeping its `blockId`. Its menu, also opened with `Mod+/`, has Move up, Move down, Duplicate, and Delete, so keyboard, screen reader, and touch users can do everything a drag does. A framed `blocks` editor makes room for the grip at the start of its text.
