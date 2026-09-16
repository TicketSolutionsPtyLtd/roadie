---
title: Base UI ScrollArea sets `overflow` inline — Tailwind classes can't clamp an axis
date: 2026-07-26
category: component-patterns
module: components
tags: [base-ui, scroll-area, navigator, overflow, css]
problem_type: best-practice
---

## Problem

`ScrollArea.Viewport` renders with an inline `style={{ overflow: 'scroll' }}`.
An `overflow-x-hidden` (or `overflow-x-clip`) Tailwind class on the same
element loses to it, so content wider than the viewport drags the whole area
sideways even though no horizontal scrollbar is rendered.

`Navigator.Pane` hit this directly: before adopting ScrollArea it relied on
`overflow-y-auto overflow-x-hidden` to stop a long venue name or a wide code
block dragging the pane.

## Solution

Pass the clamp through the `style` prop, which Base UI merges after its own
defaults so the consumer wins:

```tsx
<ScrollArea.Viewport style={{ overflowX: 'clip' }}>
```

`overflow-x: clip` is valid alongside `overflow-y: scroll`; `hidden` is not
(the pair computes back to `auto`).

Verified live in a browser (not just jsdom): with a viewport narrowed until a
docs code sample overflows, setting `viewport.scrollLeft` on the pane's own
container has no effect (`scrollLeft` stays `0`) while the code block's own
`overflow-x-auto` wrapper scrolls independently. `getComputedStyle(viewport)`
reports `overflow-x: hidden` in Chromium even though the source sets `clip` —
Chromium's inspector serializes the resolved `clip`/`scroll` pair back through
the closest legacy keyword, but the behavioural effect (no programmatic or
gestural horizontal scroll) is what matters, and that behaviour holds.

## Related

- Not rendering a horizontal `ScrollArea.Scrollbar` hides the _bar_, not the
  _overflow_ — they are separate concerns.
- `ScrollArea.Content` sets `min-width: fit-content`, which defeats the clamp.
  Omit it on vertical-only areas.
- The scroll container is the viewport, not the root: `scrollTop`, `scrollTo`
  and the `scroll` event all move inward when a component adopts ScrollArea.
- `fade` and `position: sticky` are mutually exclusive. The mask applies to
  everything the viewport paints, so a sticky header fades as it pins. This is
  why `Navigator.Pane` — which owns a sticky `Pane.Header` — opts out.
- **`ScrollArea.Viewport` is a real tab stop whenever it overflows** (Base UI
  gives it `tabIndex=0`), and Roadie's `focus-visible:outline-2
focus-visible:-outline-offset-2` draws a ring around the _entire pane_, not
  a small control. Confirmed in a real Chromium render: the ring is genuinely
  there (computed `outline: oklch(...) solid 2px`, `outline-offset: -2px`),
  visible on close inspection, but at normal viewing distance against
  `intent-border-strong` on a light background it reads as barely-there — a
  keyboard user tabbing through a docs page gets a whole-card highlight they
  may not consciously register as focus. Worth a deliberate design pass
  (stronger contrast, or an inset highlight scoped to visible content) rather
  than treating the current ring as sufficient because it's technically
  present.
- **Base UI hides the platform scrollbar unconditionally.** It ships a
  `.base-ui-disable-scrollbar` rule (`scrollbar-width: none` +
  `::-webkit-scrollbar { display: none }`) on every `ScrollArea.Viewport`,
  regardless of pointer type. Roadie's own thumb additionally opts out on
  touch via `pointer-coarse:hidden` (by design — the thumb is sized for
  hover). The combination means a coarse-pointer (touch) device has **no
  scroll affordance at all**: not Roadie's thumb, and not the OS/browser's own
  transient overlay bar, because that overlay _is_ the native scrollbar this
  rule suppresses. This was confirmed structurally (the stylesheet rule
  applies unconditionally, not gated by a pointer media query) rather than on
  physical hardware. Any consumer relying on a visible touch-scroll cue should
  treat this as a known gap, not assume the platform will fill it in.
