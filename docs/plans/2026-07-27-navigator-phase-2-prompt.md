# Navigator Phase 2 — new-session kickoff prompt

> Paste the block below into a fresh session in `/Users/lukebrooker/Code/roadie`.
> Phase 1 has landed on `feat/navigator-component`; Phase 2 continues on the
> same branch and the same PR.

---

Plan and implement Phase 2 of the Navigator/Pane work on the
`feat/navigator-component` branch.

**Read these first, in order:**

1. `docs/brainstorms/2026-07-27-pane-component-design.md` — the agreed design.
   Phase 2's five capabilities are already designed in §311 (grouping), §394
   (explicit tab slots), §439 (overflow as a Pane), §481 (`Navigator.Panel`) and
   §591 (per-section stack memory). **This is design, not plan** — do not
   re-litigate it except where §"What changed" below says an assumption expired.
2. `docs/plans/2026-07-27-pane-phase-1-follow-ups.md` — what Phase 1 actually
   learned, including four places where the Phase 1 plan was wrong. Read this
   before trusting any Phase 1 plan text.
3. `docs/plans/2026-07-27-pane-component-plan.md` §"Phase 2 preview" — the
   ordering. Note the preview predates Phase 1's divergence.
4. `AGENTS.md`, `docs/contributing/COMPOUND_PATTERNS.md`,
   `docs/contributing/BASE_UI.md`.

**Then use `superpowers:writing-plans`** to produce the Phase 2 plan, and
`superpowers:subagent-driven-development` to execute it. The design is agreed,
so a full brainstorm is not needed — but the open questions below must be
resolved before the plan is written, not during implementation.

## Scope — five capabilities, in this order

1. **`Navigator.Group` rework + `Navigator.GroupTitle`** — sibling markup, `<h2>`
   plus `render`, `aria-labelledby`. Mirrors what `List.Group` already got in
   Phase 1; copy that shape.
2. **Rail list semantics** — `<nav>` gains `<ul>`/`<li>`, and a secondary nests
   inside its primary's `<li>`.
3. **`Navigator.Primary`'s optional `tabs` tuple** — explicit tab-bar slots
   instead of derivation.
4. **`Navigator.Overflow` + `Navigator.OverflowItems`** — the mobile overflow
   becomes a full-screen `Pane`, deleting the bespoke floating-pane machinery.
5. **`Navigator.Panel`** — an item that owns a menu rather than a destination,
   with `~/Code/prototype`'s `PersonaSwitcher` as the proof.
6. **Per-section stack memory** — last value per section retargets its rail item.
   The URL stays the only source of truth for the current section, so the Map
   affects link targets and never rendered arrangement.

## What changed in Phase 1 — resolve these before planning

Phase 1 diverged from its own plan. Four design assumptions are now stale.

- **`Drawer` now exists** (`packages/components/src/components/Drawer/`),
  wrapping Base UI's `drawer` with swipe-to-dismiss, focus trapping, Escape and
  a scrim. The design says `Navigator.Panel` renders as a popover from `md` and
  **a `Pane` below**. That was written when no `Drawer` existed. An account menu
  is transient and dismissible, which is a drawer's job, not a pane's —
  **decide** whether Panel's small-screen form is now a `Drawer`, and say why.
  §439's overflow is a different case and probably still a `Pane`: it is a
  full-screen navigational surface with the tab bar still visible, not an
  overlay.
- **The yielded inspector moved to the consumer.** `role='inspector'` now means
  only "a column from `2xl`, hidden below"; the docs declare their own `Drawer`
  in `Pane.Actions`. Any Phase 2 capability that wanted Roadie to invent an
  overlay should follow that precedent instead: **an application may know its
  own breakpoints; Roadie's internals may not.**
- **`Navigator.Group` was reduced, not preserved.** Phase 1's Task 12 left it as
  a rail label plus an `sr-only` strip label — it has no pane form any more.
  That is the baseline you are reworking from; check the source, not the design.
- **Stack depth is now expressed by DOM order.** `[data-top=true] ~
  [data-top=false]` is *ahead* and parks off-screen right; a plain
  `[data-top=false]` is *behind* and parks a third left. Declaration order is
  therefore a **visual** assumption. Per-section stack memory (§591) must not
  reorder declarations to express memory.
- **`PaneChromeContext` changed shape.** It carries `headerExtras`,
  `onViewportScroll` and `registerScroller`. `headerActions` was removed when the
  inspector moved out. §229's `Pane.SecondaryNav` should be planned against the
  seam as it now is.

## Non-negotiables

Each was established by evidence in Phase 1 and is expensive to rediscover.

- **`Navigator` imports from `Pane`, never the reverse.** `Pane` defines empty
  contexts; `Navigator` fills them. This was violated once in Phase 1 and had to
  be repaired — the repair is what made the top-pane gate work.
- **JS owns depth; CSS owns whether depth matters.** No `matchMedia` or
  breakpoint logic anywhere in `packages/components/src`. Application code in
  `docs/` owning one is deliberate and allowed.
- **Two breakpoints, never conflated.** `md` (768) flips nav form; `lg` (1024)
  flips pane arrangement; `2xl` (1536) is where the inspector yields.
- **Tailwind v4 emits `translate`, `scale` and `rotate` as independent CSS
  properties, never `transform`.** A `transition-[transform,…]` list paired with
  a translate utility animates **nothing**. This bug appeared three times in
  Phase 1. `Drawer` is the one deliberate exception — Base UI writes an inline
  `transform` during a swipe. Compile your classes and check the emitted
  `transition-property` rather than trusting the class string.
- **Only `translate` / `scale` / `opacity`.** Never a layout-triggering property.
- **Author `Pane` / `List.Group` / `Navigator.Content` trees in client
  components, as direct children.** The orchestrator matches by element
  identity; Flight wraps server-authored element types in `React.lazy`, and a
  fragment-wrapped child is skipped the same way. Both fail **silently**.
- **`List` is a selector contract**, not a set of classes:
  `li > [data-slot=list-item] > [data-slot=list-item-content]` by child
  combinator.

## Traps that have already cost time

- **Base UI's `ScrollArea` sets `position: relative` inline** — no class beats
  it; an overlaying pane needs `absolute!`.
- **`react-docgen-typescript` cannot read CVA conditional types.** Inline
  literal unions on public props with exported sibling aliases. Also: a prop
  named after a DOM attribute (`role`) collides, and react-docgen drops it
  silently when the folder is parsed as one program — `Omit` the DOM one.
- **`PropsDefinitions` emits a duplicate section** for every compound whose root
  sets `displayName = 'X.Root'`. Pre-existing, affects all 21 compounds.
- **Act-warning budgets: `Navigator.test.tsx` ≤ 2, whole suite ≤ 5.** Phase 1
  brought these down from 14 / 30 — do not give that back. Note
  `pnpm --filter … test -- <file>` does **not** filter; use
  `cd packages/components && pnpm vitest run <file>`.
- **A test asserting a role or attribute the component never renders passes
  unconditionally.** This shipped repeatedly in Phase 1. Prove each new
  assertion fails against the unfixed code.
- **Never run `prettier --write` on `.mdx`** — it empties the file. The repo's
  `pnpm format` globs exclude `.mdx`, so the hook is safe; the danger is a
  manual invocation.
- **Never run `pnpm --filter docs build` while the docs dev server is running.**
- **Rebuild components before the docs see changes:**
  `pnpm --filter @oztix/roadie-components build`.
- If CI reports a typecheck error that passes locally:
  `find . -name "*.tsbuildinfo" -not -path "*/node_modules/*" -delete`, re-run.

## Definition of done

`pnpm test`, `pnpm typecheck`, `pnpm lint` all pass from a cleared
`tsbuildinfo` state, with act warnings still ≤ 2 / ≤ 5.

Verify in a real browser at `http://localhost:9614` at 390 / 900 / 1200 /
1600px. The browser tool floors at 500px, so use device emulation or read
computed values for true mobile.

The proof for Phase 2 is `~/Code/prototype`'s `PersonaSwitcher`: it currently
writes `<Navigator.End><PersonaSwitcher /></Navigator.End>` and **silently
loses its account menu below `md`**, because `deriveMobileSlots` matches
`Navigator.Item` by reference and the rail's `hidden md:block` takes the whole
`End` with it. `Navigator.Panel` is not done until that migrates and the menu
survives on mobile.

## Out of scope

Don't start the `CartDrawer` / `Sheet` consolidation — that has its own kickoff
at `docs/brainstorms/2026-07-27-cart-drawer-prompt.md`, and `Drawer` existing
now changes its central question. Don't take on the mobile tab bar's
layout-property animations (recorded in the Phase 1 follow-ups) unless item 3
forces you into that file anyway — and if it does, say so rather than folding it
in silently.
