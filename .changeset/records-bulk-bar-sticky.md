---
'@oztix/roadie-components': patch
---

`Records.BulkActions` and RecordTable's bulk bar stick to the foot of the box that scrolls while the records run past it, and rest at the records' end, with `position: sticky` in place of a fixed bar that a scroll listener placed. Scrolling no longer measures the page. Like the records' sticky toolbar and table head, the bar now stays inside an ancestor that clips without scrolling, such as one with `overflow: hidden`, rather than escaping it to the screen.
