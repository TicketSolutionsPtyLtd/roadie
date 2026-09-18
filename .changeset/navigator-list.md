---
'@oztix/roadie-components': minor
---

Add `Navigator` and `Pane`, the application frame.

`Navigator` is one navigation model at every size: floating capsules down the
side from `md`, with a brand (the Oztix `Logo` by default), pinned items and an
optional expanded state with labels, and a floating tab bar on phones. An item
always links to its declared `href`, so tapping a top-level item goes to that
destination's root wherever you were inside it. Items declare `placement` and
`visibilityPriority`; whatever doesn't fit folds into a generated More pane. A
destination's pages open in a generated list pane declared with
`Navigator.Secondary`, optionally searchable, and an item can own a
`Navigator.Menu` instead. `Navigator.Primary` must be a direct child of
`Navigator`; `Navigator` wraps everything else in `Navigator.Content` itself,
so `Navigator.Content` is optional.

`Pane` is a scrolling column with sticky chrome, a collapse-on-scroll header
and a stack position when panes share a screen. A bare `Pane` is a detail
(`column` defaults to `'detail'`), so give a root pane `column='list'`. `tabBar`
sets what the phone tab bar does while the pane is top, and `depth` is only for
a pane rendered out of document order: Roadie derives depth from render order
otherwise, on the server too. `Navigator.Content` lays panes out as columns
from its own width (two from 46.25rem, three from 76rem) and stacks them below
that. A stacked pane that mounts as the new top slides in like one that was
already there, so a route-driven detail pane animates on a push; a first
paint, hydration and reduced motion never slide. A pop moves the pane behind,
which slides back as the one above it is removed; the pane being left is not
animated out. Swapping a sibling cuts: a commit that replaces a pane with
another at the same depth, leaving the stack the shape it was, is not a push.
Switching top-level item cuts too, whatever stack the incoming route draws. A
`Navigator.Secondary` with `overview` draws every one of its routes in one
pane, so a step between its pages has no pane of its own to move: the page
being left is copied into an inert document and slid away while the arriving
one comes over it. That copy is the one in the frame, and only an overview
step makes one. `Pane.Search` is a pill search field with a Cancel.

`Pane` and `Pane.Body` each hold a Suspense boundary, so a suspension inside a
pane stops at the pane instead of reaching a route's `loading.tsx`;
`loading.tsx` is optional. Either boundary holds the frame's pending indicator
automatically while it waits, but a transition into a suspending child of the
same pane keeps the old content on screen instead of showing a fallback, so
that case reports nothing automatic; `usePendingNavigation`'s `start`/`stop`
covers it, and `pending` on `Pane` covers a wait Roadie can't see at all, such
as a fetch without Suspense. The indicator itself is app-wide, one glow for the
whole frame: after 150ms with nothing changed yet, it fills with a slowly
turning gradient of three Oztix colours behind the panes and the nav, and on a
phone the panes pull back and round their corners to show it. It goes when the
destination lands, and a navigation faster than 150ms shows nothing.
`RoadieLinkProvider` marks a plain click on the internal href of any Roadie
surface that takes one, and takes `pendingIndicator={false}` to turn it off.

A pane takes its scroll down against the browser's own id for the history entry
it is on, so going back or forward through history puts every pane where it was.
Going forward, the pane the navigation arrives at starts at the top and the pane
it leaves keeps its place. The top of the stack is the deepest `current` pane,
so a layout that leaves `current` on the pane it drilled from keeps that pane's
scroll. Scroll restoration reads no URL and writes no history state: it reads
`navigation.currentEntry.key`, and where an engine has no Navigation API panes
keep starting at the top.

`Pane.Header` keeps `backHref` as a real routed link, but a plain Back or Close
click now traverses browser history when the immediately previous
same-document entry matches its origin, path and query. That preserves the
parent's mounted state and avoids adding a duplicate parent entry. Direct loads,
reloads, unrelated history, modified clicks and browsers without the Navigation
API keep following the canonical link normally.

Also ships `Navigator.ExpandToggle`, `Navigator.SecondaryPane` and
`Navigator.SecondaryItems`, with `useNavigatorSecondary` for reading a
destination's items outside the generated pane. `showList` and `showMore` put
the list and More in the URL; `expandedFromDocument` pairs with
`getNavigatorExpandedScript` from `@oztix/roadie-core/navigator`.
