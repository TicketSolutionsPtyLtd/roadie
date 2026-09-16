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
