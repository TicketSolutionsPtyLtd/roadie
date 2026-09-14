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
collapse-on-scroll header and a stack position when panes share a screen. A
new `value` starts the page at its top, while the list it was picked from
keeps its place.

Also ships `Navigator.Menu`/`MenuItem`, `Navigator.ExpandToggle`,
`Navigator.OverflowPane`/`OverflowItems`,
`Navigator.SecondaryPane`/`SecondaryItems`; `showList`/`onShowListChange` to
show a section's list from the URL; `showMore`/`onShowMoreChange` to keep More
in the URL too; `expandedFromDocument` with
`getNavigatorExpandedScript` from `@oztix/roadie-core/navigator`.

A section chooses what its route shows with `root` on `Navigator.Secondary`:
the generated list (`'list'`, default) or the page alone (`'page'`). A page
can render a section's items itself — `Navigator.SectionItems` for the same
rows as the list pane with each item's `description`, or `useNavigatorSection`
for the data. `Navigator.Item` takes `description`, shown only there. Picking
one of those items from the page, and going back, slides in a single column
just as picking from the list does.
`Navigator.MenuItem` also takes an optional `description`, shown under its
label and read as its accessible description.

`Navigator.Content` decides how many pane columns fit from its own width:
two from 46.25rem (55.25rem beside a detail), three from 76rem, stacked
below. The root takes a narrow
column and a detail beside it a wider one; the left-most pane drops first. Back sits on the left-most visible pane and Close on the top pane when
its parent is beside it; both go up one level. `Pane` takes `depth`
(defaulting from `role`), and `Pane.Header`'s `backLabel` names Back for
assistive tech. The inspector yields first; `pane-inspector-yielded:` styles
its affordance. The column rules are a generated stylesheet, about 4KB
gzipped.
