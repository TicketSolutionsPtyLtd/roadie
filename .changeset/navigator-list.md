---
'@oztix/roadie-components': minor
---

Add `Navigator` and `Pane`, the application frame.

`Navigator` is one navigation model at every size: floating capsules down the
side from `md`, with a brand (the Oztix `Logo` by default), pinned items and an
optional expanded state with labels, and a floating tab bar on phones. Items
declare `placement` and `visibilityPriority`; whatever doesn't fit folds into a
More pane. A section's sub-pages open in a generated list pane, optionally
searchable, and an item can own a `Navigator.Menu` instead of a destination.
`Navigator.Primary` must be a direct child of `Navigator`.

`Pane` is a scrolling column with sticky chrome, a collapse-on-scroll header
and a stack position when panes share a screen. `Navigator.Content` lays panes
out as columns from its own width (two from 46.25rem, three from 76rem) and
stacks them below that. A stacked pane that mounts as the new top slides in
like one that was already there, so a route-driven detail pane animates on a
push; a first paint, hydration and reduced motion never slide. `Pane.Search` is
a pill search field with a Cancel.

Also ships `Navigator.ExpandToggle`, `Navigator.OverflowPane`/`OverflowItems`,
`Navigator.SecondaryPane`, and `Navigator.SectionItems` with
`useNavigatorSection` for rendering a section's items in a page. `showList` and
`showMore` put the list and More in the URL; `root='page'` on
`Navigator.Secondary` shows the page alone on the section route;
`expandedFromDocument` pairs with `getNavigatorExpandedScript` from
`@oztix/roadie-core/navigator`.
