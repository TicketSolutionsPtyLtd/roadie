---
'@oztix/roadie-editor': minor
---

Add `toolbar` to `Editor`, `'docked'` (the default) or `'floating'`, with `pinnable`, `defaultToolbar`, and `onToolbarChange` so people can pin the floating toolbar to the top and unpin it again. A floating editor shows no bar: its toolbar over the selected text holds the text controls and ends with a … menu for the inserts, Undo and Redo, and `Editor.Toolbar`'s children. It docks on a phone or touch screen. `Editor.Toolbar` and `Editor.BubbleMenu` each render only in their own mode, and `Editor` renders `Editor.BubbleMenu` among its default parts.

The docked toolbar looks different in every existing editor: it's now a flat bar across the editor's top edge, with a divider under it in a boxed editor, that sticks to the top of the scroll container while the text scrolls. It takes the frame's fill, and `Editor.Toolbar`'s `emphasis` sets only its fill.

Focus shows differently too. An editor isn't a text field, so its frame no longer rings or tints while focused; the block holding the caret takes a tint instead, marked with `data-focused-block`. An invalid editor keeps its danger edge and fill. `emphasis='raised'` is new: a card's fill and shadow, for a document to write in. Text in a `normal`, `subtle` or `raised` editor now runs the box's full width instead of stopping at Prose's 65ch measure; a `subtler` editor keeps the measure, so it wraps as the published page does.
