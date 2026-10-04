---
'@oztix/roadie-components': patch
---

`Calendar` turns on a vertical swipe on iOS Safari. Safari cancels the
pointer once its pan recogniser starts on a vertical drag, even though
`touch-action` stops the page scrolling, so the swipe snapped back. The swipe
now follows touch events, which carry on to the lift, and a swipe that has
begun stops the page scrolling where `touch-action` falls short.
