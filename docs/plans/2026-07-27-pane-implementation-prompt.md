# Pane implementation — new-session kickoff prompt

> Paste the block below into a fresh session in `/Users/lukebrooker/Code/roadie`.

---

Implement Phase 1 of the Pane component on the `feat/navigator-component` branch.

**Read these first, in order:**

1. `docs/plans/2026-07-27-pane-component-plan.md` — the implementation plan.
   Fourteen TDD tasks. This is what you execute.
2. `docs/brainstorms/2026-07-27-pane-component-design.md` — the agreed design,
   and the *why* behind every decision in the plan. Read it before deviating
   from anything.
3. `AGENTS.md` and `docs/contributing/COMPOUND_PATTERNS.md`.

**Use `superpowers:subagent-driven-development`** — a fresh subagent per task,
with review between tasks. Each task's `Interfaces` block exists because the
implementer sees only their own task; keep that contract exact.

## What this is

`Navigator.Secondary presentation='pane'` conflated declaring navigation with
composing a master–detail layout. `Pane` becomes a standalone component that
owns surface, scroll, chrome and sizing; `Navigator.Content` becomes the sole
orchestrator. Phase 1 delivers `Pane`, the pane stack, responsive
orchestration, the yielded-inspector affordance, `primaryNav`, and the docs
Components browser migration that proves it. Phase 2 (nav grouping, explicit
tab slots, overflow-as-Pane, `Navigator.Panel`, per-section memory) is a
separate plan on the same branch and PR — do not start it.

## Non-negotiables

These were each established by evidence and are expensive to rediscover.

- **JS owns depth; CSS owns whether depth matters.** There are no `matchMedia`
  calls anywhere in this work. Depth is band-independent, derived from panes'
  `current` props; stack styling applies only below `lg`. Resolving breakpoints
  in JS *and* CSS would recreate the exact defect being deleted — `isTopPane`
  plus the `:has()` participation selector, one rule in two languages kept in
  sync by hand.
- **`Navigator` imports from `Pane`, never the reverse.** `Pane` defines an
  empty chrome context; `Navigator` fills it. That one-way dependency is what
  keeps `Pane` usable standalone and avoids a module cycle.
- **Motion: `motion/mini` only**, composed `transform` strings only, springs
  imported explicitly. Hybrid's independent transforms (`x`, `scale`) go
  through CSS variables and are **not** hardware-accelerated — its headline
  feature is the thing to avoid. All of it lives in one helper,
  `packages/components/src/utils/paneMotion.ts`; don't call `animate` directly
  from components.
- **Within a band, animate; across a band, don't.** A resize crossing `md` or
  `lg` changes arrangement instantly. Motion blocks layout animations during
  horizontal window resizing, and it's the transition SwiftUI is most
  criticised for precisely because it isn't solvable well.
- **Two breakpoints, never conflated.** `md` (768) flips nav form (tab bar →
  rail). `lg` (1024) flips arrangement (stack → columns). Today both fire at
  `md`, which is the bug.
- **Author `Pane` / `List.Group` trees in client components.** Flight replaces
  every element type with a `React.lazy` wrapper, so identity walks fail
  *silently*. Canary at `docs/src/app/debug/rsc-smoke/`.
- **`List` is a selector contract**, not a set of classes:
  `li > [data-slot=list-item] > [data-slot=list-item-content]` by child
  combinator. Borrowing class strings gets you nothing and fails past both
  typecheck and tests.
- **Mobile performance requirements** are in the plan's own section. The two
  that are easy to skip: `content-visibility: auto` on covered panes, and
  rAF-coalescing the scroll handler.

## Traps that have already cost time

- Base UI's `ScrollArea` sets `position: relative` **inline** — no class beats
  it; stacked panes need `absolute!`.
- `react-docgen-typescript` can't read CVA conditional types. Inline literal
  unions on public props and export sibling aliases, or the prop vanishes from
  the docs table with no error.
- `Navigator.test.tsx` uses `flushViewportMeasurement()` ~105 times. Any test
  rendering a Navigator must be `async` and await it. The suite's React `act()`
  warning count is **17** and must not grow — check it.
- Dev warnings use `isDev()` from `packages/components/src/utils/isDev.ts`.
  Never `import.meta.env.DEV` — Vite-only, silently never fires in Next.js.
- `noUncheckedIndexedAccess` is on; indexed reads widen to `T | undefined`.
- **Never run `prettier --write` on `.mdx`** — it empties the file.
- **Never run `pnpm --filter docs build` while the docs dev server is running**
  — `next build` corrupts the running `.next`.
- If CI reports a typecheck error that passes locally:
  `find . -name "*.tsbuildinfo" -not -path "*/node_modules/*" -delete` then
  re-run. Stale incremental cache hides errors in untouched files.

## Definition of done

`pnpm test`, `pnpm typecheck`, `pnpm lint` all pass from a cleared
`tsbuildinfo` state, plus the Phase 1 exit criteria at the end of the plan.

Verify in a real browser at `http://localhost:9614` — rebuild components first
(`pnpm --filter @oztix/roadie-components build`), since docs resolve them
through dist. Check 390 / 900 / 1200 / 1600px. The browser tool floors at
500px, so constrain the viewport or read computed widths for true mobile.

**The specific thing to confirm by eye:** the stray hairline above each group
heading in the Components pane is gone. It's the visible symptom of pane rows
borrowing `List`'s class strings while `List` drives its dividers off
`data-slot` selectors — and it should dissolve because the rows are now real
`List.Item`s, not because anything patched it.

## Out of scope

Don't fix `CartDrawer` (findings are recorded at the end of the plan for a
separate piece of work), don't start Phase 2, and don't touch
`presentation='rail'` secondary nav beyond what the plan's delete task
specifies.
