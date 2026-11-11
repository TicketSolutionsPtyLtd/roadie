---
'@oztix/roadie-editor': minor
---

Breaking: every existing `Editor` looks different, with a new docked toolbar, a new focus style and wider text, and `Editor` renders `Editor.BubbleMenu` by default.

The docked toolbar is now a flat bar across the editor's top edge, with a divider under it in a boxed editor, that sticks to the top of the scroll container while the text scrolls. It takes the frame's fill, and `Editor.Toolbar`'s `emphasis` sets only its fill.

An editor isn't a text field, so its frame no longer rings or tints while focused. The block holding the caret takes a tint instead, drawn around a button's own fill, and marked with `data-focused-block`. An invalid editor keeps its danger edge and fill.

Text in a `normal`, `subtle` or `raised` editor now runs the box's full width instead of stopping at Prose's 65ch measure. A `subtler` editor keeps the measure, so it wraps as the published page does.

`Editor` renders `Editor.BubbleMenu` among its default parts. It shows only when `toolbar` is `'floating'`.
