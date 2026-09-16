---
module: components/Navigator
tags: [pane, motion, scroll, next-app-router]
problem_type: bug
---

# A route-driven shell is not the shape a docs demo has

`Navigator.Content` keeps drawing a child slot the route has stopped drawing, so
the pane in it slides out instead of vanishing. The slots are
`Children.toArray(children)` keys.

In a nested Next route layout, Content is in the **outermost** layout and gets
one child, `{children}`, with every deeper pane nested inside it. That slot never
empties, so a pane the router removes from inside it is invisible to the slot
comparison and is not retained. Retention works only where Roadie owns the
unmount: a pane that is a direct child of Content, or a page-root step, which
Content re-keys itself.

The same shape hid a scroll bug. `PaneRoot` reads its place from a stack snapshot
that lags one commit, because a pane registers after it renders. On a push the
pane going behind still read as the top, so the scroll-to-top effect zeroed it;
on the pop the same stale place returned early before the restore. The fix is to
restore a remembered history entry before any guard, and to decide "this pane is
the one being navigated to" from `current`, a prop with no lag.

`/debug/stack` is the canary. It is nested route layouts with a list pane and an
event pane in one layout and the ticket pane as its own segment, so Back makes
the router drop a pane while Roadie keeps the others mounted. Measure with a
per-frame trace of `getComputedStyle(pane).translate`, and read the scroll off
`[data-slot="pane-viewport"]` before and after a traversal.

## Why a wrapper around `{children}` cannot fix it

The obvious fix is a `Navigator.Segment` that runs the same presence list around
a nested layout's `{children}`, so the retained element keeps its key in its own
parent. It works for plain React children, and a full jsdom suite for it passes.
It does not work in the App Router, and the reason is worth writing down.

A layout's `children` is not a value. It is a live view onto the router: the
same element every route, rendering whatever the router tree currently says.
Holding it and drawing it again after a pop draws the **new** route's content,
not the old one. Measured in the canary, with the held slot counting the panes
that registered under it:

```
finish-effect saw: [{ "held": 1, "nodes": [0], "panesInDoc": 4 }]
```

One slot held, zero panes drawn under it. The ticket pane was already gone.

This is also why jsdom passed while the browser did not: in a test the children
really are a value, so retaining the element retains the content. Any test for
route-driven retention has to run against a router, not against elements a test
wrote by hand.

What follows from it: keeping a React subtree alive after the router has moved
on needs the subtree to be a value someone still holds. In an App Router shell
nothing holds it, so the only thing left on screen to animate is the DOM node
React detached. That is a different mechanism from retention, and the choice
between them is a product decision, not a technical one.

## The decision

Retention is out. The pane behind sliding back covers the departure, and that is
what ships.

Three shapes were measured, not inferred, and it worked in none of them:

- **A route-driven shell.** Nothing is held. The router's `children` is a live
  view, so the held slot draws the new route: one slot held, zero panes under it.
- **A docs page-root step.** A pane is held, and it draws the page you are going
  to. `/components` to `/components/button` slid a pane reading
  `"Components"` over `"An interactive control that triggers an action when
pressed"`: the old chrome with the new body. That is worse than no animation,
  and worse than the DOM clone it replaced, which copied the real thing.
- **A single page, panes owned by the app.** The content is right, and it still
  does not animate. A click is a discrete event, so React flushes the effect
  that drops the held slot in the same task, before the browser computes a style
  for it. `getAnimations()` is empty, the slot is dropped, nothing moves. A
  one-frame wait before giving up would fix this shape alone.

What would change it: something has to hold the departing subtree as a value.
Nothing in an App Router shell does. `Navigator.Segment`, a wrapper around a
nested layout's `children`, was built and reverted for the reason above. Holding
the detached DOM node instead would animate the real thing without React, and
React's own `<ViewTransition>` would sidestep the question entirely, at the cost
of a peer bump to 19.3, a document-global single-flight transition, and frozen
snapshots of a scrolling pane. Both are open; neither is built.

A page-root step keeps its copy, and the difference is worth being precise
about. A pop **removes** a pane: by the time anything can react, the router has
taken its elements and there is nothing on screen to copy. A page-root step
**replaces** one pane's content: the page it had is still mounted at the moment
React is about to swap it, which `getSnapshotBeforeUpdate` can reach. One has
something to copy and the other does not.

So `NavigatorPageStep` stays, scoped to that step alone, with the hardening it
had: no copy in columns or under reduced motion, built in an inert document,
live elements replaced by sized stand-ins, scripts and `id`, `name`, `form` and
`on*` stripped, inert and hidden from assistive technology, dropped when its
animation settles. What it cost when it was briefly replaced by retention is in
the measurements above: the retained pane drew the page you were going to.

## Judging the docs from a dev server

Rebuilding `packages/components` under a running `pnpm --filter docs dev`
leaves its compiled CSS missing utilities. The Navigator grid then collapses,
`navigator-content` measures a couple of hundred pixels instead of the viewport,
and every row falls to the narrowest tier with a zero-width container. It reads
exactly like a pane rule regression and is not one.

Restarting the dev server is not enough, and neither is clearing
`docs/.next/cache`. `rm -rf docs/.next` is. Check a static export before
believing a dev server about layout: `pnpm --filter docs build` and serve `out/`.
