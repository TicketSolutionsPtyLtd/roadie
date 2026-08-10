---
"@oztix/roadie-components": minor
---

Add the application-frame primitives: `Navigator`, `Pane`, `List`,
`ScrollArea` and `Drawer`.

`Navigator` is a full-height application frame — a labelled rail on desktop, a
floating tab bar on mobile — that adapts to whether the product has nested
sections and folds overflowing destinations into a "More" pane. `Pane` is a
scrolling column of that frame, with sticky chrome, a collapse-on-scroll header
and a stack position when panes share a screen. `List` is the vertical row
primitive used inside those panes. `ScrollArea` gives any bounded region a
consistent custom scrollbar, and `Drawer` is a surface that slides in from an
edge and swipes away.

The Roadie docs site is the first consumer: its whole navigation is now built
on `Navigator` + `Pane` + `List`.
