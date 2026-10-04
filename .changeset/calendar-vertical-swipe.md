---
'@oztix/roadie-components': patch
---

`Calendar` turns on a vertical swipe on iOS Safari. Safari cancels the
pointer once its pan recogniser starts on a vertical drag, even though
`touch-action` stops the page scrolling, so the swipe snapped back. The swipe
now follows touch events, which carry on to the lift, and a swipe that has
begun stops the page scrolling where `touch-action` falls short.

While a paged calendar is swiped or turns, only the days move: the weekday
row, the month's name and the arrows hold still, as the pinned row does in a
scrolling list. The days carry a `calendar-days` slot.

The arrows, the month and year selects, and Page Up and Page Down now play
the same slide as a swipe, in the swipe's direction and mirrored in a
right-to-left page. A press during a slide lands the turn in progress at once
and slides on from there, so quick presses reach the right month and keep
focus. Arrow keys across a month edge, a view switch and a parent's `month`
still turn straight away, as does every turn under reduced motion.
