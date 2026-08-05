# Pane as a first-class component — new-session kickoff prompt

> Paste the block below into a fresh session. It carries the idea, the evidence
> that prompted it, what exists today, and the constraints that will otherwise
> be rediscovered painfully. Brainstorm first — do not plan or build until the
> design is agreed.

---

Roadie's `Navigator` currently lets a section's sub-navigation render as a list
pane via `Navigator.Secondary presentation='pane'`. That works, and it ships on
`feat/navigator-component`, but it conflates two different things: **declaring
navigation** and **composing a master–detail layout**.

The proposal is to separate them. A pane list like the docs' Components browser
should not be "secondary nav rendered differently" — it should be an explicit
**Pane** in a master–detail arrangement. `Navigator` keeps what it is genuinely
good at: owning state across panes and orchestrating responsive behaviour.

## The idea

- **`Pane` becomes a first-class, self-contained component** with real
  structure: `Pane.Header`, `Pane.Footer`, and inside the header, slots for
  title, actions, and filters. A pane owns its own chrome instead of borrowing
  the section-nav's.
- **Master–detail is composed explicitly**, not derived from a nav declaration.
  If you want a list pane, you write one.
- **`Navigator` orchestrates.** It keeps cross-pane state and handles the
  small / medium / large screen transitions — which pane is visible, what
  pushes and pops, what sits side by side.
- **Better motion.** Explicit panes should make push/pop animation on mobile
  tractable, and transitions between breakpoints coherent.
- **Desktop orchestration.** Panes could expand, collapse or minimise based on
  context, rather than being fixed columns.

## Why this came up — evidence from the current branch

Read this before deciding the proposal is merely aesthetic. The current design
produced specific symptoms that all point the same way:

1. **Filtering had to be "view-only", and that constraint is an artifact.**
   Filtered-out rows must remain *declared* in the authored children array,
   because `NavigatorPrimary` derives the active pane section by walking those
   children for a branch-active item. Remove a child and the section stops being
   branch-active, `activePaneSecondary` goes undefined, and **the pane you are
   typing into unmounts**. So items hide by rendering `null` while staying
   declared. That is a sound fix for the design as built — but the whole hazard
   exists only because a *view concern* (filtering) is entangled with *nav
   state*. Under an explicit `Pane`, filtering is local and this class of bug
   does not exist.

2. **Route matching had to grow a special case.** Pane sections needed
   `isPaneSectionActive` — prefix matching over the route subtree — because
   any page under `/components` that was not an exactly-declared descendant
   would unhighlight the rail *and* unmount the pane. `Navigator`'s matching is
   deliberately value-equality everywhere else.

3. **The API accreted.** Delivering one list pane required `presentation`,
   `Navigator.Group`, `Navigator.SecondaryPane`, `SecondaryPane.Search`, a
   filter-predicate registry, `leading`/`trailing` media, `keywords`, and four
   separate presentation-aware derivations inside `NavigatorPrimary` and
   `NavigatorItem`. Each addition was individually justified; the total is a lot
   of machinery hanging off "a section's sub-navigation."

4. **Group markup fought the nav model.** `Navigator.Group` renders
   `display: contents` so it stays transparent to the rail's layout — but that
   made a pane-level `<ul>` wrap a `<div>` and `<p>`, which is invalid, so the
   group had to own its own list. A component built for panes would not have
   inherited that tension.

None of this is wasted: the underlying capabilities are real and mostly
reusable. The question is whether they hang off `Navigator.Secondary` or off
`Pane`.

## What exists today (reuse, don't rebuild)

All on `feat/navigator-component`. Roughly 20 commits of relevant work.

**Keep almost certainly:**

- **`Navigator.Pane` + ScrollArea.** Panes render Base UI's `ScrollArea` via a
  function `render` prop, so the pane is still `<section data-slot="navigator-pane">`
  and the scroll container is a nested `<div data-slot="navigator-pane-viewport">`.
- **`emphasis` on the pane** — `raised | normal | subtle | subtler`, where a
  pane's `subtler` deliberately means *no surface at all*, unlike `Card`'s.
- **`hideOnMobile` + participation-based stacking.** Mobile stacking no longer
  keys off `:last-child`. A pane is stacked underneath when a *later sibling is
  still participating*, expressed as a `:has()` selector in CSS and by
  `isTopPane` in JS — one rule, two places, deliberately kept in sync. This
  freed DOM order from being load-bearing.
- **`Pane.Header` publishing its measured height** as
  `--navigator-pane-header-height` on the pane, so sticky content further down
  can offset against it. Measured with a `ResizeObserver`, because the header's
  height genuinely varies.
- **The filter registry shape.** A named-predicate registry where an item shows
  when every registered predicate passes, with text search as the first control
  rather than the mechanism. The extension point is good; only its owner is in
  question.
- **`ComponentSkeleton` / `ComponentThumbnail`** in the docs, and
  `docs/src/lib/component-manifest.ts` as the single source for component
  metadata.

**`List` was reworked after the above, and it changes the picture:**

- **`List.Group` + `List.GroupTitle`** now own grouping. A group renders an
  `<li>` holding its title and its own `<ul>`, so a list can mix loose rows and
  groups and stay valid HTML — the exact problem `Navigator.Group`'s
  `display: contents` had to work around.
- **`contained`** is a new axis: rows as one card with flush square rows, or
  individually rounded rows. With groups, each group becomes its own card and
  titles sit above them.
- **`emphasis` moved off the container onto the rows** (or onto the card when
  `contained`), and now defaults to `subtler`.
- **Dividers are selector-driven** `after:` pseudo-elements. A section hides the
  hairline on its last row, and on the two rows touching any row wearing a fill
  (`:hover`, `:focus-visible`, `[aria-current]`). No prop, no re-render — which
  matters for a long list.
- Groups are styled **entirely from above** via `group-data-*` on the root, so
  `List.Group` knows nothing about the list it sits in.

**Superseded by that work:**

- `Navigator.Group` — grouping now belongs to `List`, and `List`'s version is
  better: valid markup, no `display: contents`, and titles that align with row
  titles by construction.

**Probably rework:**

- `Navigator.Secondary presentation='pane'`, `Navigator.SecondaryPane`,
  `SecondaryPane.Search`, and `isPaneSectionActive`.
- **The pane rows' "borrow List's class constants" approach — this is now
  demonstrably broken.** Navigator's pane rows emit
  `data-slot='navigator-item'` / `navigator-item-content`, but the reworked
  `List` drives its section rules off `data-slot='list-item'` /
  `list-item-content`. The selectors simply don't match, so the divider
  handling silently stopped applying — visible today as a stray hairline above
  each group heading in the docs Components pane. Typecheck and tests stay
  green, because it is a CSS-selector mismatch, not a type error. The borrowed-
  class approach cannot survive a selector-driven `List`.

## Settled — do not relitigate

- `Navigator` keeps ownership of **cross-pane state and responsive
  orchestration**. This is not a proposal to delete `Navigator`.
- The rail's `presentation='rail'` secondary nav stays as it is. It is the
  common case and it works.
- The docs' Components browser is the reference consumer and must keep working:
  filterable, category-grouped, thumbnail rows, master–detail on desktop,
  push/pop on mobile.

## To explore in the brainstorm

- **Where does `Pane` live?** A new top-level Roadie component, or a
  restructured `Navigator.Pane`? What is the import surface?
- **How does `Navigator` orchestrate panes it does not declare?** Context,
  registration, explicit ids? How does a pane know it is the visible one on
  mobile without DOM-order tricks?
- **What is the header contract?** `Pane.Header` with `title`, `actions`,
  `filters` slots — or subcomponents (`Pane.Header.Title`,
  `Pane.Header.Actions`, `Pane.Filters`)? What does `Pane.Footer` carry?
- **How does `Pane` compose a real `List`?** Not whether — the borrowed-class
  approach is broken (above), and `List` now has grouping, containment,
  emphasis and valid markup. The open part is the one thing that drove
  Navigator away from `List.Item` originally: it emits `aria-current="true"`
  while nav rows need `aria-current="page"`. Note the reworked `List` already
  keys its divider rules off bare `[aria-current]`, so it anticipates rows
  carrying it — does `List.Item` grow an `aria-current` pass-through, does
  `selected` imply it, or does the pane render `List.Item`s with `render`?
- **Motion.** What transitions between panes on mobile, and between breakpoints?
  What does the animation need from the component structure to be possible at
  all — shared layout ids, FLIP, view transitions?
- **Desktop orchestration.** Expand / collapse / minimise: what is the state
  model, who owns it, and how is it expressed declaratively?
- **Migration.** Does this replace the current branch's work, build on top of
  it, or start fresh with the good parts cherry-picked? Is the docs Components
  browser migrated in the same pass or after?
- **What does the pane's filter drive now that `List` owns grouping?** Hiding a
  row is easy; hiding a `List.Group` whose rows all filtered out is the case
  that needs an owner.

## Constraints and gotchas — learned the hard way

These cost real time on the current branch. Do not rediscover them.

- **Author Navigator/Pane/List.Group trees in a client component.** Compounds
  that match children by element identity fail *silently* on server-authored
  trees, because Flight replaces each element's type with a `React.lazy`
  wrapper. `List.Group` finds its title this way too — declared in a server
  component, the title lands inside the section instead of above it. There is a
  canary at `docs/src/app/debug/rsc-smoke/`. See `COMPOUND_PATTERNS.md` §1.2.
- **`List`'s styling is a selector contract, not just classes.** Its section
  rules target `li > [data-slot=list-item] > [data-slot=list-item-content]` by
  child combinator. Anything wanting List's row behaviour has to emit those
  slots in that shape — borrowing the class strings alone gets you nothing, and
  fails silently past both typecheck and tests.
- **Base UI's `ScrollArea` sets `position: relative` inline on its root.** No
  Tailwind class beats an inline style — the mobile pane stack needs
  `absolute!` to win. This was dormant for a long time because nothing put two
  panes in the mobile stack at once.
- **`display: contents` removes a box, not a DOM node.** A `<ul>` whose child is
  a `display:contents` wrapper still contains that wrapper — invalid content
  model, and it can cost the list its implicit role in assistive tech.
- **Z-index tiering for scroll affordances.** The scrollbar sits at `z-docked`
  (10): above ordinary content and low-z sticky accents like a group heading, so
  the track is not cut into segments; below `z-sticky` (20), the tier pinned
  chrome uses, so an opaque pane header stops it. Both boundaries were found by
  getting it wrong first.
- **`:has()` is a hard dependency now** (Baseline since Firefox 121), via the
  pane-stack selector.
- **`react-docgen-typescript` cannot drill into CVA conditional types.** A prop
  typed `VariantProps<typeof x>['key']` vanishes silently from
  `<PropsDefinitions>`. Inline the literal union and export a sibling alias.
- **Never run `prettier --write` on `.mdx`** — it empties the file.
- **Never run `pnpm --filter docs build` while the docs dev server is running.**
  `next build` writes into the same `.next` that `next dev` uses and corrupts
  the running server. Stop the server first, or skip the build.
- **Dev-only warnings use `isDev()`** from `packages/components/src/utils/isDev.ts`,
  never `import.meta.env.DEV` (Vite-only; silently never fires in Next.js).
- **`Navigator.test.tsx` has a `flushViewportMeasurement()` helper** used ~105
  times to keep the suite free of React `act()` warnings. Any test rendering a
  Navigator must be `async` and await it. The suite's warning count is currently
  17 and should not grow.
- **`data-slot='navigator-rail'` and `data-slot='navigator-tab-bar'` are
  siblings**, so an unscoped `getByRole('link', …)` can match both. Scope with
  `within(...)`.
- The repo uses `noUncheckedIndexedAccess`; indexed reads widen to `T | undefined`.

## Repo / running

- Monorepo at `/Users/lukebrooker/Code/roadie` (pnpm + turbo). Docs dev server
  runs at http://localhost:9614 (Next 16, `output: 'export'`).
- Components are consumed from dist via a workspace symlink, so after editing
  `packages/components` run `pnpm --filter @oztix/roadie-components build`
  before the docs pick it up.
- Gate: `pnpm test`, `pnpm typecheck`, `pnpm lint`. Verify in a real browser at
  mobile and desktop widths — note the browser tool floors at 500px, so true
  ~390px needs constraining or reading computed widths.

## What this session should produce

A design, not code. Specifically:

1. A clear statement of what `Pane` is, what `Navigator` is, and where the
   boundary sits.
2. The `Pane` API — subcomponents, slots, and how a consumer composes a
   master–detail view.
3. How responsive orchestration works, including what the animation story needs
   from the structure.
4. A migration position: what happens to the current branch's work.
5. Honest scope: this is larger than what it replaces, and it should say so.

Read `docs/brainstorms/2026-07-26-components-list-panel-design.md` for the
design as originally agreed and
`docs/plans/2026-07-26-navigator-secondary-pane-plan.md` for what was built.
Both describe the `Navigator.Secondary presentation='pane'` model this proposal
questions, and neither reflects the later `List` rework — read them as history,
not as the current state of `List`.

The docs Components pane currently has a visible defect from that mismatch (a
stray hairline above each group heading). Don't patch it in isolation — it is
the symptom the redesign should dissolve.
