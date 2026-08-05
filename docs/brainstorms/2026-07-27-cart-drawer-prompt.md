# CartDrawer, Sheet and Drawer — new-session kickoff prompt

> **Sequencing: do this after Pane Phase 1 has landed.** The central question
> below cannot be answered honestly until `Pane` exists and its `sheet` /
> `drawer` presentations are real. Brainstorm first — do not plan or build
> until the boundary is agreed.

---

## Why this exists

Two performance findings surfaced while planning the Pane work, and one design
question they exposed is larger than either.

**Finding 1 — `CartDrawer` animates `height` in pixels through a JS spring.**
`packages/widgets/src/cart-drawer/vue/useCartDrawerDrag.ts:90` and its React
twin run a spring whose `onUpdate` writes `dragHeight`, applied as
`style={{ height: `${dragHeight}px` }}`. That is a layout-triggering property
driven from the main thread on every frame, during a bottom-sheet drag
release — the most touch-sensitive interaction in the product. Motion's
performance guide names `height` first among properties to avoid.

**This has not been measured and is not known to be a problem in practice.**
Establish that before rewriting anything: profile a drag release on a real
mid-range Android device, not a desktop with CPU throttling. If it holds 60fps
there, the finding is a note and not a project.

**Finding 2 — `CartDrawer.tsx:325-327` animates `scale` and `y` individually.**
Motion offers hardware acceleration only for a composed `transform` string —
in React `motion` components as much as in the standalone `animate()`.
Individual transforms route through CSS variables and are not accelerated.
Much smaller than Finding 1: an enter/exit animation, not a per-frame drag.

## The real question

Roadie is about to have **three components with header / body / footer chrome**:

| Component | Status | Chrome |
| --- | --- | --- |
| `Dialog` | Ships today | `Header`, `Body`, `Footer`, `Backdrop`, `Portal`, `Viewport` |
| `Pane` | Lands with Phase 1 | `Header`, `Title`, `Actions`, `Search`, `Footer` |
| `Sheet` / `Drawer` | Doesn't exist | Would need the same again |

And `Pane` already carries `presentation='sheet' | 'drawer'` in its enum,
because the yielded-inspector affordance needs them.

So: **is a bottom sheet a `Pane` with `presentation='sheet'` plus a drag
gesture, or its own component?** A `CartDrawer` is a bottom sheet with drag,
snap points and a scrolling body — which is close to a description of a Pane.

Answering "its own component" means a third chrome implementation. Answering
"a Pane" means `Pane` grows drag and snap points, and a drawer with no
`Navigator` anywhere has to work — which the Phase 1 design explicitly promises
(`Pane` is standalone by construction), but which nothing yet exercises.

Do not assume the answer. The Pane design was reached by studying prior art
(SwiftUI `NavigationSplitView`, Expo Router `Stack`) and naming both what to
take and what to avoid; do the same here. Relevant prior art: SwiftUI's
`.sheet` / `.presentationDetents` (snap points as a first-class concept),
Vaul, and Base UI's own Dialog primitives, which `Dialog` already wraps.

## Constraints — do not rediscover

- **`--cart-drawer-height` is published to `document.documentElement`**
  (`CartDrawer.vue:252`) so page content can offset against the drawer. Any
  move to a transform-driven sheet must still produce that number. This is the
  single hardest constraint in a rewrite and the reason `height` was chosen
  originally.
- **React and Vue skins must stay at parity, and Vue must spring values via
  motion's framework-agnostic `animate`** — not CSS transitions. Both skins
  already share the `useCartDrawerDrag` shape; keep them converged rather than
  letting one lead.
- **Vue widget skins use Tailwind and Roadie utilities**, never hand-rolled CSS.
- **Never animate a layout-triggering property** — `height`, `width`,
  `padding`, `top`/`left`. Only `transform` and `opacity`.
- **Composed transform strings only**, in React components as much as in
  `animate()`.
- **`motion/mini` (2.3kb) is the accelerated build.** The hybrid build (18kb)
  exists largely to add independent transforms, which are the unaccelerated
  ones. `packages/components/src/utils/paneMotion.ts` already wraps this
  correctly — read it before writing new animation code.
- **Reduced motion**: the drag hook already branches on it. Preserve that.

## What to read

- `docs/brainstorms/2026-07-27-pane-component-design.md` — the Pane design,
  especially the `presentation` axis and why `column` is the only value the
  orchestrator resolves.
- `docs/plans/2026-07-27-pane-component-plan.md` — its mobile performance
  requirements section, and the CartDrawer findings recorded at the end.
- `packages/components/src/components/Dialog/` — the existing chrome compound.
- `packages/widgets/src/cart-drawer/` — both skins and the shared drag hook.
- `docs/plans/2026-05-26-shared-cart-drawer-design.md` and
  `-implementation.md` — the original design, as history.

## What this session should produce

A design, not code:

1. Whether `Sheet` / `Drawer` are components, `Pane` presentations, or both —
   and where the chrome implementation lives so there is one and not three.
2. Whether `CartDrawer` becomes a consumer of that, or stays bespoke.
3. A measured answer on the `height` animation, with a profile from a real
   device, before any rewrite is justified.
4. An honest migration position: `CartDrawer` ships in production, so the bar
   for churning it is higher than for the Pane work.
