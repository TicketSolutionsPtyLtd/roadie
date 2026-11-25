---
'@oztix/roadie-components': patch
---

`Records.BulkActions` and RecordTable's bulk bar stick to the foot of the scroll box while the records run past it, and rest at the records' end, with `position: sticky` in place of a fixed bar that a scroll listener placed. Scrolling no longer measures the page, and the bar now stays inside the box that scrolls, such as a pane, rather than the screen.
