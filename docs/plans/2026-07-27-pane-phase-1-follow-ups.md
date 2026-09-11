# Pane Phase 1 — follow-ups and findings

Recorded at the close of Phase 1 so they are not rediscovered. Everything here
was found by implementation or review on `feat/navigator-component`, and each
item was deliberately deferred rather than missed.

## Corrections to the Phase 1 plan itself

The plan was right about the architecture and wrong in several specifics. These
are recorded because the plan text still says otherwise.

- **`transform` is not `translate` in Tailwind v4.** `translate`, `scale` and
  `rotate` compile to independent CSS properties. A `transition-[transform,…]`
  list paired with a `-translate-x-*` utility animates **nothing**. The plan's
  class strings carried this bug and it was introduced and fixed three times
  before being swept. `Drawer` is the one deliberate exception: Base UI writes
  an inline `transform` during a swipe, and `translate` applies before
  `transform`, so a resting `translate` would compose with the drag and double
  it.
- **`content-visibility: auto` was not "the single largest mobile win".** At the
  plan's `-22%` offset a covered pane stayed ~78% on screen and the browser
  correctly kept it relevant, so the declaration was a no-op. It only started
  engaging once the motion rework parked ahead-panes fully off-screen.
- **The plan's `useLayoutEffect` + `paneRef` recipe for `--pane-header-height`
  cannot work.** React commits refs and layout effects bottom-up, so a
  descendant's layout effect always reads Base UI's ancestor-composed ref as
  `null`. `PaneHeader` finds the pane with `closest()` instead, which keeps the
  pre-paint write.
- **Task 12's claim that prefix matching "existed only to stop a pane
  unmounting" was false.** `isPaneSectionActive` was the only prefix-matching
  path in the codebase; deleting it outright broke rail and tab highlighting on
  every component sub-page. Prefix matching now lives in `isBranchActive` for
  branch matching only.
- **The act-warning budget of 17 was not reproducible**, and the command the
  plan gave (`pnpm --filter … test -- <file>`) does not filter at all. Measured
  baselines were 14 filtered / 30 whole-suite; the branch now sits at **2 / 5**.

## Deferred, with reasons

- **The mobile tab bar animates layout-triggering properties.** It transitions
  `padding` and swaps `grid`↔`flex` on every scroll-collapse — a full relayout,
  breaching the branch's own non-negotiable. Also `navigatorTabVariants`
  (`max-width,padding`) and the indicator (`left,top,width,height`). All predate
  this plan. The fix — keep `grid grid-flow-col` in both states, move collapse
  onto `auto-cols-max` plus the tabs' already-interpolating `max-w`, then drop
  `padding` from the transition — is a change to the bar's layout model, not a
  token swap.
- **Resolved 2026-09-11** with `max-lg:invisible` (transitioned, so it flips after the slide), not the attribute, which can't be band-gated. ~~A covered pane is `pointer-events-none` but not `inert`~~, so it stays
  reachable by assistive tech. Explicit stack state makes real `inert`
  tractable; worth doing now the stack is proven.
- **Resolved 2026-09-11:** a tab active through a sub-page now announces `aria-current='true'`. ~~`NavigatorTab` marks a branch-active section `aria-current='page'`~~, so on a
  sub-page below `md` both the tab and the list row announce as current. The tab
  is a section and the row is the page — imprecise rather than broken.
- **From `2xl` the detail pane's header draws an empty ~24px sticky bar.** The
  `Pane.Actions` host renders even though the trigger inside it is `2xl:hidden`.
  The only in-Roadie fix would require `PaneHeader` to know the orchestrator's
  breakpoints, which the architecture forbids; the consumer-side fix is to gate
  `Pane.Actions` on the same condition as the trigger.
- **`PropsDefinitions` emits a duplicate section for every compound** whose root
  sets `displayName = 'X.Root'` — its dedup guard strips a `Root` suffix that is
  never present. Affects all 21 compounds, not just `Pane`.
- **`docs/src/app/debug/rsc-smoke` predates this work and is broken.** Its
  Navigator section also server-authors panes, which is the exact silent-failure
  shape it exists to detect; the prose now says so.
- **`Drawer.Body`'s list unwind reaches direct children only.** A `List` nested
  inside a wrapper lands one inset off, silently. `Pane` has no such limit
  because its body never pads.

## Open design questions

- **Resolved 2026-09-11: removed.** ~~Should `Pane` keep `presentation='sheet' | 'drawer'`?~~ Those values are now
  vestigial: the yielded inspector became a consumer-declared `Drawer`, and
  `role='inspector'` means only "a column from `2xl`, hidden below". Either the
  values become a thin deferral to `Drawer`/`Sheet`, or they go.
- **`CartDrawer` consolidation.** `Drawer.createHandle()` supports detached
  triggers — a trigger anywhere opening a drawer mounted elsewhere with no
  prop-drilling — which is exactly a global cart drawer's shape and the
  strongest argument yet for consolidating. Not exported yet. The open question
  and its constraints are in
  [`docs/brainstorms/2026-07-27-cart-drawer-prompt.md`](../brainstorms/2026-07-27-cart-drawer-prompt.md).
- **Interactive edge-swipe back.** The largest remaining gap between the stack's
  motion and a native push/pop, and not something CSS transitions can express.
  `paneMotion.ts` was deleted when the branch dropped `motion`, so this now
  needs its own implementation.
- **iOS collapse-on-scroll for `Pane.Header`** — the large title shrinking into a
  small centred title in the top row. Landed in Phase 3 as `Pane.BodyTitle`.
