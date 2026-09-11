---
"@oztix/roadie-components": minor
---

Add `Navigator` and `Pane`, the application frame.

`Navigator` is one navigation model at every size: icon-only floating capsules
down the side of the screen from `md` (brand on top, pinned items at the bottom, an
optional expanded state with labels), and a floating tab bar below it. Items
declare `placement` and `visibilityPriority`; whatever doesn't fit folds into
a More pane. A section's sub-pages open in a generated list pane, optionally
searchable, and an item can own a `Navigator.Menu` instead of a destination.

`Pane` is a scrolling column of that frame, with sticky chrome, a
collapse-on-scroll header and a stack position when panes share a screen.
