---
'@oztix/roadie-editor': minor
---

Add `Editor.SlashMenu`, which inserts any of the `blocks` preset's blocks from the keyboard.

In a `blocks` editor, typing `/` in an empty paragraph opens a list of the preset's blocks, filtered by what you type next. The arrow keys move, Enter or a tap inserts the block in place of the `/`, and Escape closes the list, leaving the `/`. With no children, a `blocks` editor renders the menu after `Editor.Content`; with your own children, place `<Editor.SlashMenu />` yourself. Other presets render nothing for it.
