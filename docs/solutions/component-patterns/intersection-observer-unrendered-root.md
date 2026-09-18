---
title: An IntersectionObserver whose root is an unrendered element reports zero rects, which read as "scrolled to the bottom"
date: 2026-09-16
category: component-patterns
problem_type: browser_api_edge_case
components:
  - packages/components
keywords:
  - IntersectionObserver
  - rootBounds
  - display none
  - sentinel
  - Pane
  - Navigator
  - More
  - collapse on scroll
severity: medium
related_files:
  - packages/components/src/components/Pane/PaneRoot.tsx
  - packages/components/src/css/pane-columns.css
---

# An unrendered root reports zero rects

## Symptom

`Pane` collapses its header from scroll sentinels: absolutely positioned boxes
at the top of the scroll content, observed with the pane's own viewport as the
`root`. A sentinel that has left the top of the viewport means the pane is
scrolled past that offset.

Every More pane opened already collapsed. Its title had no height on the first
rendered frame, then grew to full height, so opening More played a reveal
animation that nothing asked for. It happened on every More pane, at every
size.

## Root cause

A row that is not showing More hides the pane with `display: none`
(`pane-columns.css`), and the pane is in the DOM the whole time, so its
`IntersectionObserver` starts observing while the pane has no box.

Chrome still delivers the initial observation for such a target. It reports:

```
isIntersecting: false
rootBounds:           { top: 0, height: 0 }   // not null
boundingClientRect:   { bottom: 0 }
```

The predicate for "scrolled past" was

```ts
!entry.isIntersecting &&
  entry.rootBounds !== null &&
  entry.boundingClientRect.bottom <= entry.rootBounds.top + 0.5
```

`0 <= 0.5` is true, so a pane that is merely unrendered reads as scrolled to the
bottom. It sets `collapsed` before anyone has seen it, and opening it paints one
collapsed frame before the observer re-delivers with real geometry and the
transition plays.

The `rootBounds !== null` guard looks like it covers this, but null is what
Chrome sends for a cross-origin root, not for an unrendered one.

## Fix

Treat an unrendered root as no information rather than as a position. All
entries in one callback share a root, so bail out of the whole callback:

```ts
for (const entry of entries) {
  const root = entry.rootBounds
  // A pane an ancestor hides has no box, and its zero rects would
  // otherwise read as scrolled past: it would open already collapsed.
  if (root === null || root.height === 0) return
  const at = Number((entry.target as HTMLElement).dataset.scrollAt)
  past.set(
    at,
    !entry.isIntersecting && entry.boundingClientRect.bottom <= root.top + 0.5
  )
}
```

The state then keeps whatever it had, which for a pane that has never been shown
is the expanded default.

## Prevention

- **Any threshold compared against `rootBounds` needs a "has a box" guard.** A
  zero rect is a legal reading, and `0 <= threshold` is true for most
  thresholds, so the degenerate case silently picks one branch.
- **Assume a component in a hidden subtree still runs its observers.** Anything
  that mounts hidden and measures at mount is suspect, though a `ResizeObserver`
  recovers on its own: it reports `0` while the element has no box and reports
  again on the frame the ancestor's `display` changes. `PaneHeader` publishes
  `--pane-header-height` that way, so a More pane holds `0px` while hidden and
  the real height from its first rendered frame. `IntersectionObserver` has no
  such recovery, because a zero rect is a legal reading rather than an absent
  one.
- **jsdom cannot catch this.** The regression test reproduces it through
  `reportUnrenderedSentinels` in `Navigator/testUtils`, which sends the zero-rect
  callback a browser sends.
