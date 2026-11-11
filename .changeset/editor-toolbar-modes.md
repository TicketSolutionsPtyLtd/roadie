---
'@oztix/roadie-editor': minor
---

Add `toolbar` to `Editor`, `'docked'` (the default) or `'floating'`, with `pinnable`, `defaultToolbar`, and `onToolbarChange` so people can pin the floating toolbar to the top and unpin it again. A floating editor shows no bar: its toolbar over the selected text holds the text controls and ends with Undo, while there's something to undo, and a … menu for the inserts, Redo, and `Editor.Toolbar`'s children. It docks on a phone or touch screen. `Editor.Toolbar` and `Editor.BubbleMenu` each render only in their own mode.

`emphasis='raised'` is new: a card's fill and shadow, for a document to write in. A `blocks` editor now opens with `emphasis='subtler'` and a floating toolbar unless you pass either, and an `email` editor opens with a floating toolbar unless you pass `toolbar`. The block menu opens beside the grip, headed by the block's type, shows each action's keys, and tints the block while it's open. In the text, Mod+Shift+Up and Mod+Shift+Down move the caret's block and Mod+D duplicates it; in the menu, Delete or Backspace deletes it.
