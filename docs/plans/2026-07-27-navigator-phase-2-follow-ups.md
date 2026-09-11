# Navigator Phase 2 — follow-ups and findings

Recorded at the close of Phase 2 (`feat/navigator-component`) so they are not
rediscovered. Phase 1's document,
[`2026-07-27-pane-phase-1-follow-ups.md`](2026-07-27-pane-phase-1-follow-ups.md),
is a record of Phase 1 and stays as it is — this is its sibling for the work
that shipped after it: `Navigator.Group`/`GroupTitle`, rail list semantics,
the `tabs` tuple, `Navigator.Overflow`, `Navigator.Panel`, per-section stack
memory, and the registration rework (Tasks 13–16) that replaced `data-top`
with `data-stack-position`.

## Deliberately deferred, with reasons

- **`Pane.SecondaryNav` was not built.** The automatic header injection covers
  every consumer that shipped on this branch, and the override case it would
  exist for has no consumer asking for it.
- **Resolved 2026-09-11:** folded groups render as titled `List.Group`s. ~~Grouping does not carry into the overflow.~~ A `Navigator.Group` whose
  items fold into the "More" pane does not render as a `List.Group` there —
  the folded items appear as a flat list. `NavigatorSlotMeta` carries no group
  membership, so building this would mean threading a group id through the
  entire slot-derivation walk for a capability nothing currently consumes.
- **`Navigator.End` has no list semantics.** Rail list semantics
  (`<ul>`/`<li>`) were given to the primary and secondary runs; `Navigator.End`
  accepts arbitrary children, so it stayed a plain `<div>`.
- **Whether `Navigator.Panel`'s desktop rendering should be configurable is
  still open.** It renders as a popover from `md`, unconditionally. One value
  until a consumer asks for a second.
- **`Pane`'s `presentation='sheet' | 'drawer'` values are vestigial**
  (carried over from Phase 1): the yielded inspector is now a
  consumer-declared `Drawer`, and `role='inspector'` means only "a column
  from `2xl`, hidden below". Unresolved: either the values become a thin
  deferral to `Drawer`/`Sheet`, or they go.

## Known gaps that should be fixed

- **The mobile tab bar still animates layout-triggering properties.** This
  predates Phase 2 and was explicitly out of scope for it (the Phase 2
  kickoff named it as untouched). Verified still true by live computed style
  during this sweep, not just by reading the class strings:
  - The tab bar `<nav>` (`navigatorTabBarVariants`) has a computed
    `transition-property` of `padding, background-color, box-shadow,
    translate, opacity, visibility` — `padding` is a genuine layout property.
  - Each tab (`navigatorTabVariants`) computed `transition-property` includes
    `max-width, opacity, padding, background-color` — `max-width` and
    `padding` are layout properties.
  - The sliding indicator (`navigatorIndicatorVariants`), when
    `data-ready="true"`, has computed `transition-property: left, top, width,
    height` — all four are layout properties, and none of them are affected
    by the Tailwind v4 `transform`-splitting bug documented in the Phase 1
    follow-ups; the class string names them directly and means exactly what
    it says.

  This breaches the branch's own non-negotiable (animate only
  `translate`/`scale`/`opacity`, never a property that triggers layout). It
  is a pre-existing defect, not something Phase 2 introduced, and fixing it
  is a change to the tab bar's layout model (grid-flow-col in both states,
  moving collapse onto interpolating `max-width` instead of `padding`), not a
  token swap — see the Phase 1 follow-ups for the shape of the fix.

## Genuinely unverified

- **Swipe-to-dismiss on `Navigator.Panel`'s mobile drawer has never been
  exercised by anything.** Two separate implementers (Task 7, Task 9) tried
  and reported it inconclusive: synthetic pointer events do not drive Base
  UI's drag/velocity path, and there is no accessible drag handle for
  automation to grab while the dialog is open. Focus trap and focus
  restoration were verified live (Task 10); swipe-to-dismiss was not, by any
  means, at any point in this plan. It needs a human on a real touch device.
  Do not treat any automated pass as having covered this.

## Verified by compiled CSS, not a live OS toggle

Two `prefers-reduced-motion` checks in this plan were verified by reading the
compiled CSS's `motion-reduce:` rules rather than by toggling the OS
accessibility setting and observing the page:

- Task 12's collapse-on-scroll header animation.
- The general `motion-reduce:transition-none` guard restored across all three
  pane-stack position branches in Task 14's fix round.

Both are recorded as accepted deferrals in the ledger, not failures — but
neither has been seen with a real reduced-motion toggle flipped.

## Corrections to the Task 11 brief itself

The brief predated eight tasks (9, 12–18) that landed after it was written.
Recorded here rather than silently patched over:

- Its grep list for removed identifiers (`navigator-overflow-pane`,
  `FLOATING_PANE`, `navigatorOverflowPaneVariants`,
  `navigatorGroupLabelVariants`, `splitSecondary(`) was Task-4/Task-6 vintage.
  The registration rework (Tasks 13–15) replaced `data-top` with
  `data-stack-position`, and later tasks retired `isTopPane`, `hideOnMobile`,
  `collapseNav`, `SecondaryPane`, and `collectItemMetas`. All of the above are
  confirmed absent from source in this sweep (a stale `.turbo/turbo-dev.log`
  build-cache artifact contains a build-error transcript that names three of
  the old identifiers — not a source match, and not evidence of anything
  still referencing them).
- `splitSecondary.ts` the file legitimately still exists — only the function
  named `splitSecondary` inside it was renamed
  (`splitSecondary` → `splitItemChildren`, Task 6).
- The brief's Step 5 width-behaviour prose (390/900/1200/1600) was Phase-2's
  original scope description; it undersold what actually shipped by the time
  Task 11 ran (`Navigator.Panel`'s popover/drawer split, per-section stack
  memory, the registration rework). The four widths were re-verified against
  what is live on `/components/navigator` and `/components/pane` today.

## The tab bar's layout animations — what is actually fixable

Confirmed by live computed style: the mobile tab bar and its indicator do
animate layout properties, breaching the branch's own non-negotiable. Three
separate offenders, and they are not equally tractable.

**1. The indicator — `transition-[left,top,width,height]`
(`navigatorIndicatorVariants`). Fixable for the tab bar, awkward elsewhere.**

The bar's tabs are equal width by construction —
`auto-cols-[calc((100cqw-2rem)/5)]` — so its indicator only ever needs to
*move*, never resize. `translate` alone, no `scale`, no distortion. A genuine,
contained win.

But the variant serves three surfaces. The **rail** and **strip** have
variable-width items, so they would need `scaleX`, which distorts
`rounded-full` / `rounded-xl` corners and the `emphasis-raised` shadow while
animating. The standard remedy is a counter-scaled inner element. So the tab
bar can be fixed on its own; doing all three is a larger piece of work.

**2. The bar's `padding` (`navigatorTabBarVariants`) — not fixable in place.**

Expanded it is a padded pill (`grid … px-2 py-1 rounded-full
emphasis-floating`); collapsed it is `flex p-0` with no surface at all. The
padding is expressing a real box change, not decorating one.

**3. The tabs' `max-width` (`navigatorTabVariants`) — not fixable in place.**

A non-circle tab goes `max-w-32` → `max-w-0`, shrinking to zero width **while
staying in the accessibility tree**. `scaleX(0)` would hide it visually but it
would keep its grid track, so the two circles could never reach the bar's
edges. The width change is doing load-bearing layout.

### What a real fix looks like

Only by removing the collapsed tabs from the layout entirely: position the two
edge circles absolutely and let the other tabs stop participating, so nothing
needs to interpolate a width or a padding. That is a change to the bar's layout
model — the same conclusion Phase 1 reached — and it needs its own visual pass,
because the expanded bar's rhythm currently comes from those equal grid tracks.

**Do not take the indicator fix alone as "the tab bar no longer animates
layout".** It removes one of three, and the two that remain are the ones doing
the collapsing.
