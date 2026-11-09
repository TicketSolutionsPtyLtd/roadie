---
'@oztix/roadie-editor': minor
---

Add `Editor.BubbleMenu`, the floating toolbar over selected text for `toolbar='floating'`. It shows only over selected text, so it never covers the line above a plain caret, and keeps clear of the editor's own fields above the text, such as an email's Preview text, and of a section's Settings. It shows Undo whenever there's something to undo, and its … menu keeps Redo. Alt+F10 moves focus to it, opening it at the caret when nothing is selected. It hides when the selection collapses, on a selected image or embed, on text that takes no marks, while the link editor is open, and when the editor is read-only or disabled.
