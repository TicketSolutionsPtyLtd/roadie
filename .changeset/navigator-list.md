---
"@oztix/roadie-components": minor
---

Add `Navigator` and `List` components. `Navigator` is a full-height application
frame — a labelled rail on desktop, a floating tab bar on mobile — that adapts
to whether the product has nested sections and folds overflowing destinations
into a "More" pane. `List` is the vertical row primitive used inside its panes.
The Roadie docs site is the first consumer: its whole navigation is now built
on `Navigator` + `List`.
