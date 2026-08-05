# Components list-panel — new-session kickoff prompt

> Paste the block below into a fresh session to start this work. It captures the
> current architecture, what to reuse, the settled scope, and the constraints
> that will otherwise bite. The two big scope calls are already made (see
> "Decided" below) — only smaller UX details remain to brainstorm.

---

Change the Components section of the Roadie docs (http://localhost:9614/components) from
the current rail "secondary nav" into a master–detail **list panel**: a scrollable
`Navigator.Pane role='list'` listing every component, each row showing that component's
skeleton preview as its leading image, with **sticky category headers** and a **filter**
input at the top. Selecting a row shows the component's doc in the detail pane.

The scope is settled (see **Decided** below); only a few UX details remain. Briefly
brainstorm those, then write a plan (docs/plans/) and execute it with verification.

## Decided (scope — do not relitigate)
- **Persistent panel for all of /components.** The list panel is THE way to browse
  components everywhere under /components — it replaces the rail's Components secondary
  nav entirely. Layout is always three columns: [rail of top-level sections] +
  [component list panel (master)] + [component doc (detail)]. Opening /components/button
  shows the panel with Button selected and its doc beside it; the bare /components shows
  the panel with an empty/placeholder detail.
- **Replaces the card-grid landing page.** The current grid-of-cards at
  `docs/src/app/components/page.tsx` is superseded by this master–detail list panel;
  there is no separate landing grid afterward.

## Repo / running

- Monorepo at /Users/lukebrooker/Code/roadie (pnpm + turbo). Docs dev server is already
  running at http://localhost:9614 (Next 16). Components consumed from dist via a
  workspace symlink, so after editing packages/components you must
  `pnpm --filter @oztix/roadie-components build` for the docs to pick it up.
- Verify in a real browser at ~390px (mobile) and ~1300px (desktop) with the
  chrome-devtools MCP; the window floors at 500px wide, so simulate 390 by constraining
  or reading content widths. Run `pnpm test`, `pnpm typecheck`, `pnpm lint`,
  `pnpm --filter docs build` before finishing.

## What exists today (reuse, don't reinvent)

- `docs/src/app/components/page.tsx` — the current Components landing page. It ALREADY
  contains a `ComponentSkeleton({ name })` component that renders a per-component skeleton
  preview (button, card, input, dialog, …) and a `Skel` helper. This is exactly the
  "skeleton as the image" the user wants — extract/reuse it as each list row's `leading`.
  It also derives categories from each component's MDX `export const metadata.category`
  and sorts by `categoryOrder = [Actions, Forms, Navigation, Overlays, Content,
Typography, Layout]`.
- `docs/src/app/layout.tsx` `getNavigationItems()` — walks the filesystem to build the
  nav sections/items with titles + categories. This feeds `DocsNavigator`.
- `docs/src/components/Navigation.tsx` `DocsNavigator` — the app shell. The Components
  section currently renders a `Navigator.Item` with a nested `Navigator.Secondary` (the
  secondary nav to replace).
- `@oztix/roadie-components` `Navigator` — master–detail frame. `Navigator.Pane role='list'`
  (width-capped) + `role='detail'` (fills remainder); on mobile panes stack and
  `Navigator.Pane.Header` shows a depth-aware Back/Close. There's a sliding active
  indicator and a `collapseNav` option. The Navigator tree MUST be authored inside a
  client component (RSC identity-walk constraint — see COMPOUND_PATTERNS.md / the
  NavigatorCanary).
- `List` (`@oztix/roadie-components/list`) — `List.Item` has `leading`, `title`,
  `subtitle`, `trailing`, `selected`, `href`, `onClick`, `chevron`. Emphasis
  `subtler | subtle | normal`. NOTE: List has **no** built-in grouping or sticky
  headers — you'll compose category sections yourself (e.g. a sticky `<h2>` per category
  above a per-category `List`, all inside the scrolling list pane).

## Details to settle in the brainstorm
- How the persistent panel coexists with the global `DocsNavigator` shell that wraps
  every page — a Components-specific layout/route group, or a special-case branch in
  `DocsNavigator` when the active section is Components. (The Navigator already supports
  a `list` pane + `detail` pane; the job is wiring the component list into the list pane
  for the whole section and routing the detail to the selected component's doc.)
- Mobile behaviour: list stacks over detail; tapping a row pushes detail (Back), desktop
  shows both side by side (Close). Confirm that's wanted.
- Filter: client-side text filter over component title/name; does it also filter category
  headers (hide empty groups)? Placeholder, clear affordance, empty state?
- Sticky headers: the category header sticks to the top of the list pane's scroll while
  its group is in view (position: sticky within the pane's own scroll container).
- Bare /components detail: default/empty state vs. auto-selecting the first component.

## Constraints / gotchas

- The filter needs client state, so the list panel is a **client** component; the
  component data (name, title, category) must be passed in from the server layer (or
  re-derived), while `ComponentSkeleton` JSX renders per row. Keep the Navigator tree
  client-authored.
- Sticky headers must stick against the PANE's scroll container (the pane owns scroll,
  `overflow-y-auto`), not the window.
- Don't hardcode colors/spacing — use Roadie tokens/utilities (see AGENTS.md). Icons:
  Phosphor `*Icon` bold. Prettier: single quotes, no semicolons; never run prettier on
  .mdx (it empties them).
- Keep the existing Navigator behaviours intact (sliding indicator, collapseNav, pane
  header Back/Close, the 94 aria-current/data-slot tests).

## Definition of done

- /components shows a filterable, category-grouped list with sticky headers and skeleton
  thumbnails as the master pane; selecting a component shows its doc in the detail pane;
  master–detail works on mobile (stacked, Back/Close) and desktop (side by side).
- Filter narrows the list live; sticky category headers behave correctly while scrolling.
- Full gate green (test/typecheck/lint/docs build), verified in-browser at mobile + desktop.
