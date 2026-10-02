---
'@oztix/roadie-components': minor
---

Add `Sortable` (`@oztix/roadie-components/sortable`), drag to reorder built on
the browser's native drag and drop through pragmatic-drag-and-drop. `Sortable`
takes the item values in order as `items` and reports `onReorder(next, { value,
from, to })`; `Sortable.Item` marks each item and `Sortable.Handle` drags it. A
press on the handle opens a Move menu (up, down, to top, to bottom; left,
right, start and end for `orientation='horizontal'`) for keyboard and screen
reader users, focus returns to the moved item's handle, and each move is
announced in a polite live region. The drop line is accent coloured, the dragged item dims
in place, and a scrolling container scrolls while you drag near its edge.

`List.Item` takes a `value`. Inside a `Sortable` the row becomes reorderable:
a drag handle leads, and the row is static rather than a link or button.
Outside a `Sortable` the row is unchanged.
