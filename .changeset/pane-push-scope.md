---
'@oztix/roadie-components': patch
---

A Navigator pane push on a phone restyles less of the page, so it starts faster with long lists in the panes. The stack's state no longer inherits into what the panes hold, and the top toast clearance is set on `Toast.Viewport`, not `<html>`. Nothing looks different.
