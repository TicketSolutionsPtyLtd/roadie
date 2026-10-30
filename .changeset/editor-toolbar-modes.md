---
'@oztix/roadie-editor': minor
---

Add `toolbar` to `Editor`, `'docked'` (the default) or `'floating'`, with `pinnable`, `defaultToolbar`, and `onToolbarChange` so people can pin the floating toolbar to the top and unpin it again. A floating editor shows no bar: its toolbar over the selected text holds the text controls and ends with a … menu for the inserts, Undo and Redo, and `Editor.Toolbar`'s children. It docks on a phone or touch screen. `Editor.Toolbar` and `Editor.BubbleMenu` each render only in their own mode, and `Editor` renders `Editor.BubbleMenu` among its default parts.

The docked toolbar looks different in every existing editor: it's now a flat bar across the editor's top edge, with a divider under it, that sticks to the top of the scroll container while the text scrolls. It takes the frame's fill, and `Editor.Toolbar`'s `emphasis` sets only its fill.
