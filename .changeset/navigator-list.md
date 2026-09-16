---
'@oztix/roadie-components': minor
---

Add `Navigator` and `Pane`, the application frame.

`Navigator` is one navigation model at every size: floating capsules down the
side from `md`, with a brand (the Oztix `Logo` by default), pinned items and an
optional expanded state with labels, and a floating tab bar on phones. An item
always links to its declared `href`, so tapping a top-level item goes to that
section's root wherever you were inside it. Items
declare `placement` and `visibilityPriority`; whatever doesn't fit folds into a
More pane. A section's sub-pages open in a generated list pane, optionally
searchable, and an item can own a `Navigator.Menu` instead of a destination.
`Navigator.Primary` must be a direct child of `Navigator`.

`Pane` is a scrolling column with sticky chrome, a collapse-on-scroll header
and a stack position when panes share a screen. `Navigator.Content` lays panes
out as columns from its own width (two from 46.25rem, three from 76rem) and
stacks them below that. A stacked pane that mounts as the new top slides in
like one that was already there, so a route-driven detail pane animates on a
push; a first paint, hydration and reduced motion never slide. A pop moves the
pane behind, which slides back as the one above it is removed; the pane being
left is not animated out. Swapping a sibling cuts: a commit that replaces a pane
with another at the same depth, leaving the stack the shape it was, is not a
push. Switching top-level item cuts too, whatever stack the incoming route
draws. A section with `root='page'` draws every route in one pane, so a step
between its pages has no pane of its own to move: the page being left is copied
into an inert document and slid away while the arriving one comes over it. That
copy is the one in the frame, and only a page-root step makes one. `Pane.Search`
is a pill search field with a Cancel.

Tap a link and, after 150ms with nothing changed yet, the frame fills with a
slowly turning gradient of three Oztix colours behind the panes and the nav,
and on a phone the panes pull back and round their corners to show it. It goes
when the destination lands, and never appears for a navigation faster than that.
`RoadieLinkProvider` marks a plain click on an internal href and takes
`pendingIndicator={false}` to turn it off; `pending` on a `Pane` reports a wait
Roadie cannot see, such as a route's `loading.tsx`, and
`useReportPendingNavigation` reports one from your own `router.push`.

A pane takes its scroll down against the browser's own id for the history entry
it is on, so going back or forward through history puts every pane where it was
while a new destination still starts at the top. Roadie reads no URL and writes
no history state: it reads `navigation.currentEntry.key`, and where an engine
has no Navigation API panes keep starting at the top.

Also ships `Navigator.ExpandToggle`, `Navigator.OverflowPane`/`OverflowItems`,
`Navigator.SecondaryPane`, and `Navigator.SectionItems` with
`useNavigatorSection` for rendering a section's items in a page. `showList` and
`showMore` put the list and More in the URL; `root='page'` on
`Navigator.Secondary` shows the page alone on the section route;
`expandedFromDocument` pairs with `getNavigatorExpandedScript` from
`@oztix/roadie-core/navigator`.
