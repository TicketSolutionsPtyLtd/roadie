---
'@oztix/roadie-components': minor
---

Add `Sortable` (`@oztix/roadie-components/sortable`), drag to reorder built on
the browser's native drag and drop. `Sortable` takes the item values in order
as `items` and reports `onReorder(next, { value, from, to })`; `Sortable.Item`
marks each item and `Sortable.Handle` drags it. `disabled` on an item stops
it being dragged or moved from its own menu, while other items can still move
past it. Clicking or tapping the handle, or pressing Enter or Space on it,
opens a Move menu (up, down, to top, to bottom; left, right, start and end for
`orientation='horizontal'`) for keyboard and screen reader users; a press that
turns into a drag doesn't. Focus returns to the moved item's handle, and each
move is announced in a polite live region.
The drop line is accent coloured, the dragged item dims in place, and a
scrolling container scrolls while you drag near its edge.

The package gains three runtime dependencies for this:
`@atlaskit/pragmatic-drag-and-drop`, `@atlaskit/pragmatic-drag-and-drop-hitbox`
and `@atlaskit/pragmatic-drag-and-drop-auto-scroll` (Apache-2.0). Only
`Sortable` imports them, so importing other components, including `List`,
doesn't load them. Importing everything from the root barrel adds about 10 kB.

`List.Item` takes a `value`. Inside a `Sortable` the row becomes reorderable:
a drag handle leads, and the row is static, so it ignores `href`, `onClick`,
`current` and `chevron` (a development warning names `href` and `onClick`).
Outside a `Sortable` the row is unchanged.
