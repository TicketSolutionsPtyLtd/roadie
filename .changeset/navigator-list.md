---
'@oztix/roadie-components': minor
---

Add `Navigator` and `Pane`, the application frame.

`Navigator` is one navigation model at every size: icon-only floating capsules
down the side of the screen from `md` (a brand linking home on top, by default the Oztix `Logo`; pinned items at the bottom; an
optional expanded state with labels), and a floating tab bar below it. Items
declare `placement` and `visibilityPriority`; whatever doesn't fit folds into
a More pane. A section's sub-pages open in a generated list pane, optionally
searchable, and an item can own a `Navigator.Menu` instead of a destination.

`Pane` is a scrolling column of that frame, with sticky chrome, a
collapse-on-scroll header and a stack position when panes share a screen.

Also ships `Navigator.Menu`/`MenuItem`, `Navigator.ExpandToggle`,
`Navigator.OverflowPane`/`OverflowItems`,
`Navigator.SecondaryPane`/`SecondaryItems`; `showList`/`onShowListChange` to
show a section's list from the URL; `expandedFromDocument` with
`getNavigatorExpandedScript` from `@oztix/roadie-core/navigator`.

A section chooses what its route shows with `root` on `Navigator.Secondary`:
the generated list (`'list'`, default) or the page alone (`'page'`). A page
can render a section's items itself — `Navigator.SectionItems` for the same
rows as the list pane with each item's `description`, or `useNavigatorSection`
for the data. `Navigator.Item` takes `description`, shown only there.
`Navigator.MenuItem` also takes an optional `description`, shown under its
label and read as its accessible description.
