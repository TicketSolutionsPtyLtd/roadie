---
'@oztix/roadie-editor': minor
'@oztix/roadie-blocks': minor
---

Add `editingItem` to an `EditorSection`'s `render`, the path of the list item open in its Settings drawer, such as `questions.2`, and `FAQ`'s `openQuestion`, so a section shows the item being edited and an FAQ opens to the answer being edited.

Removing a list item in Settings is now an undo step of its own, and focus moves to the next item, the one before, or Add. While Settings are open, `Mod+Z` and `Mod+Shift+Z` step the editor's history through the visit's own steps, never a field's own undo, so Undo brings an item back without taking away the block. On a phone, the sheet opens scrolled to the item tapped without raising the keyboard, and the item being edited stays above it as you type. A button or image item no longer repeats its name above its fields.

In the editor, a catalogue section draws a new button with its label, or Button, before it has a link, and an image waiting on its link as a placeholder from the sunken surface, so it follows dark mode.
