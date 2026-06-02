---
"@oztix/roadie-widgets": patch
---

Fix the Vue `CartDrawer` freezing the tab when the drawer is dragged. The
header/footer measurement setters ran on every re-render (Vue re-invokes
template ref callbacks each render), tearing down and re-observing their
`ResizeObserver`; each re-observe fired the callback, whose deferred write
scheduled another render → re-observe → a cross-frame loop that pinned the main
thread. It surfaced as a hard tab freeze with no console error (one render per
tick never trips Vue's in-tick recursion guard), and was worst during a drag
because `dragHeight` re-renders on every pointermove.

`createHeightTracker.setElement` is now idempotent — it (re)observes only when a
genuinely new element arrives and no-ops on same-element / transient-null
re-invocations (real teardown stays in `onScopeDispose`). The header/footer ref
callbacks are also hoisted to stable identities. Adds a regression test
asserting the observer is not re-attached across re-renders.
