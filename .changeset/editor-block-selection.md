---
'@oztix/roadie-editor': minor
---

Add block selection to editors with a block handle. `Escape` selects the caret's block, and `Shift+ArrowUp` and `Shift+ArrowDown` take in the blocks above or below. With several blocks selected, by these keys or by a text selection across them, Move up, Move down, Duplicate, Delete, Turn into, and their keys act on them all, and the block menu is headed with how many, such as "3 blocks". A second `Escape` goes on to whatever is around the editor, such as a dialog. A block dragged by its handle now lands before the block under the pointer, or after it once the pointer is past its middle.
