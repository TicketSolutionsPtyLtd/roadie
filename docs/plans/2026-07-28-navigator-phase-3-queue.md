# Navigator Phase 3 — queued work

Running order. Items are taken top-down; nothing here is started until the item
above it is merged-ready.

## In progress

- **Tab bar stops animating layout** —
  [`2026-07-28-navigator-phase-3-tab-bar-plan.md`](2026-07-28-navigator-phase-3-tab-bar-plan.md).
  Four tasks: one box across both states + the input-blocking fix, indicator on
  `translate`, iOS select bounce, and the strip/`Tabs` shared fragment.

## Queued, user-requested 2026-07-28 (after the tab bar)

These arrived together with screenshots. Reproduce each before fixing — the
diagnoses below are from the screenshots and from reading, not from a running
browser, and every diagnosis written that way on this branch so far has been at
least partly wrong.

### Q1. `Pane.Header`'s collapse transition jumps and flickers

"It currently jumps and flickers and is not smooth at all."

This is Task 12's collapse-on-scroll (two titles cross-fading, only the
collapsed one tappable). The user's two screenshots show the endpoints, not the
transition, so the jump is in between.

Places to look, in order:

- Task 12 shipped a **three-column top row** in its second fix round after the
  compact title overlapped its neighbours. A cross-fade between two elements in
  different grid areas is a prime candidate for a jump.
- The ledger records the collapse being computed **outside** the rAF gate,
  deliberately — jsdom's rAF is a macrotask, so the brief's own tests could
  never have passed against its snippet. That was right for testability; check
  whether it costs a frame in production.
- `prefers-reduced-motion` for this animation was only ever verified by reading
  compiled CSS, never with the OS toggle flipped. Recorded as an accepted
  deferral, still true.
- The header's height changes on collapse. If that is transitioned, it is both a
  layout animation and a likely source of flicker.

### Q2. The docs page title is not aligned with the document

The `Pane.Title` sits noticeably left of the body content. In the user's
screenshot the title's left edge is at roughly 28 CSS px while the body text and
the `Import` heading start near 100 CSS px.

`paneHeaderVariants` pads with `px-(--content-inset)`, but the docs content
column has its own inset on top of that. The title should line up with the
content it heads. Worth checking whether the fix belongs in the docs layout or
in `Pane.Header` — if every consumer wants the header to align with content,
that is a `Pane` concern, not a docs one.

Note the interaction with **Q4** and with Task 22's work: the mobile strip
deliberately bleeds by `-mx-(--content-inset)` to reach the pane's edges, and
`--pane-header-pad-b` exists so the strip can cancel the header's bottom
padding exactly. Changing the header's horizontal inset touches both.

### Q3. `ScrollArea`'s scrollbar runs underneath the header

The screenshot shows the vertical scrollbar continuing up behind the header and
past its rounded top corner, instead of starting below the header.

Relevant known behaviour: **Base UI's `ScrollArea` sets `position: relative`
inline**, and no class beats it — an overlaying pane needs `absolute!`. The
scrollbar is positioned against the viewport, which spans the full pane
including the area the sticky header covers.

### Q4. Scrollbars should sit ~4px from the pane's edge

Currently noticeably further in. `ScrollArea.Scrollbar` takes a `flush` prop
(the rail and the strip both pass it), so check what `flush` already does before
adding a second mechanism — the answer may be to fix `flush` rather than to add
an inset.

Q3 and Q4 are the same component and should be done together.
