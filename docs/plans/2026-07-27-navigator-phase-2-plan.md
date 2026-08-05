# Navigator Phase 2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give `Navigator` the five capabilities §311–§591 of
[the design](../brainstorms/2026-07-27-pane-component-design.md) describe —
grouping with real heading semantics, list semantics in the rail, explicit tab
slots, a composable overflow that is a `Pane`, item-owned panels, and
per-section stack memory — on `feat/navigator-component`, in the same PR as
Phase 1.

**Architecture:** Everything new is expressed with the seams Phase 1 built.
`Navigator` imports from `Pane`, never the reverse. JS resolves *what* (which
pane is top, which item is a panel, what a section's link points at); CSS
resolves *whether it matters* (which band you are in). Two new pieces of state
join `NavigatorContext` — the overflow's open flag and a per-section memory
Map — and both are written from effects so the first render is identical on
server and client.

**Tech Stack:** React 19, TypeScript strict (`noUncheckedIndexedAccess`), CVA,
Tailwind v4, Base UI (`ScrollArea`, `Popover`, `Drawer`), Vitest + React
Testing Library.

## Global Constraints

Every task's requirements implicitly include this section. Each item cost time
on this branch already.

- **`Navigator` imports from `Pane`; `Pane` never imports from `Navigator`.**
  `Pane` defines empty contexts, `Navigator` fills them.
- **No `matchMedia`, no breakpoint logic, anywhere in
  `packages/components/src`.** JS owns depth; CSS owns whether depth matters.
  Application code in `docs/` owning a breakpoint is allowed.
- **Two breakpoints, never conflated.** `md` (768) flips nav form; `lg` (1024)
  flips pane arrangement; `2xl` (1536) is where the inspector yields. Anything
  about the rail, the tab bar, the overflow or a panel is a **nav-form**
  concern and uses `md:`.
- **Tailwind v4 emits `translate`, `scale` and `rotate` as independent CSS
  properties, never `transform`.** A `transition-[transform,…]` list paired
  with a translate utility animates nothing. Verify by compiling and reading
  the emitted `transition-property`, not by reading the class string.
  `Drawer` is the one deliberate exception (Base UI writes an inline
  `transform` during a swipe).
- **Only `translate` / `scale` / `opacity` are animated.** Never a
  layout-triggering property.
- **Author `Pane` / `List.Group` / `Navigator.Content` / `Navigator.Primary`
  trees in client components, as direct children.** The orchestrator matches by
  element identity; Flight wraps server-authored element types in `React.lazy`,
  and a fragment-wrapped child is skipped the same way. Both fail silently.
- **`List` is a selector contract**, not a set of classes:
  `li > [data-slot=list-item] > [data-slot=list-item-content]` by child
  combinator.
- **Don't type public props as `VariantProps<typeof x>['k']`.** Inline the
  literal union and export a sibling alias — `react-docgen-typescript` cannot
  drill into CVA conditional types and drops the prop silently.
- **A prop named after a DOM attribute (`role`) collides** — `Omit` the DOM one
  from the props type, as `PaneRootProps` already does.
- **Dev-only warnings use `isDev()`** from `packages/components/src/utils/isDev.ts`,
  and fire from an effect, never from render (React 19 double-invokes render in
  StrictMode).
- **Act-warning budgets: `Navigator.test.tsx` ≤ 2, whole suite ≤ 5.** Phase 1
  brought these down from 14 / 30. Any test that renders a Navigator must be
  `async` and `await flushViewportMeasurement()`.
- **`pnpm --filter … test -- <file>` does not filter.** Use
  `cd packages/components && pnpm vitest run <file>`.
- **Prove every new assertion fails against the unfixed code.** A test
  asserting a role or attribute the component never renders passes
  unconditionally; that shipped repeatedly in Phase 1.
- **Base UI's `ScrollArea` sets `position: relative` inline** — no class beats
  it; an overlaying pane needs `absolute!`.
- **Never run `prettier --write` on `.mdx`** (it empties the file) and never run
  `pnpm --filter docs build` while the docs dev server is running.
- **Rebuild components before the docs see changes:**
  `pnpm --filter @oztix/roadie-components build`.
- If CI reports a typecheck error that passes locally:
  `find . -name "*.tsbuildinfo" -not -path "*/node_modules/*" -delete`, re-run.

---

## Decisions taken before planning

The kickoff required four stale assumptions to be resolved. Each is settled
here, with the reasoning, so no task re-litigates it.

### 1. `Navigator.Panel` below `md` is a full-screen `Pane`, toggled by its own tab

**Superseded after Task 24.** This decision originally chose a `Drawer` below
`md`. Having seen the drawer in a real consumer, the user ruled for the
design's original `Pane` — but as a **tab**, not a pushed screen: on mobile
the panel item is already a tab, and a tab that opens something should read
as another tab, not as an overlay or a screen you back out of.

The two arguments for the drawer don't survive contact with what shipped:

- **"A panel cannot join the stack without portalling."** True of the stack
  Phase 1 built, where panes were `Navigator.Content`'s declared children —
  but Task 5 moved registration to `PaneStackContext`, so a pane announces
  itself rather than being found by a children walk. A portal still doesn't
  work, because a portal preserves the React tree's context from where it's
  *declared*, not where it lands — a panel pane portalled out of the rail
  would still see no `PaneStackContext`. The actual answer is the pattern
  `Navigator.Content` already uses for the generated overflow fallback: it
  renders the panel's pane itself, reading the panel's content off
  `NavigatorContext` by value.
- **"A panel is transient, so it should be a drawer, not a stack pane."** The
  panel is now a pane, but not a *pushed* one in the sense that mattered here
  — it carries no `Pane.Header`, no Back, no Close. It's the panel item's own
  tab reading `aria-expanded`/`aria-current` while its content is showing;
  dismissal is tapping another tab, tapping this one again, or Escape. What's
  given up against the drawer: swipe-to-dismiss, the scrim, and Base UI's
  focus trap — none of which a tab affords anyway.

So: **popover anchored to the rail item from `md`; below it, the panel
item's own tab toggles a full-screen pane, `primaryNav='visible'` so the bar
stays.** Both renderings stay free of `matchMedia` — the rail is
`hidden md:block`, the tab bar is `md:hidden`, and neither trigger can fire in
the band it does not own.

### 2. `Navigator.Overflow` is a `Pane`, and it is declared inside `Navigator.Content`

The kickoff's read is right — a full-screen navigational surface with the tab
bar still visible is a `Pane`. But the same structural rule as above applies:
the stack is Content's direct children, so the overflow pane is authored
**there**, not inside `Navigator.Primary` where today's floating pane lives:

```tsx
<Navigator.Content>
  <Pane role='list'>…</Pane>
  <Pane role='detail' current>…</Pane>
  <Navigator.Overflow>
    <Pane.Header><Pane.Title>Menu</Pane.Title></Pane.Header>
    <PromoCard />
    <Navigator.OverflowItems />
  </Navigator.Overflow>
</Navigator.Content>
```

The open flag moves from `NavigatorPrimary`'s local state to
`NavigatorContext`, so the More tab and the pane — different subtrees — read
one source. When no `Navigator.Overflow` is declared, `Navigator.Content`
appends one itself holding just the generated list: today's behaviour, re-homed.

The pane is `md:hidden`, because the overflow only exists in the band that has
a tab bar. Without that it would take a real column at `lg`+.

### 3. Per-section memory never reorders declarations

Stack depth is now DOM order — `[data-top=true] ~ [data-top=false]` is *ahead*,
a plain `[data-top=false]` is *behind*. Declaration order is therefore a visual
assumption. The Map holds `section value → href` and is read **only** where a
link target is computed (`NavigatorItem`'s anchor, the tab's `href`). Nothing
downstream of it renders, reorders, or re-marks anything. Tests in Task 9 pin
that.

### 4. `Pane.SecondaryNav` is not in this phase

`PaneChromeContext` carries `headerExtras`, `onViewportScroll` and
`registerScroller`; `headerActions` went with the inspector. The design's own
open question — "whether `Pane.SecondaryNav` ships in v1 at all" — answers
itself against that seam: automatic header injection covers every consumer
that exists, the override has none, and it is the design's only piece of
implicit behaviour. Not built. Recorded in the follow-ups at the end.

### Out of scope, confirmed

- The mobile tab bar's layout-property animations (`padding`, `grid`↔`flex`,
  `navigatorTabVariants`' `max-width,padding`, the indicator's
  `left,top,width,height`). Task 5 touches `NavigatorPrimary`'s tab rendering
  but **not** the bar's layout model. If a task finds itself forced into that
  change, stop and say so rather than folding it in.
- `CartDrawer` / `Sheet` consolidation — separate kickoff.
- `inert` on covered panes; interactive edge-swipe back; iOS
  collapse-on-scroll for `Pane.Header`.

---

## File structure

**Created**

| File | Responsibility |
| --- | --- |
| `packages/components/src/components/Navigator/NavigatorGroupTitle.tsx` | `<h2>` + `render`, id injected by its group |
| `packages/components/src/components/Navigator/NavigatorOverflow.tsx` | The overflow `Pane`; reads `overflowOpen` for its `current` |
| `packages/components/src/components/Navigator/NavigatorOverflowItems.tsx` | The generated `List` of folded items |
| `packages/components/src/components/Navigator/NavigatorPanel.tsx` | Marker + content holder for an item's menu |
| `packages/components/src/components/Navigator/NavigatorPanelPane.tsx` | The tab bar's below-`md` rendering of a panel — a full-screen `Pane`, Task 24 (superseded `NavigatorPanelDrawer.tsx`) |
| `packages/components/src/components/Navigator/railList.tsx` | Wraps rail children into `<ul>`/`<li>` runs |
| `packages/components/src/components/Navigator/sectionMemory.ts` | Pure helpers for the per-section Map |

**Modified**

| File | Change |
| --- | --- |
| `NavigatorGroup.tsx` | `label` prop → `Navigator.GroupTitle` child; sibling `<h2>` + own `<ul>`; `aria-labelledby` |
| `NavigatorSecondary.tsx` | `<nav>` gains a `<ul>`; items wrapped in `<li>` |
| `NavigatorPrimary.tsx` | rail list semantics; walks into groups; `tabs` tuple; overflow state lifted out; panel tabs |
| `NavigatorItem.tsx` | `<li>`-aware; panel → popover disclosure; remembered href |
| `NavigatorContent.tsx` | recognises `Navigator.Overflow` as a stack entry; appends a fallback; registers its own presence |
| `NavigatorContext.ts` | `overflowOpen`, `setOverflowOpen`, `overflowPaneId`, `overflowItems`, `setOverflowItems`, `sectionMemory`, `rememberSection`, `hasContent`, `setHasContent` |
| `NavigatorRoot.tsx` | holds the new state |
| `splitSecondary.ts` | `splitItemChildren` returns `{ label, secondary, panel }`; group-aware primary walk |
| `variants.ts` | group title/list variants; overflow pane variants replaced; floating-pane variants deleted |
| `index.tsx` (Navigator) | exports `GroupTitle`, `Overflow`, `OverflowItems`, `Panel` |
| `Navigator.test.tsx` | new suites per task |
| `docs/src/app/components/navigator/page.mdx` | grouping, tabs, overflow, panel sections |
| `docs/src/app/debug/rsc-smoke/NavigatorCanary.tsx` | `Navigator.Group` migrated off `label` |
| `~/Code/prototype/src/components/account/PersonaSwitcher.tsx` + `AppNavigator.tsx` | migrated to `Navigator.Panel` |

---

## Task 1: `Navigator.GroupTitle` and the reworked `Navigator.Group`

Mirrors what `List.Group` got in Phase 1: the title is a child, not a prop; the
group injects a `useId` into it and points its `<ul>` at that id with
`aria-labelledby`. The DOM deliberately diverges from `List.Group`'s — `List`'s
root *is* a `<ul>` so a group must nest inside it, while `Navigator`'s root is
a landmark, so the group emits a **fragment of two siblings**: its title and
its own list.

**Files:**
- Create: `packages/components/src/components/Navigator/NavigatorGroupTitle.tsx`
- Modify: `packages/components/src/components/Navigator/NavigatorGroup.tsx`
- Modify: `packages/components/src/components/Navigator/variants.ts` (replace `navigatorGroupLabelVariants`)
- Modify: `packages/components/src/components/Navigator/index.tsx`
- Modify: `docs/src/app/debug/rsc-smoke/NavigatorCanary.tsx:69-74`
- Test: `packages/components/src/components/Navigator/Navigator.test.tsx`

**Interfaces:**
- Produces: `NavigatorGroupTitle` (`displayName 'Navigator.GroupTitle'`),
  `NavigatorGroupTitleProps = ComponentProps<'h2'> & { render?: (props: ComponentProps<'h2'>) => ReactElement }`;
  `NavigatorGroupProps = { children?: ReactNode; className?: string }` — **no
  `label`**; `navigatorGroupTitleVariants`, `navigatorGroupListVariants`.
- Consumes: `NavigatorPresentationContext` (`'rail' | 'strip'`), already exported.

- [ ] **Step 1: Write the failing tests**

Add to `Navigator.test.tsx`:

```tsx
describe('Navigator.Group', () => {
  it('associates its list with its title in the rail', async () => {
    render(
      <Navigator value='/events'>
        <Navigator.Primary aria-label='Main'>
          <Navigator.Item value='/events' href='/events'>
            Events
            <Navigator.Secondary aria-label='Events sections'>
              <Navigator.Group>
                <Navigator.GroupTitle>Formats</Navigator.GroupTitle>
                <Navigator.Item value='/events/live' href='/events/live'>
                  Live
                </Navigator.Item>
              </Navigator.Group>
            </Navigator.Secondary>
          </Navigator.Item>
        </Navigator.Primary>
      </Navigator>
    )
    await flushViewportMeasurement()

    const title = screen.getByRole('heading', { name: 'Formats', level: 2 })
    const list = document.querySelector('[data-slot="navigator-group-list"]')
    expect(list).not.toBeNull()
    expect(list).toHaveAttribute('aria-labelledby', title.id)
    expect(title.id).not.toBe('')
  })

  it('renders the title and the list as siblings, not nested', async () => {
    render(
      <Navigator value='/events'>
        <Navigator.Primary aria-label='Main'>
          <Navigator.Item value='/events' href='/events'>
            Events
            <Navigator.Secondary aria-label='Events sections'>
              <Navigator.Group>
                <Navigator.GroupTitle>Formats</Navigator.GroupTitle>
                <Navigator.Item value='/events/live' href='/events/live'>
                  Live
                </Navigator.Item>
              </Navigator.Group>
            </Navigator.Secondary>
          </Navigator.Item>
        </Navigator.Primary>
      </Navigator>
    )
    await flushViewportMeasurement()

    const title = screen.getByRole('heading', { name: 'Formats' })
    const list = document.querySelector('[data-slot="navigator-group-list"]')
    expect(list?.contains(title)).toBe(false)
    expect(title.nextElementSibling).toBe(list)
  })

  it('honours render on the title', async () => {
    render(
      <Navigator value='/events'>
        <Navigator.Primary aria-label='Main'>
          <Navigator.Item value='/events' href='/events'>
            Events
            <Navigator.Secondary aria-label='Events sections'>
              <Navigator.Group>
                <Navigator.GroupTitle render={(p) => <h3 {...p} />}>
                  Formats
                </Navigator.GroupTitle>
                <Navigator.Item value='/events/live' href='/events/live'>
                  Live
                </Navigator.Item>
              </Navigator.Group>
            </Navigator.Secondary>
          </Navigator.Item>
        </Navigator.Primary>
      </Navigator>
    )
    await flushViewportMeasurement()
    expect(
      screen.getByRole('heading', { name: 'Formats', level: 3 })
    ).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run the tests and confirm they fail for the right reason**

Run: `cd packages/components && pnpm vitest run src/components/Navigator/Navigator.test.tsx -t 'Navigator.Group'`

Expected: FAIL — `Navigator.GroupTitle is not a function` / no
`[data-slot="navigator-group-list"]` element. If any of the three passes,
the assertion is not testing what it claims; fix it before continuing.

- [ ] **Step 3: Create `NavigatorGroupTitle.tsx`**

```tsx
import type { ComponentProps, ReactElement } from 'react'

import { cn } from '@oztix/roadie-core/utils'

import { navigatorGroupTitleVariants } from './variants'

export type NavigatorGroupTitleProps = ComponentProps<'h2'> & {
  /**
   * Replace the rendered element. The default `<h2>` matches `Pane.Header`
   * and `List.GroupTitle`, so it never collides with the page's `<h1>` —
   * pass `render` when the page's outline needs a different level.
   */
  render?: (props: ComponentProps<'h2'>) => ReactElement
}

/** Heading for a `Navigator.Group`. Declare it as the group's first child. */
export function NavigatorGroupTitle({
  className,
  render,
  ...props
}: NavigatorGroupTitleProps) {
  const resolved = {
    'data-slot': 'navigator-group-title',
    className: cn(navigatorGroupTitleVariants(), className),
    ...props
  }
  return render ? render(resolved) : <h2 {...resolved} />
}

NavigatorGroupTitle.displayName = 'Navigator.GroupTitle'
```

- [ ] **Step 4: Replace `navigatorGroupLabelVariants` in `variants.ts`**

Delete `navigatorGroupLabelVariants` and add:

```ts
// The group heading: a quiet sentence-case label above its own list in the
// rail. On the mobile strip — one horizontal row with nowhere to put a
// heading — the group flattens and the heading is screen-reader-only, so the
// strip case never reaches this variant.
export const navigatorGroupTitleVariants = cva([
  'pt-3 pr-3 pb-1 pl-12 text-xs font-semibold text-subtler'
])

// A group's own list. `grid` so it stacks in the rail's flex column with the
// same rhythm as a loose run of items.
export const navigatorGroupListVariants = cva(['grid gap-1'])
```

Update the export list in `Navigator/index.tsx` accordingly
(`navigatorGroupLabelVariants` out, the two new names in).

- [ ] **Step 5: Rewrite `NavigatorGroup.tsx`**

```tsx
'use client'

import {
  Children,
  type ReactNode,
  cloneElement,
  isValidElement,
  use,
  useId
} from 'react'

import { cn } from '@oztix/roadie-core/utils'

import {
  NavigatorGroupTitle,
  type NavigatorGroupTitleProps
} from './NavigatorGroupTitle'
import { NavigatorPresentationContext } from './NavigatorPresentationContext'
import { navigatorGroupListVariants } from './variants'

export type NavigatorGroupProps = {
  /** `Navigator.GroupTitle` followed by the group's `Navigator.Item`s. */
  children?: ReactNode
  className?: string
}

/**
 * A headed run of `Navigator.Item`s, in the primary rail or inside a
 * `Navigator.Secondary`.
 *
 * Emits a fragment of two siblings — its title and its own `<ul>` — which the
 * rail lays out directly. `Navigator`'s root is a landmark rather than a list,
 * so a group has no `<li>` to nest inside the way `List.Group` does; a `<nav>`
 * may hold several lists. The authoring convention is identical either way.
 *
 * On the mobile strip the group flattens: the title goes `sr-only` and the
 * items render inline, because a single horizontal row has nowhere to put a
 * heading.
 *
 * Author inside a client component. The title is found by element reference,
 * and Flight replaces the type of every element authored in a server component
 * with a `React.lazy` wrapper. See COMPOUND_PATTERNS.md §1.2.
 */
export function NavigatorGroup({ children, className }: NavigatorGroupProps) {
  const presentation = use(NavigatorPresentationContext)
  const titleId = useId()
  const title: ReactNode[] = []
  const rows: ReactNode[] = []
  let titleChildren: ReactNode = null

  Children.forEach(children, (child) => {
    if (
      isValidElement<NavigatorGroupTitleProps>(child) &&
      child.type === NavigatorGroupTitle
    ) {
      // Injected rather than required from the call site: the association is
      // what makes the run announce as a named list, and it should not be
      // something a consumer can forget.
      title.push(cloneElement(child, { id: titleId }))
      titleChildren = child.props.children
      return
    }
    rows.push(child)
  })

  if (presentation === 'strip') {
    return (
      <>
        {titleChildren !== null ? (
          <span className='sr-only'>{titleChildren}</span>
        ) : null}
        {rows}
      </>
    )
  }

  return (
    <>
      {title}
      <ul
        data-slot='navigator-group-list'
        aria-labelledby={title.length > 0 ? titleId : undefined}
        className={cn(navigatorGroupListVariants(), className)}
      >
        {rows.map((row, index) => (
          <li key={index}>{row}</li>
        ))}
      </ul>
    </>
  )
}

NavigatorGroup.displayName = 'Navigator.Group'
```

Note the strip branch renders the title's **text**, not its heading:
`sr-only` is a visual hide that deliberately keeps content in the
accessibility tree, so an `<h2>` there would put a heading in the outline for
a horizontal control row. Wrapping the element instead of its children looks
equivalent and is not.

Cover it with a test — the strip presentation of a group is what let this slip
through. The strip is what `NavigatorPaneChrome` renders, so the test needs a
`Navigator.Content` with a current `Pane` and the group inside the active
item's `Navigator.Secondary`; follow the existing mobile-strip tests' setup
rather than inventing one.

- [ ] **Step 6: Wire the new export**

In `packages/components/src/components/Navigator/index.tsx` add
`GroupTitle: typeof NavigatorGroupTitle` to the type intersection,
`Navigator.GroupTitle = NavigatorGroupTitle`, and
`export type { NavigatorGroupTitleProps } from './NavigatorGroupTitle'`.

- [ ] **Step 7: Migrate the RSC canary**

`docs/src/app/debug/rsc-smoke/NavigatorCanary.tsx:69-74` — replace
`<Navigator.Group label='Formats'>` with:

```tsx
<Navigator.Group>
  <Navigator.GroupTitle>Formats</Navigator.GroupTitle>
```

Leave the canary's assertions and prose alone; they check that the group
renders at all, which is still the point.

- [ ] **Step 8: Run the tests and typecheck**

Run: `cd packages/components && pnpm vitest run src/components/Navigator/Navigator.test.tsx`
Expected: PASS, act warnings ≤ 2.

Run: `pnpm typecheck`
Expected: PASS. A `label` prop left anywhere is a compile error — that is the
intended migration signal.

- [ ] **Step 9: Commit**

```bash
git add packages/components/src/components/Navigator docs/src/app/debug/rsc-smoke/NavigatorCanary.tsx
git commit -m "feat(navigator): rework Group around a GroupTitle child with aria-labelledby"
```

---

## Task 2: Rail list semantics

The rail's `<nav>` gains real lists: loose items batch into a `<ul>`, each item
is an `<li>`, and a section's `Navigator.Secondary` nests **inside its
primary's `<li>`** so the hierarchy is expressed by nesting rather than by
indentation alone.

This applies to the rail only. The mobile strip renders
`secondaryNav.children` directly — not the `Navigator.Secondary` element — so
it keeps its flat flex row, which is what the design's degradation table asks
for.

**Files:**
- Create: `packages/components/src/components/Navigator/railList.tsx`
- Modify: `packages/components/src/components/Navigator/NavigatorSecondary.tsx`
- Modify: `packages/components/src/components/Navigator/NavigatorPrimary.tsx:349-380`
- Test: `packages/components/src/components/Navigator/Navigator.test.tsx`

**Interfaces:**
- Produces: `wrapRailRun(children: ReactNode): ReactNode[]` from `railList.tsx`
  — maps children, wrapping each run of consecutive `Navigator.Item`s in a
  `<ul>` of `<li>`s and passing everything else (Brand, End, Group) through
  untouched.
- Consumes: `NavigatorItem`, `NavigatorGroup`, `NavigatorBrand`, `NavigatorEnd`
  by element identity.

- [ ] **Step 1: Write the failing tests**

```tsx
describe('rail list semantics', () => {
  it('wraps loose primary items in a list', async () => {
    render(
      <Navigator value='/a'>
        <Navigator.Primary aria-label='Main'>
          <Navigator.Item value='/a' href='/a'>
            A
          </Navigator.Item>
          <Navigator.Item value='/b' href='/b'>
            B
          </Navigator.Item>
        </Navigator.Primary>
      </Navigator>
    )
    await flushViewportMeasurement()

    const rail = document.querySelector('[data-slot="navigator-rail"]')!
    const list = rail.querySelector('ul')!
    expect(list.children).toHaveLength(2)
    expect(Array.from(list.children).every((li) => li.tagName === 'LI')).toBe(
      true
    )
  })

  it('nests a secondary inside its own primary list item', async () => {
    render(
      <Navigator value='/events/live'>
        <Navigator.Primary aria-label='Main'>
          <Navigator.Item value='/events' href='/events'>
            Events
            <Navigator.Secondary aria-label='Events sections'>
              <Navigator.Item value='/events/live' href='/events/live'>
                Live
              </Navigator.Item>
            </Navigator.Secondary>
          </Navigator.Item>
        </Navigator.Primary>
      </Navigator>
    )
    await flushViewportMeasurement()

    const rail = document.querySelector('[data-slot="navigator-rail"]')!
    const secondary = rail.querySelector('[data-slot="navigator-secondary"]')!
    const owningItem = secondary.closest('li')!
    expect(owningItem.querySelector('a[href="/events"]')).not.toBeNull()
    expect(secondary.querySelector('ul > li a[href="/events/live"]')).not.toBeNull()
  })
})
```

- [ ] **Step 2: Run the tests and confirm they fail**

Run: `cd packages/components && pnpm vitest run src/components/Navigator/Navigator.test.tsx -t 'rail list semantics'`
Expected: FAIL — `rail.querySelector('ul')` is `null` (today the rail's items
are bare anchors in a flex column).

- [ ] **Step 3: Create `railList.tsx`**

```tsx
import {
  Children,
  Fragment,
  type ReactNode,
  isValidElement
} from 'react'

import { NavigatorItem } from './NavigatorItem'
import { navigatorRailListVariants } from './variants'

/**
 * Turns a run of rail children into valid list markup: consecutive
 * `Navigator.Item`s become one `<ul>` of `<li>`s, and anything else — Brand,
 * End, Group (which emits its own title + list) — passes through as a sibling.
 *
 * A `<nav>` may hold several lists, so a group's list and a loose run's list
 * sit side by side rather than one nesting inside the other.
 *
 * Matches by element identity: author the tree in a client component.
 */
export function wrapRailRun(children: ReactNode): ReactNode[] {
  const out: ReactNode[] = []
  let run: ReactNode[] = []

  const flush = () => {
    if (run.length === 0) return
    const items = run
    run = []
    out.push(
      <ul key={`run-${out.length}`} className={navigatorRailListVariants()}>
        {items.map((item, index) => (
          <li key={index}>{item}</li>
        ))}
      </ul>
    )
  }

  Children.forEach(children, (child) => {
    if (isValidElement(child) && child.type === NavigatorItem) {
      run.push(child)
      return
    }
    flush()
    out.push(<Fragment key={`slot-${out.length}`}>{child}</Fragment>)
  })
  flush()

  return out
}
```

Add to `variants.ts`:

```ts
// A run of rail rows. `grid` inside the rail's flex column keeps the same
// 0.25rem rhythm the loose rows had before they were wrapped.
export const navigatorRailListVariants = cva(['grid gap-1'])
```

Export it from `Navigator/index.tsx` alongside the other variants.

- [ ] **Step 4: Use it in `NavigatorPrimary`**

In `NavigatorPrimary.tsx`, import `wrapRailRun` and replace the raw
`{children}` inside `ScrollArea.Content` (currently line 372) with
`{wrapRailRun(children)}`.

- [ ] **Step 5: Give `Navigator.Secondary` its own list**

Rewrite the returned element in `NavigatorSecondary.tsx`:

```tsx
  return (
    <nav
      data-slot='navigator-secondary'
      aria-label={ariaLabel}
      className={cn(navigatorSecondaryVariants(), className)}
    >
      {wrapRailRun(children)}
    </nav>
  )
```

with `import { wrapRailRun } from './railList'` at the top. `NavigatorSecondary`
is only ever rendered in the rail — the strip renders
`secondaryNav.children` — so no presentation branch is needed here. Add that
sentence to the component's docblock so the next reader does not add one.

`navigatorSecondaryVariants` needs no change: its rules are descendant
selectors (`[&_[data-slot=navigator-item]]`), which reach through the extra
`<ul>`/`<li>` level unchanged. Confirm that visually in Step 7 rather than
assuming it.

- [ ] **Step 6: Run the tests**

Run: `cd packages/components && pnpm vitest run src/components/Navigator/Navigator.test.tsx`
Expected: PASS, act warnings ≤ 2. Existing rail tests that query by role or by
`data-slot` are unaffected; any that assert a parent–child relationship
between the rail content wrapper and an item will need the extra `<li>` level
— update those assertions, don't loosen them to `closest()` where the point was
the direct relationship.

- [ ] **Step 7: Verify the rail visually**

Run the docs (`pnpm --filter @oztix/roadie-components build` first, then the
dev server if it is not already up) and check `http://localhost:9614` at
1200px: rail row spacing, the secondary's hairline tree-line, the current
sub-page's accent bar, and the sliding indicator's position must all be
unchanged. The indicator measures against the viewport, not the item's parent,
so it should not move — confirm rather than assume.

- [ ] **Step 8: Commit**

```bash
git add packages/components/src/components/Navigator
git commit -m "feat(navigator): give the rail real list semantics"
```

---

## Task 3: `Navigator.Primary`'s optional `tabs` tuple

Explicit tab-bar slots instead of `items.slice(0, MAX_TABS - 1)`. Typed as a
union of tuples so the five-slot cap is a compile-time error, not a runtime
warning. Omitted → source order, exactly as today.

**Files:**
- Modify: `packages/components/src/components/Navigator/NavigatorPrimary.tsx:64-138`
- Modify: `packages/components/src/components/Navigator/index.tsx`
- Test: `packages/components/src/components/Navigator/Navigator.test.tsx`

**Interfaces:**
- Produces: `export type NavigatorTabSlots = readonly [string] | readonly [string, string] | readonly [string, string, string] | readonly [string, string, string, string]`
  and `NavigatorPrimaryProps.tabs?: NavigatorTabSlots`.
- Changes: `deriveMobileSlots(items, endItems, tabs?)` — third parameter
  optional, so the existing unit tests that call it with two arguments keep
  compiling.

- [ ] **Step 1: Write the failing tests**

```tsx
describe('deriveMobileSlots with declared tabs', () => {
  const meta = (value: string) => ({
    value,
    label: value,
    topValue: value,
    descendants: []
  })

  it('uses source order when tabs is omitted', () => {
    const slots = deriveMobileSlots([meta('a'), meta('b')], [])
    expect(slots.tabs.map((t) => t.value)).toEqual(['a', 'b'])
    expect(slots.overflow).toEqual([])
  })

  it('takes the declared values in declared order', () => {
    const slots = deriveMobileSlots(
      [meta('a'), meta('b'), meta('c')],
      [],
      ['c', 'a']
    )
    expect(slots.tabs.map((t) => t.value)).toEqual(['c', 'a'])
    expect(slots.overflow.map((t) => t.value)).toEqual(['b'])
    // Exhaustive: one unnamed item still discloses rather than taking a slot.
    expect(slots.label).toBe('More')
  })

  it('lets a lone End item keep its own label', () => {
    const slots = deriveMobileSlots(
      [meta('a'), meta('b')],
      [meta('account')],
      ['a', 'b']
    )
    expect(slots.overflow).toEqual([])
    expect(slots.label).toBe('account')
  })

  it('folds everything the array does not name, End included', () => {
    const slots = deriveMobileSlots(
      [meta('a'), meta('b')],
      [meta('account')],
      ['a']
    )
    expect(slots.tabs.map((t) => t.value)).toEqual(['a'])
    expect(slots.overflow.map((t) => t.value)).toEqual(['b'])
    expect(slots.end.map((t) => t.value)).toEqual(['account'])
  })

  it('ignores a declared value that is not in the tree', () => {
    const slots = deriveMobileSlots([meta('a')], [], ['a', 'ghost'])
    expect(slots.tabs.map((t) => t.value)).toEqual(['a'])
    expect(slots.unknownTabs).toEqual(['ghost'])
  })
})

describe('Navigator.Primary tabs prop', () => {
  it('warns once about a value that is not declared', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    render(
      <Navigator value='/a'>
        <Navigator.Primary aria-label='Main' tabs={['/a', '/ghost']}>
          <Navigator.Item value='/a' href='/a'>
            A
          </Navigator.Item>
        </Navigator.Primary>
      </Navigator>
    )
    await flushViewportMeasurement()
    expect(warn).toHaveBeenCalledTimes(1)
    expect(warn.mock.calls[0]?.[0]).toContain('/ghost')
    warn.mockRestore()
  })
})
```

- [ ] **Step 2: Run the tests and confirm they fail**

Run: `cd packages/components && pnpm vitest run src/components/Navigator/Navigator.test.tsx -t 'tabs'`
Expected: FAIL — `deriveMobileSlots` takes two parameters; `slots.unknownTabs`
is undefined; no warning fires. The first test ("uses source order") should
PASS — it is the non-breaking guarantee, and it passing now is correct.

- [ ] **Step 3: Extend `deriveMobileSlots`**

In `NavigatorPrimary.tsx`, add above `MobileSlots`:

```tsx
/**
 * The tab bar's slots, declared explicitly. Four route tabs plus the More
 * slot is the full five, so the cap is expressed as a union of tuples and
 * caught by the compiler — a `tab` boolean scattered across the tree could
 * only be counted at runtime, and could not express a tab order that differs
 * from rail order.
 */
export type NavigatorTabSlots =
  | readonly [string]
  | readonly [string, string]
  | readonly [string, string, string]
  | readonly [string, string, string, string]
```

Add to `MobileSlots`:

```tsx
  /** Declared tab values with no matching item — a dev-mode warning. */
  unknownTabs: string[]
```

Rewrite the function:

```tsx
export function deriveMobileSlots(
  items: NavigatorSlotMeta[],
  endItems: NavigatorSlotMeta[],
  tabs?: NavigatorTabSlots
): MobileSlots {
  if (tabs) {
    const byValue = new Map(items.map((item) => [item.value, item]))
    const chosen: NavigatorSlotMeta[] = []
    const unknownTabs: string[] = []
    tabs.forEach((value) => {
      const item = byValue.get(value)
      if (item) chosen.push(item)
      else unknownTabs.push(value)
    })
    const named = new Set(chosen.map((item) => item.value))
    // Everything the array does not name folds, whatever its source position —
    // declaring the tabs is declaring the whole membership rule, not a prefix.
    const overflow = items.filter((item) => !named.has(item.value))
    const foldedCount = overflow.length + endItems.length
    return {
      tabs: chosen,
      overflow,
      end: endItems,
      // Declaring `tabs` declares the whole membership, so an unnamed item is
      // not a tab — any rail overflow is `More`, even alone. A lone End item
      // still lends its own label, as on the source-order path: `tabs` names
      // primary items and can never name an End one.
      label:
        foldedCount === 0
          ? undefined
          : overflow.length === 0 && endItems.length === 1
            ? endItems[0]?.label
            : 'More',
      unknownTabs
    }
  }

  const total = items.length + (endItems.length > 0 ? 1 : 0)

  if (total > MAX_TABS) {
    return {
      tabs: items.slice(0, MAX_TABS - 1),
      overflow: items.slice(MAX_TABS - 1),
      end: endItems,
      label: 'More',
      unknownTabs: []
    }
  }

  return {
    tabs: items,
    overflow: [],
    end: endItems,
    label:
      endItems.length === 0
        ? undefined
        : endItems.length > 1
          ? 'More'
          : endItems[0]?.label,
    unknownTabs: []
  }
}
```

- [ ] **Step 4: Take the prop and warn**

Add `tabs?: NavigatorTabSlots` to `NavigatorPrimaryProps` with this docblock:

```tsx
  /**
   * Which items take the tab-bar slots below `md`, in tab order. Omit and the
   * bar uses source order, folding the tail past four into More — exactly as
   * it does today. Provide it when rail order is chosen for the rail and the
   * bar deserves its own answer: the named values become the tabs, and
   * everything else folds into the overflow.
   *
   * Four is the cap because the fifth slot is More. The tuple union makes
   * that a compile-time error.
   */
  tabs?: NavigatorTabSlots
```

Destructure it, pass it to `deriveMobileSlots(items, endItems, tabs)`, and add
the warning effect next to the existing stray-child one:

```tsx
  // In an effect, not the walk: React 19 strict mode double-invokes render.
  // Loud because this is the one real cost of naming values away from the
  // items they refer to — a typo silently drops a destination from the bar.
  const unknownTabs = slots.unknownTabs.join(', ')
  useEffect(() => {
    if (!isDev() || unknownTabs === '') return
    console.warn(
      `[Roadie] Navigator.Primary's \`tabs\` names ${unknownTabs}, which ` +
        'is not a declared Navigator.Item value. Those slots are dropped. ' +
        'Note that items authored in a server component are invisible to ' +
        'the walk — see COMPOUND_PATTERNS.md §1.2.'
    )
  }, [unknownTabs])
```

`slots` is currently computed after the effects; move the
`const slots = deriveMobileSlots(...)` line above the effect block so the
dependency is in scope. It is a pure call on values already computed, so the
move is safe.

- [ ] **Step 4b: Make the disclosure agree with the label**

`generatesPane` currently reads `folded.length > 1`, which contradicts the
exhaustive rule: a single unnamed item would be labelled `More` and still
render as a destination. Any rail overflow discloses; a lone End item does
not:

```tsx
  // A final tab holding one End destination is that destination. Anything
  // that folded out of the rail needs somewhere to live, so it discloses —
  // including a single item, because declaring `tabs` declares the whole
  // membership and an unnamed item is not a tab.
  const generatesPane = folded.length > 1 || slots.overflow.length > 0
```

A no-op on the source-order path: `overflow` is non-empty there only when
`total > MAX_TABS`, which always leaves at least two folded slots. The comment
above `soleFolded` claiming "generatesPane is false exactly when
folded.length === 1" becomes wrong — correct it to say the destination branch
runs only when the sole folded slot is an End item.

Cover it with a rendered test: `tabs` naming all but one item renders the
final tab as a disclosure — a `<button>` with `aria-expanded`, not a link to
the unnamed item's href.

- [ ] **Step 5: Run the tests**

Run: `cd packages/components && pnpm vitest run src/components/Navigator/Navigator.test.tsx`
Expected: PASS, act warnings ≤ 2.

- [ ] **Step 6: Export the type**

`export type { MobileSlots, NavigatorPrimaryProps, NavigatorSlotMeta, NavigatorTabSlots } from './NavigatorPrimary'`
in `Navigator/index.tsx`.

- [ ] **Step 7: Commit**

```bash
git add packages/components/src/components/Navigator
git commit -m "feat(navigator): let Primary declare its tab-bar slots"
```

---

## Task 4: Lift the overflow's state out of `Navigator.Primary`

Preparation for Task 5, and independently reviewable: the open flag, the
folded items and the pane's id move to `NavigatorContext` so the More tab and
the pane — different subtrees — read one source. `Navigator.Primary` stops
owning a pane.

**Files:**
- Modify: `packages/components/src/components/Navigator/NavigatorContext.ts`
- Modify: `packages/components/src/components/Navigator/NavigatorRoot.tsx`
- Modify: `packages/components/src/components/Navigator/NavigatorPrimary.tsx`
- Test: `packages/components/src/components/Navigator/Navigator.test.tsx`

**Interfaces:**
- Produces, on `NavigatorContextValue`:
  ```ts
  overflowOpen: boolean
  setOverflowOpen: (next: boolean) => void
  /** Id the More tab points `aria-controls` at, and the overflow pane carries. */
  overflowPaneId: string
  /** Folded primary items plus End's, in author order. Written by Primary. */
  overflowItems: NavigatorSlotMeta[]
  setOverflowItems: (next: NavigatorSlotMeta[]) => void
  /** Whether a `Navigator.Content` is mounted — for the dev warning in Task 5. */
  hasContent: boolean
  setHasContent: (next: boolean) => void
  ```
  `NavigatorSlotMeta` is imported into `NavigatorContext.ts` from
  `./NavigatorPrimary` **as a type only** (`import type`), so no runtime cycle
  is created.

- [ ] **Step 1: Write the failing test**

```tsx
describe('overflow state', () => {
  it('publishes the folded items and the open flag on context', async () => {
    const seen: { open: boolean; count: number }[] = []
    function Probe() {
      const { overflowOpen, overflowItems } = use(NavigatorContext)
      seen.push({ open: overflowOpen, count: overflowItems.length })
      return null
    }
    render(
      <Navigator value='/a'>
        <Navigator.Primary aria-label='Main'>
          {['/a', '/b', '/c', '/d', '/e', '/f'].map((value) => (
            <Navigator.Item key={value} value={value} href={value}>
              {value}
            </Navigator.Item>
          ))}
        </Navigator.Primary>
        <Probe />
      </Navigator>
    )
    await flushViewportMeasurement()

    const last = seen.at(-1)!
    expect(last.open).toBe(false)
    // Six items, four tabs kept, two folded.
    expect(last.count).toBe(2)

    await userEvent.click(screen.getByRole('button', { name: /More/ }))
    expect(seen.at(-1)!.open).toBe(true)
  })
})
```

Add `import { use } from 'react'` and
`import { NavigatorContext } from './NavigatorContext'` to the test file's
imports.

- [ ] **Step 2: Run it and confirm it fails**

Run: `cd packages/components && pnpm vitest run src/components/Navigator/Navigator.test.tsx -t 'overflow state'`
Expected: FAIL — `overflowOpen` and `overflowItems` are not on the context
value (TypeScript error, then a runtime `undefined.length`).

- [ ] **Step 3: Extend the context**

In `NavigatorContext.ts` add the six members above to `NavigatorContextValue`
and to the `createContext` default (`overflowOpen: false`,
`setOverflowOpen: () => {}`, `overflowPaneId: ''`, `overflowItems: []`,
`setOverflowItems: () => {}`, `hasContent: false`, `setHasContent: () => {}`).

- [ ] **Step 4: Hold the state in `NavigatorRoot`**

```tsx
  const [overflowOpen, setOverflowOpen] = useState(false)
  const [overflowItems, setOverflowItems] = useState<NavigatorSlotMeta[]>([])
  const [hasContent, setHasContent] = useState(false)
  const overflowPaneId = useId()
```

Add all four to the `useMemo` value and its dependency array
(`overflowPaneId` is stable, but include it — it costs nothing and keeps the
array honest). Import `useId` from React and `NavigatorSlotMeta` as a type.

- [ ] **Step 5: Move `NavigatorPrimary` onto the context**

- Delete `const [overflowOpen, setOverflowOpen] = useState(false)` and
  `const paneId = useId()`; read `overflowOpen`, `setOverflowOpen` and
  `overflowPaneId` from `use(NavigatorContext)` instead.
- Replace the `pointerdown`/`keydown` effect with a keydown-only one. A
  full-screen pane has no "outside" to click:

```tsx
  // Escape still dismisses; there is no outside-click any more — from Task 5
  // the overflow is a full-screen pane, not a popup floating over the bar.
  useEffect(() => {
    if (!overflowOpen) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOverflowOpen(false)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [overflowOpen, setOverflowOpen])
```

- Publish the folded set. `folded` is already computed; republish it in an
  effect keyed on the values so an unchanged set does not re-render:

```tsx
  const foldedKey = folded.map((slot) => slot.value).join(' ')
  useEffect(() => {
    setOverflowItems(folded)
    // `foldedKey` is the identity of the set; `folded` is a fresh array every
    // render, so depending on it directly would loop.
  }, [foldedKey, setOverflowItems])
```

No `eslint-disable` on that effect: `react-hooks/exhaustive-deps` is not
registered in `packages/components`, so the directive is a hard error rather
than a suppression. Registering the plugin was tried and reverted — at root
scope it breaks `packages/widgets`' Vue composables, and at package scope it
triggers a pnpm dedup bump that breaks `docs`' lint. The comment carries the
reasoning instead.

- Delete the `tabBarRef`-based outside-click machinery only; keep `tabBarRef`
  itself — `NavigatorIndicator` still needs it.
- Delete the `generatesPane && overflowOpen ? <ScrollArea …>` block at the end
  of the tab bar entirely, along with the now-unused `FLOATING_PANE` constant,
  the `List` and `presentNavIcon` imports if nothing else uses them, and
  `navigatorOverflowPaneVariants` / `navigatorOverflowPaneViewportVariants`
  from `variants.ts` and the `index.tsx` export list.
- Keep `selectFolded` — Task 5's `Navigator.OverflowItems` needs the same
  behaviour, so move it into that component and delete it here if nothing else
  calls it.

- [ ] **Step 6: Run the tests**

Run: `cd packages/components && pnpm vitest run src/components/Navigator/Navigator.test.tsx`
Expected: the new test PASSES. Existing tests that assert the floating overflow
pane's DOM (`[data-slot="navigator-overflow-pane"]`) now FAIL — leave them
failing and note which ones; Task 5 rewrites them against the pane. Do not
delete them in this commit, and do not commit a red suite: instead, move those
specific tests into a `describe.skip` block with a comment naming Task 5, so
the failure is recorded rather than lost.

- [ ] **Step 7: Commit**

```bash
git add packages/components/src/components/Navigator
git commit -m "refactor(navigator): lift overflow state to context, drop the floating pane"
```

---

## Task 5: `Navigator.Overflow` and `Navigator.OverflowItems`

The overflow becomes a full-screen `Pane` at the top of the stack, with the
tab bar still visible — the Airbnb host app's Menu tab. It inherits push/pop
motion, the depth pointer and the surface treatment for free.

**Files:**
- Create: `packages/components/src/components/Navigator/NavigatorOverflow.tsx`
- Create: `packages/components/src/components/Navigator/NavigatorOverflowItems.tsx`
- Modify: `packages/components/src/components/Navigator/NavigatorContent.tsx`
- Modify: `packages/components/src/components/Navigator/variants.ts`
- Modify: `packages/components/src/components/Navigator/index.tsx`
- Test: `packages/components/src/components/Navigator/Navigator.test.tsx`

**Interfaces:**
- Consumes: `overflowOpen`, `overflowItems`, `overflowPaneId`,
  `setOverflowOpen`, `setHasContent`, `hasContent` (Task 4);
  `PaneRoot`, `PaneRootProps` from `../Pane/PaneRoot`.
- Produces:
  `NavigatorOverflowProps = Omit<PaneRootProps, 'role' | 'presentation' | 'current' | 'primaryNav'>`;
  `NavigatorOverflowItemsProps = { className?: string }`;
  `navigatorOverflowVariants`.

- [ ] **Step 1: Write the failing tests**

Replace the `describe.skip` block from Task 4 with:

```tsx
describe('Navigator.Overflow', () => {
  const overflowNav = (value: string, extra?: ReactNode) => (
    <Navigator value={value}>
      <Navigator.Primary aria-label='Main'>
        {['/a', '/b', '/c', '/d', '/e', '/f'].map((v) => (
          <Navigator.Item key={v} value={v} href={v}>
            {v}
          </Navigator.Item>
        ))}
      </Navigator.Primary>
      <Navigator.Content>
        <Pane role='detail' current>
          Detail
        </Pane>
        {extra}
      </Navigator.Content>
    </Navigator>
  )

  const panes = () => Array.from(document.querySelectorAll('[data-slot="pane"]'))

  it('renders a generated overflow pane when none is declared', async () => {
    render(overflowNav('/a'))
    await flushViewportMeasurement()
    // Two panes: the detail, and the generated overflow parked behind it.
    expect(panes()).toHaveLength(2)
    expect(panes()[1]).toHaveAttribute('data-top', 'false')
  })

  it('takes the top of the stack when opened', async () => {
    render(overflowNav('/a'))
    await flushViewportMeasurement()
    await userEvent.click(screen.getByRole('button', { name: /More/ }))
    expect(panes()[1]).toHaveAttribute('data-top', 'true')
    expect(panes()[0]).toHaveAttribute('data-top', 'false')
  })

  it('keeps the primary nav visible while it is top', async () => {
    render(overflowNav('/a'))
    await flushViewportMeasurement()
    await userEvent.click(screen.getByRole('button', { name: /More/ }))
    expect(panes()[1]).toHaveAttribute('data-primary-nav', 'visible')
  })

  it('lists the folded items, and selecting one closes it', async () => {
    const onValueChange = vi.fn()
    render(
      <Navigator value='/a' onValueChange={onValueChange}>
        <Navigator.Primary aria-label='Main'>
          {['/a', '/b', '/c', '/d', '/e', '/f'].map((v) => (
            <Navigator.Item key={v} value={v} href={v}>
              {v}
            </Navigator.Item>
          ))}
        </Navigator.Primary>
        <Navigator.Content>
          <Pane role='detail' current>
            Detail
          </Pane>
        </Navigator.Content>
      </Navigator>
    )
    await flushViewportMeasurement()
    await userEvent.click(screen.getByRole('button', { name: /More/ }))

    const overflow = document.querySelectorAll('[data-slot="pane"]')[1]!
    const row = within(overflow as HTMLElement).getByRole('link', { name: '/e' })
    await userEvent.click(row)
    expect(onValueChange).toHaveBeenCalledWith('/e')
    expect(
      document.querySelectorAll('[data-slot="pane"]')[1]
    ).toHaveAttribute('data-top', 'false')
  })

  it('renders consumer content around the generated list', async () => {
    render(
      overflowNav(
        '/a',
        <Navigator.Overflow>
          <Pane.Header>
            <Pane.Title>Menu</Pane.Title>
          </Pane.Header>
          <p>Promo</p>
          <Navigator.OverflowItems />
        </Navigator.Overflow>
      )
    )
    await flushViewportMeasurement()
    await userEvent.click(screen.getByRole('button', { name: /More/ }))

    const overflow = document.querySelectorAll('[data-slot="pane"]')[1]!
    expect(within(overflow as HTMLElement).getByText('Promo')).toBeInTheDocument()
    expect(
      within(overflow as HTMLElement).getByRole('link', { name: '/e' })
    ).toBeInTheDocument()
    // Declared, so no second generated pane.
    expect(document.querySelectorAll('[data-slot="pane"]')).toHaveLength(2)
  })

  it('warns when items fold with no Navigator.Content to host them', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    render(
      <Navigator value='/a'>
        <Navigator.Primary aria-label='Main'>
          {['/a', '/b', '/c', '/d', '/e', '/f'].map((v) => (
            <Navigator.Item key={v} value={v} href={v}>
              {v}
            </Navigator.Item>
          ))}
        </Navigator.Primary>
      </Navigator>
    )
    await flushViewportMeasurement()
    expect(warn.mock.calls.some((c) => String(c[0]).includes('Navigator.Content'))).toBe(true)
    warn.mockRestore()
  })
})
```

- [ ] **Step 2: Run them and confirm they fail**

Run: `cd packages/components && pnpm vitest run src/components/Navigator/Navigator.test.tsx -t 'Navigator.Overflow'`
Expected: FAIL — one pane, not two; `Navigator.Overflow` is not a function.

- [ ] **Step 3: Add the variant**

In `variants.ts`:

```ts
// The overflow pane. `md:hidden` because the overflow exists only in the band
// that has a tab bar — the rail simply scrolls, so there is nothing to fold.
// Without it a closed overflow would take a real column from `lg` up.
//
// Nav form is an `md:` concern; pane arrangement is an `lg:` one. This is the
// former, deliberately.
export const navigatorOverflowVariants = cva(['md:hidden'])
```

- [ ] **Step 4: Create `NavigatorOverflow.tsx`**

```tsx
'use client'

import { use } from 'react'

import { cn } from '@oztix/roadie-core/utils'

import { PaneRoot, type PaneRootProps } from '../Pane/PaneRoot'
import { NavigatorContext } from './NavigatorContext'
import { navigatorOverflowVariants } from './variants'

export type NavigatorOverflowProps = Omit<
  PaneRootProps,
  'role' | 'presentation' | 'current' | 'primaryNav'
>

/**
 * The mobile overflow, as a full-screen `Pane` at the top of the stack with
 * the tab bar still visible — a Menu tab, not a popup. Push/pop motion, the
 * depth pointer and the surface treatment all come from `Pane`.
 *
 * Declare it as a **direct child of `Navigator.Content`**: the stack is
 * Content's declared children in order, and a pane anywhere else can never be
 * given a depth. Omit it entirely and Content generates one holding just the
 * item list.
 *
 * Its `current` is the More tab's disclosure state, which lives on
 * `NavigatorContext` — the tab and this pane are different subtrees reading
 * one source.
 */
export function NavigatorOverflow({
  className,
  children,
  ...props
}: NavigatorOverflowProps) {
  const { overflowOpen, overflowPaneId } = use(NavigatorContext)

  return (
    <PaneRoot
      id={overflowPaneId}
      role='detail'
      current={overflowOpen}
      // The bar stays full: the user is *in* the nav, not away from it.
      primaryNav='visible'
      className={cn(navigatorOverflowVariants(), className)}
      {...props}
    >
      {children}
    </PaneRoot>
  )
}

NavigatorOverflow.displayName = 'Navigator.Overflow'
```

- [ ] **Step 5: Create `NavigatorOverflowItems.tsx`**

```tsx
'use client'

import { use } from 'react'

import { List } from '../List'
import { NavigatorContext, isBranchActive } from './NavigatorContext'
import { presentNavIcon } from './presentNavIcon'

export type NavigatorOverflowItemsProps = {
  className?: string
}

/**
 * The generated `List` of folded destinations. Placed by the consumer, so the
 * promo card can sit above it or between sections — the ordering is authored,
 * the content is not.
 */
export function NavigatorOverflowItems({
  className
}: NavigatorOverflowItemsProps) {
  const { overflowItems, value, setValue, setOverflowOpen } =
    use(NavigatorContext)

  if (overflowItems.length === 0) return null

  return (
    <List className={className}>
      {overflowItems.map((slot) => {
        const active = isBranchActive(slot.value, slot.descendants, value)
        return (
          <List.Item
            key={slot.value}
            title={slot.label}
            leading={presentNavIcon(slot.icon, active, 'size-5')}
            href={slot.href}
            current={active}
            onClick={() => {
              setValue(slot.value)
              setOverflowOpen(false)
            }}
          />
        )
      })}
    </List>
  )
}

NavigatorOverflowItems.displayName = 'Navigator.OverflowItems'
```

Grouping in the overflow — a `Navigator.Group` whose items fold rendering as a
`List.Group` — is **not** built here. `NavigatorSlotMeta` carries no group
membership today, so it would mean threading a group id through the walk for a
capability with no consumer. Recorded in the follow-ups.

- [ ] **Step 6: Teach `Navigator.Content` about it**

In `NavigatorContent.tsx`:

```tsx
  const { setPrimaryNav, overflowOpen, overflowItems, setHasContent } =
    use(NavigatorContext)

  useEffect(() => {
    setHasContent(true)
    return () => setHasContent(false)
  }, [setHasContent])
```

Extend the walk to accept a second element type. Replace the guard with:

```tsx
  let declaredOverflow = false
  const walked = Children.toArray(children).map((child) => {
    if (isValidElement(child) && child.type === NavigatorOverflow) {
      declaredOverflow = true
      // The overflow's depth is its disclosure state — the same flag the pane
      // reads for its own `current`, so the two cannot disagree.
      const entry: PaneEntry = {
        role: 'detail',
        current: overflowOpen,
        presentation: 'column',
        primaryNav: 'visible'
      }
      entries.push(entry)
      return { child, entry }
    }
    if (!isValidElement<PaneRootProps>(child) || child.type !== PaneRoot) {
      return { child, entry: null }
    }
    …unchanged…
  })
```

Then, after the walk and before `deriveTopIndex` is called, append the fallback:

```tsx
  // Omitting `Navigator.Overflow` keeps today's behaviour — a Navigator-
  // rendered pane holding just the item list — rather than losing the folded
  // destinations. Appended last, so it is the deepest thing in the stack.
  if (!declaredOverflow && overflowItems.length > 0) {
    const entry: PaneEntry = {
      role: 'detail',
      current: overflowOpen,
      presentation: 'column',
      primaryNav: 'visible'
    }
    entries.push(entry)
    walked.push({
      child: (
        <NavigatorOverflow key='__navigator-overflow'>
          <NavigatorOverflowItems />
        </NavigatorOverflow>
      ),
      entry
    })
  }
```

`walked` must therefore be a `let`-bound array built with `.map()` then pushed
to — change its declaration to `const walked: { child: ReactNode; entry: PaneEntry | null }[] = Children.toArray(children).map(…)`
so the push typechecks.

The `arranged` pass needs one change: `cloneElement` currently types the child
as `ReactElement<Record<string, unknown>>` to inject `data-top`. That works for
`NavigatorOverflow` too, because its props type spreads unknown props onto
`PaneRoot`, which spreads them onto the `<section>`. Confirm the overflow pane
carries `data-top` in the Step 8 run — it is the whole mechanism.

Add the imports for `NavigatorOverflow` and `NavigatorOverflowItems`.

- [ ] **Step 7: Warn when there is nowhere to put it**

In `NavigatorPrimary.tsx`, next to the other dev warnings:

```tsx
  const { hasContent } = use(NavigatorContext)
  const foldedWithNoHost = folded.length > 1 && !hasContent
  useEffect(() => {
    if (!isDev() || !foldedWithNoHost) return
    console.warn(
      '[Roadie] Navigator.Primary folded items into a More tab, but no ' +
        'Navigator.Content is mounted to host the overflow pane. The ' +
        'folded destinations are unreachable below `md`. Render a ' +
        'Navigator.Content, optionally with a Navigator.Overflow inside it.'
    )
  }, [foldedWithNoHost])
```

This exists because the failure is silent otherwise, which is the shape of
mistake this branch has paid for repeatedly.

- [ ] **Step 8: Run the tests**

Run: `cd packages/components && pnpm vitest run src/components/Navigator/Navigator.test.tsx`
Expected: PASS, act warnings ≤ 2.

- [ ] **Step 9: Export and verify in a browser**

Add `Overflow` and `OverflowItems` to `Navigator/index.tsx` (intersection type,
assignments, prop-type exports, and `navigatorOverflowVariants` in the variant
export list).

Rebuild and check the docs overflow example at 390px: tapping **More** slides a
full-screen pane in from the right with the bar still visible; tapping a row
navigates and pops the pane; Escape pops it. At 1200px the More tab and the
pane are both absent. Confirm the slide actually animates — read the computed
`transition-property` on the pane and check it lists `translate`, not
`transform`.

- [ ] **Step 10: Commit**

```bash
git add packages/components/src/components/Navigator
git commit -m "feat(navigator): make the mobile overflow a Pane with composable content"
```

---

## Task 6: `Navigator.Panel` — declaration and desktop popover

An item that owns a menu rather than a destination. Declaring a
`Navigator.Panel` makes the item a **disclosure rather than a link**, the same
rule `Navigator.Secondary` already uses to make an item a section.

This task does the declaration, the walk, and the `md`+ popover. Task 7 does
the below-`md` drawer.

**Files:**
- Create: `packages/components/src/components/Navigator/NavigatorPanel.tsx`
- Modify: `packages/components/src/components/Navigator/splitSecondary.ts`
- Modify: `packages/components/src/components/Navigator/NavigatorItem.tsx`
- Modify: `packages/components/src/components/Navigator/NavigatorPrimary.tsx`
- Modify: `packages/components/src/components/Navigator/index.tsx`
- Test: `packages/components/src/components/Navigator/Navigator.test.tsx`

**Interfaces:**
- Produces: `NavigatorPanel` (`displayName 'Navigator.Panel'`),
  `NavigatorPanelProps = { 'aria-label'?: string; children?: ReactNode; className?: string }`;
  `splitItemChildren(children: ReactNode): { label: ReactNode[]; secondary: ReactNode[]; panel: ReactNode }`
  replacing `splitSecondary`; `NavigatorSlotMeta.panel?: ReactNode`.
- `splitSecondary` is **renamed**, not kept alongside — two walks answering
  "what is in this item" is exactly the drift the branch has been removing.
  Update all six call sites (`NavigatorItem`, `NavigatorPrimary` ×3,
  `splitSecondary.ts`'s own helpers).

- [ ] **Step 1: Write the failing tests**

```tsx
describe('Navigator.Panel', () => {
  const withPanel = (
    <Navigator value='/a'>
      <Navigator.Primary aria-label='Main'>
        <Navigator.Item value='/a' href='/a'>
          A
        </Navigator.Item>
        <Navigator.End>
          <Navigator.Item value='account'>
            Jordan Lee
            <Navigator.Panel aria-label='Account'>
              <List>
                <List.Item title='Log out' />
              </List>
            </Navigator.Panel>
          </Navigator.Item>
        </Navigator.End>
      </Navigator.Primary>
    </Navigator>
  )

  it('makes the rail row a disclosure, not a link', async () => {
    render(withPanel)
    await flushViewportMeasurement()
    const row = screen.getByRole('button', { name: 'Jordan Lee' })
    expect(row).toHaveAttribute('aria-haspopup')
    expect(row).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByRole('link', { name: 'Jordan Lee' })).toBeNull()
  })

  it('opens the panel content on the rail row', async () => {
    render(withPanel)
    await flushViewportMeasurement()
    await userEvent.click(screen.getByRole('button', { name: 'Jordan Lee' }))
    expect(screen.getByText('Log out')).toBeInTheDocument()
  })

  it('ignores href when a panel is declared', async () => {
    render(
      <Navigator value='/a'>
        <Navigator.Primary aria-label='Main'>
          <Navigator.Item value='account' href='/account'>
            Account
            <Navigator.Panel aria-label='Account'>
              <p>Menu</p>
            </Navigator.Panel>
          </Navigator.Item>
        </Navigator.Primary>
      </Navigator>
    )
    await flushViewportMeasurement()
    expect(screen.queryByRole('link', { name: 'Account' })).toBeNull()
    expect(screen.getByRole('button', { name: 'Account' })).toBeInTheDocument()
  })

  it('keeps the panel out of the row label', async () => {
    render(withPanel)
    await flushViewportMeasurement()
    const row = screen.getByRole('button', { name: 'Jordan Lee' })
    expect(row.textContent).toBe('Jordan Lee')
  })
})
```

- [ ] **Step 2: Run them and confirm they fail**

Run: `cd packages/components && pnpm vitest run src/components/Navigator/Navigator.test.tsx -t 'Navigator.Panel'`
Expected: FAIL — `Navigator.Panel is not a function`.

- [ ] **Step 3: Create `NavigatorPanel.tsx`**

```tsx
import type { ReactNode } from 'react'

export type NavigatorPanelProps = {
  /** Names the menu, e.g. 'Account'. Falls back to the item's own label. */
  'aria-label'?: string
  children?: ReactNode
  className?: string
}

/**
 * A menu owned by a `Navigator.Item` — an account switcher, a settings menu —
 * rather than a destination. Declaring one makes the item a **disclosure**:
 * any `href` on it is ignored, exactly as a `Navigator.Secondary` makes the
 * item a section.
 *
 * One declaration, two presentations chosen by viewport, neither configurable:
 * a popover anchored to the rail row from `md`, and a `Drawer` below it, where
 * the item takes a tab slot. The two triggers already live in CSS-gated
 * subtrees — the rail is `hidden md:block`, the tab bar is `md:hidden` — so
 * neither can fire in the band it does not own, and no breakpoint is read in
 * JavaScript.
 *
 * A drawer rather than a pane below `md`: a menu is transient and dismissible,
 * which is a drawer's contract, and a pane would have to be portalled out of
 * the rail into `Navigator.Content` to get a depth at all.
 *
 * Renders nothing itself — its parents read it by reference and present it. So
 * author the tree in a client component: Flight replaces the type of every
 * element authored in a server component with a `React.lazy` wrapper. See
 * COMPOUND_PATTERNS.md §1.2.
 */
export function NavigatorPanel(_props: NavigatorPanelProps): null {
  return null
}

NavigatorPanel.displayName = 'Navigator.Panel'
```

- [ ] **Step 4: Rename and extend the split**

In `splitSecondary.ts`, replace `splitSecondary` with:

```tsx
/**
 * Separates an item's label content from the two things it can own — a
 * `Navigator.Secondary` (sub-navigation) and a `Navigator.Panel` (a menu).
 * Every consumer of an item's children needs the same rule: the rail row is a
 * `<button>`, so neither a nested `<nav>` nor a menu can live inside it, and
 * the derived mobile label must not carry one either.
 *
 * A second panel is ignored — one item, one menu.
 */
export function splitItemChildren(children: ReactNode) {
  const label: ReactNode[] = []
  const secondary: ReactNode[] = []
  let panel: ReactNode = null

  Children.toArray(children).forEach((child) => {
    if (!isValidElement(child)) {
      label.push(child)
      return
    }
    if (child.type === NavigatorSecondary) {
      secondary.push(child)
      return
    }
    if (child.type === NavigatorPanel) {
      panel ??= child
      return
    }
    label.push(child)
  })

  return { label, secondary, panel }
}
```

Update `secondaryItems`, `firstSecondaryHref` and `firstSecondaryValue` — they
take `secondary: ReactNode[]` and are unchanged. Update every `splitSecondary`
call site to `splitItemChildren` and to destructure `panel` where needed.

- [ ] **Step 5: Walk into groups while you are here**

`NavigatorPrimary`'s two walks currently see only direct `Navigator.Item` and
`Navigator.End` children, so an item inside a `Navigator.Group` is invisible to
slot derivation, nesting detection and the active-secondary lift — which would
make Task 1's primary grouping silently drop items from the tab bar.

Extract the per-item body of the first walk into a local helper and call it for
group children too, mirroring `secondaryItems`' single-type exception:

```tsx
    const visitItem = (child: ReactElement) => {
      const itemProps = child.props as NavigatorItemProps
      items.push(toSlotMeta(itemProps))
      const { secondary } = splitItemChildren(itemProps.children)
      if (secondary.length > 0) foundNesting = true
    }

    Children.forEach(children, (child) => {
      if (!isValidElement(child)) return
      if (child.type === NavigatorBrand) return

      if (child.type === NavigatorEnd) { …unchanged… }

      // A deliberate, single-type exception to the one-level rule, matching
      // `secondaryItems`: Group is matched by reference exactly as Item is, so
      // the walk stays immune to everything except server-authored trees. It
      // is NOT a licence for arbitrary wrappers.
      if (child.type === NavigatorGroup) {
        const groupProps = child.props as { children?: ReactNode }
        Children.forEach(groupProps.children, (grandChild) => {
          if (isValidElement(grandChild) && grandChild.type === NavigatorItem) {
            visitItem(grandChild)
          }
        })
        return
      }

      if (child.type !== NavigatorItem) {
        foundStray = true
        return
      }
      visitItem(child)
    })
```

Apply the same group descent to the `activeSecondary` walk. Import
`NavigatorGroup`; guard against a cycle — `NavigatorGroup` does not import
`NavigatorPrimary`, so there is none.

Add to `toSlotMeta`: `panel` from `splitItemChildren`, and make `href`
`undefined` when a panel is present:

```tsx
const toSlotMeta = (props: NavigatorItemProps): NavigatorSlotMeta => {
  const { label, secondary, panel } = splitItemChildren(props.children)
  const href = panel ? undefined : (props.href ?? firstSecondaryHref(secondary))
  return {
    value: props.value,
    label,
    icon: props.icon,
    href,
    panel,
    topValue: …unchanged…,
    descendants: secondaryDescendantValues(secondary)
  }
}
```

Add `panel?: ReactNode` to `NavigatorSlotMeta` with the comment
`/** The item's menu, when it declares one. A panel item never navigates. */`.

- [ ] **Step 6: Render the popover in `NavigatorItem`**

Read `panel` from `splitItemChildren`, and when it is present render the row
as a `Popover` disclosure instead of a destination:

```tsx
  const { label, secondary, panel } = splitItemChildren(children)
  const panelProps = isValidElement<NavigatorPanelProps>(panel)
    ? panel.props
    : null
  // A panel makes the item a disclosure: it owns a menu, not a destination.
  const effectiveHref = panelProps ? undefined : (href ?? firstSecondaryHref(secondary))
```

and, before the existing `return`:

```tsx
  if (panelProps) {
    return (
      <Popover>
        <Popover.Trigger
          render={
            <button
              type='button'
              data-slot='navigator-item'
              className={finalClassName}
            />
          }
        >
          {content}
        </Popover.Trigger>
        <Popover.Content
          aria-label={panelProps['aria-label']}
          positionerProps={{ side: 'right', align: 'end', sideOffset: 8 }}
          className={cn('grid w-64 gap-1.5 p-2', panelProps.className)}
        >
          {panelProps.children}
        </Popover.Content>
      </Popover>
    )
  }
```

`side: 'right'` because the rail is the left edge; `align: 'end'` so an
`Navigator.End` item's menu grows upward from the bottom of the rail rather
than off the bottom of the viewport. Anchoring has to be Roadie's job — the
trigger lives inside the rail, so a consumer cannot reach it.

Base UI's `Popover.Trigger` supplies `aria-haspopup` and `aria-expanded`, which
is what the first test asserts; do not hand-write them.

- [ ] **Step 7: Run the tests**

Run: `cd packages/components && pnpm vitest run src/components/Navigator/Navigator.test.tsx`
Expected: PASS, act warnings ≤ 2. If the popover's open transition adds act
warnings, wrap the click's assertions in `await screen.findByText(...)` rather
than raising the budget.

- [ ] **Step 8: Export**

`Panel` into the intersection type and assignments in `Navigator/index.tsx`,
plus `export type { NavigatorPanelProps } from './NavigatorPanel'`.

- [ ] **Step 9: Commit**

```bash
git add packages/components/src/components/Navigator
git commit -m "feat(navigator): add Navigator.Panel with its rail popover"
```

---

## Task 7: `Navigator.Panel` below `md` — the drawer

The item takes a tab slot, and activating it opens a `Drawer` rather than
navigating. This is the half that fixes the prototype's disappearing account
menu.

**Files:**
- Create: `packages/components/src/components/Navigator/NavigatorPanelDrawer.tsx`
- Modify: `packages/components/src/components/Navigator/NavigatorPrimary.tsx`
- Test: `packages/components/src/components/Navigator/Navigator.test.tsx`

**Interfaces:**
- Produces:
  ```ts
  type NavigatorPanelDrawerProps = {
    slot: NavigatorSlotMeta
    open: boolean
    onOpenChange: (next: boolean) => void
  }
  ```
- Consumes: `Drawer` from `../Drawer`; `NavigatorPanelProps` for the declared
  panel's own `aria-label` / `className` / `children`.

- [ ] **Step 1: Write the failing tests**

```tsx
describe('Navigator.Panel below md', () => {
  const nav = (onValueChange?: (next: string) => void) => (
    <Navigator value='/a' onValueChange={onValueChange}>
      <Navigator.Primary aria-label='Main'>
        <Navigator.Item value='/a' href='/a'>
          A
        </Navigator.Item>
        <Navigator.End>
          <Navigator.Item value='account'>
            Jordan Lee
            <Navigator.Panel aria-label='Account'>
              <List>
                <List.Item title='Log out' />
              </List>
            </Navigator.Panel>
          </Navigator.Item>
        </Navigator.End>
      </Navigator.Primary>
    </Navigator>
  )

  const tabBar = () =>
    document.querySelector('[data-slot="navigator-tab-bar"]') as HTMLElement

  it('gives the panel item a tab', async () => {
    render(nav())
    await flushViewportMeasurement()
    expect(
      within(tabBar()).getByRole('button', { name: 'Jordan Lee' })
    ).toBeInTheDocument()
  })

  it('opens a drawer rather than navigating', async () => {
    const onValueChange = vi.fn()
    render(nav(onValueChange))
    await flushViewportMeasurement()
    await userEvent.click(
      within(tabBar()).getByRole('button', { name: 'Jordan Lee' })
    )
    expect(await screen.findByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('Log out')).toBeInTheDocument()
    expect(onValueChange).not.toHaveBeenCalled()
  })

  it('is a tab, not a link', async () => {
    render(nav())
    await flushViewportMeasurement()
    expect(
      within(tabBar()).queryByRole('link', { name: 'Jordan Lee' })
    ).toBeNull()
  })
})
```

- [ ] **Step 2: Run them and confirm they fail**

Run: `cd packages/components && pnpm vitest run src/components/Navigator/Navigator.test.tsx -t 'Navigator.Panel below md'`
Expected: FAIL — the End tab is currently a link to `undefined` and no dialog
opens. Note which of the three fails: the first should already pass, because a
lone End item already earns the final tab. If it fails, the walk is wrong and
that is the bug to fix first.

- [ ] **Step 3: Create `NavigatorPanelDrawer.tsx`**

```tsx
'use client'

import { isValidElement } from 'react'

import { cn } from '@oztix/roadie-core/utils'

import { Drawer } from '../Drawer'
import type { NavigatorPanelProps } from './NavigatorPanel'
import type { NavigatorSlotMeta } from './NavigatorPrimary'

export type NavigatorPanelDrawerProps = {
  slot: NavigatorSlotMeta
  open: boolean
  onOpenChange: (next: boolean) => void
}

/**
 * A panel's below-`md` rendering: a bottom drawer, with swipe-to-dismiss,
 * focus trapping, Escape and a scrim from `Drawer`.
 *
 * Controlled from the tab bar rather than wrapping the tab in a
 * `Drawer.Trigger`: the tab is generated, and threading a render prop through
 * it to reach the trigger would make every tab pay for a case only one has.
 */
export function NavigatorPanelDrawer({
  slot,
  open,
  onOpenChange
}: NavigatorPanelDrawerProps) {
  const panel = isValidElement<NavigatorPanelProps>(slot.panel)
    ? slot.panel.props
    : null
  if (!panel) return null

  return (
    <Drawer open={open} onOpenChange={onOpenChange} side='bottom'>
      <Drawer.Content>
        <Drawer.Header>
          <Drawer.Title>{panel['aria-label'] ?? slot.label}</Drawer.Title>
        </Drawer.Header>
        <Drawer.Body className={cn(panel.className)}>
          {panel.children}
        </Drawer.Body>
      </Drawer.Content>
    </Drawer>
  )
}

NavigatorPanelDrawer.displayName = 'NavigatorPanelDrawer'
```

`Drawer.Body`'s list unwind reaches direct children only — a `List` inside a
wrapper lands one inset off. Say so in the `Navigator.Panel` docblock so
consumers put the `List` at the top level, as the design's example does.

- [ ] **Step 4: Wire it into the tab bar**

The open panel lives on `NavigatorContext`, not in `NavigatorPrimary`'s local
state, because two subtrees need it: the tab bar (which renders the drawers)
and `Navigator.OverflowItems` (whose row must open the menu rather than
navigate when a panel item has folded). Add to `NavigatorContextValue`:

```ts
/** The value of the item whose panel is open, or null. */
openPanel: string | null
setOpenPanel: (next: string | null) => void
```

with `null` / `() => {}` in the `createContext` default, and
`useState<string | null>(null)` in `NavigatorRoot` alongside the overflow
state. `NavigatorPrimary` reads the pair from `use(NavigatorContext)`.

In `NavigatorOverflowItems`, take the panel case before navigating:

```tsx
            onClick={() => {
              setOverflowOpen(false)
              // A folded panel item still owns a menu, not a page.
              if (slot.panel) {
                setOpenPanel(slot.value)
                return
              }
              setValue(slot.value)
            }}
```

and give that row no `href` — `toSlotMeta` already returns `undefined` for a
panel item, so `List.Item` renders a `<button>`.

In `selectDestination`, take the panel case first — it is not a destination at
all:

```tsx
  const selectDestination = (
    event: MouseEvent,
    tab: NavigatorSlotMeta,
    active: boolean
  ) => {
    setOverflowOpen(false)
    // A panel item owns a menu, not a page: never navigate, never collapse.
    if (tab.panel) {
      event.preventDefault()
      setOpenPanel(tab.value)
      return
    }
    …unchanged…
  }
```

Render the drawers after the tab list, inside the `<nav>`:

```tsx
        {[...slots.tabs, ...folded].
          filter((slot) => slot.panel).
          map((slot) => (
            <NavigatorPanelDrawer
              key={slot.value}
              slot={slot}
              open={openPanel === slot.value}
              onOpenChange={(next) => setOpenPanel(next ? slot.value : null)}
            />
          ))}
```

`folded` is included so a panel item that folded into the overflow still opens
its menu when its row is tapped there — the drawer is mounted once, in the tab
bar, and the overflow row sets the same context flag.

- [ ] **Step 5: Give the final tab the panel case**

The `slots.label !== undefined` block's non-`generatesPane` branch renders a
`NavigatorTab` with `href={soleFolded?.href}`. `toSlotMeta` already returns
`href: undefined` for a panel item (Task 6 Step 5), so it renders a
`<button>` — and `selectDestination`'s new first branch opens the drawer. No
change needed here; **verify it** with the second test rather than assuming.

- [ ] **Step 6: Run the tests**

Run: `cd packages/components && pnpm vitest run src/components/Navigator/Navigator.test.tsx`
Expected: PASS, act warnings ≤ 2. `Drawer` mounts a Base UI dialog; if it adds
act warnings, `await screen.findByRole('dialog')` before asserting rather than
raising the budget.

- [ ] **Step 7: Verify in a browser**

Rebuild components. At 390px on a docs page carrying a panel example (added in
Task 10): the account tab opens a bottom drawer, swipe-down dismisses it,
Escape dismisses it, and focus returns to the tab. At 1200px the same
declaration is a popover anchored to the rail row and no drawer exists.

- [ ] **Step 8: Commit**

```bash
git add packages/components/src/components/Navigator
git commit -m "feat(navigator): render a Panel as a drawer below md"
```

---

## Task 8: Per-section stack memory

Navigator stores the last destination per section and retargets that section's
rail item and tab. It still never navigates — only the link target changes.

**The URL is the only source of truth for the current section's depth.** The
Map supplies a target only for sections the user is *not* currently in. On
reload it is empty and every section link falls back to its declared href. It
affects link targets and never rendered arrangement, so it can never reorder
declarations — which matters because DOM order is now stack depth.

**Files:**
- Create: `packages/components/src/components/Navigator/sectionMemory.ts`
- Modify: `packages/components/src/components/Navigator/NavigatorContext.ts`
- Modify: `packages/components/src/components/Navigator/NavigatorRoot.tsx`
- Modify: `packages/components/src/components/Navigator/NavigatorPrimary.tsx`
- Modify: `packages/components/src/components/Navigator/NavigatorItem.tsx`
- Test: `packages/components/src/components/Navigator/sectionMemory.test.ts` (new),
  `packages/components/src/components/Navigator/Navigator.test.tsx`

**Interfaces:**
- Produces, in `sectionMemory.ts`:
  ```ts
  export type SectionMemory = ReadonlyMap<string, string>
  export function rememberedHref(memory: SectionMemory, section: string, declared: string | undefined, isBranchActive: boolean): string | undefined
  export function nextMemory(memory: SectionMemory, section: string, href: string): SectionMemory
  export function activeHref(activeValue: string | undefined, declaredHref: string | undefined): string | undefined
  ```
- On `NavigatorContextValue`: `sectionMemory: SectionMemory`,
  `rememberSection: (section: string, href: string) => void`.

- [ ] **Step 1: Write the failing unit tests**

Create `packages/components/src/components/Navigator/sectionMemory.test.ts`:

```ts
import { describe, expect, it } from 'vitest'

import { activeHref, nextMemory, rememberedHref } from './sectionMemory'

describe('rememberedHref', () => {
  const memory = new Map([['/tokens', '/tokens/color']])

  it('retargets a section the user is not in', () => {
    expect(rememberedHref(memory, '/tokens', '/tokens', false)).toBe(
      '/tokens/color'
    )
  })

  it('leaves the section you are in on its declared href', () => {
    expect(rememberedHref(memory, '/tokens', '/tokens', true)).toBe('/tokens')
  })

  it('falls back to the declared href with no memory', () => {
    expect(rememberedHref(new Map(), '/tokens', '/tokens', false)).toBe(
      '/tokens'
    )
  })

  it('stays undefined when there is nothing declared and nothing remembered', () => {
    expect(rememberedHref(new Map(), '/tokens', undefined, false)).toBeUndefined()
  })
})

describe('nextMemory', () => {
  it('returns the same map when nothing changed', () => {
    const memory = new Map([['/tokens', '/tokens/color']])
    expect(nextMemory(memory, '/tokens', '/tokens/color')).toBe(memory)
  })

  it('returns a new map when the value changed', () => {
    const memory: ReadonlyMap<string, string> = new Map([
      ['/tokens', '/tokens/color']
    ])
    const next = nextMemory(memory, '/tokens', '/tokens/spacing')
    expect(next).not.toBe(memory)
    expect(next.get('/tokens')).toBe('/tokens/spacing')
  })
})

describe('activeHref', () => {
  it('prefers a declared href', () => {
    expect(activeHref('/tokens/color', '/tokens/color-page')).toBe(
      '/tokens/color-page'
    )
  })

  it('falls back to a path-shaped value', () => {
    expect(activeHref('/tokens/color', undefined)).toBe('/tokens/color')
  })

  it('refuses a value that is not a path', () => {
    expect(activeHref('tokens-color', undefined)).toBeUndefined()
  })
})
```

- [ ] **Step 2: Run and confirm failure**

Run: `cd packages/components && pnpm vitest run src/components/Navigator/sectionMemory.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Create `sectionMemory.ts`**

```ts
/**
 * Per-section stack memory: the last destination the user reached inside each
 * primary section, so returning to that section lands where they left it —
 * the way each iOS tab owns its own `NavigationStack`.
 *
 * The **URL is the only source of truth** for the current section's depth.
 * This Map supplies a target only for sections the user is not currently in,
 * so it affects link targets and never rendered arrangement. On reload it is
 * empty and every section link falls back to its declared href — no
 * persistence, and therefore no hydration mismatch.
 */
export type SectionMemory = ReadonlyMap<string, string>

/**
 * Where a section's rail row and tab should point. The section you are in
 * keeps its declared href: retargeting it would fight the URL, which wins.
 */
export function rememberedHref(
  memory: SectionMemory,
  section: string,
  declared: string | undefined,
  isBranchActive: boolean
): string | undefined {
  if (isBranchActive) return declared
  return memory.get(section) ?? declared
}

/** Identity-stable when nothing changed, so writing it cannot loop. */
export function nextMemory(
  memory: SectionMemory,
  section: string,
  href: string
): SectionMemory {
  if (memory.get(section) === href) return memory
  const next = new Map(memory)
  next.set(section, href)
  return next
}

/**
 * The href to remember for the destination the user is on. A declared href
 * wins; otherwise the value itself, but only when it is path-shaped — an
 * opaque value like `'orders'` is not something a link can point at, and
 * guessing would produce a broken target rather than no target.
 */
export function activeHref(
  activeValue: string | undefined,
  declaredHref: string | undefined
): string | undefined {
  if (declaredHref !== undefined) return declaredHref
  if (activeValue !== undefined && activeValue.startsWith('/')) {
    return activeValue
  }
  return undefined
}
```

- [ ] **Step 4: Run the unit tests**

Run: `cd packages/components && pnpm vitest run src/components/Navigator/sectionMemory.test.ts`
Expected: PASS.

- [ ] **Step 5: Write the failing integration tests**

```tsx
describe('per-section stack memory', () => {
  const nav = (value: string) => (
    <Navigator value={value}>
      <Navigator.Primary aria-label='Main'>
        <Navigator.Item value='/components' href='/components'>
          Components
          <Navigator.Secondary aria-label='Component pages'>
            <Navigator.Item value='/components/button' href='/components/button'>
              Button
            </Navigator.Item>
          </Navigator.Secondary>
        </Navigator.Item>
        <Navigator.Item value='/tokens' href='/tokens'>
          Tokens
          <Navigator.Secondary aria-label='Token pages'>
            <Navigator.Item value='/tokens/color' href='/tokens/color'>
              Color
            </Navigator.Item>
          </Navigator.Secondary>
        </Navigator.Item>
      </Navigator.Primary>
    </Navigator>
  )

  const railLink = (name: string) =>
    within(
      document.querySelector('[data-slot="navigator-rail"]') as HTMLElement
    ).getByRole('link', { name })

  it('starts every section on its declared href', async () => {
    render(nav('/components'))
    await flushViewportMeasurement()
    expect(railLink('Tokens')).toHaveAttribute('href', '/tokens')
  })

  it('retargets a section you have left to where you left it', async () => {
    const { rerender } = render(nav('/components'))
    await flushViewportMeasurement()
    rerender(nav('/tokens/color'))
    await flushViewportMeasurement()
    rerender(nav('/components/button'))
    await flushViewportMeasurement()
    expect(railLink('Tokens')).toHaveAttribute('href', '/tokens/color')
  })

  it('leaves the section you are in on its declared href', async () => {
    const { rerender } = render(nav('/tokens/color'))
    await flushViewportMeasurement()
    rerender(nav('/tokens/color'))
    await flushViewportMeasurement()
    expect(railLink('Tokens')).toHaveAttribute('href', '/tokens')
  })

  it('never changes which pane is top', async () => {
    const withPanes = (value: string) => (
      <Navigator value={value}>
        <Navigator.Content>
          <Pane role='list'>List</Pane>
          <Pane role='detail' current={value.split('/').length > 2}>
            Detail
          </Pane>
        </Navigator.Content>
      </Navigator>
    )
    const { rerender } = render(withPanes('/tokens/color'))
    await flushViewportMeasurement()
    rerender(withPanes('/components'))
    await flushViewportMeasurement()
    const panes = document.querySelectorAll('[data-slot="pane"]')
    expect(panes[0]).toHaveAttribute('data-top', 'true')
    expect(panes[1]).toHaveAttribute('data-top', 'false')
  })
})
```

- [ ] **Step 6: Run and confirm failure**

Run: `cd packages/components && pnpm vitest run src/components/Navigator/Navigator.test.tsx -t 'per-section stack memory'`
Expected: tests 1, 3 and 4 PASS (they are the guarantees that must not
regress); test 2 FAILS with `href="/tokens"`.

- [ ] **Step 7: Hold the Map in `NavigatorRoot`**

```tsx
  const [sectionMemory, setSectionMemory] = useState<SectionMemory>(
    () => new Map()
  )
  const rememberSection = useCallback((section: string, href: string) => {
    setSectionMemory((memory) => nextMemory(memory, section, href))
  }, [])
```

Add both to the context value and dependency array. `nextMemory`'s identity
stability is what stops the `setState` from re-rendering forever.

Add `sectionMemory: new Map()` and `rememberSection: () => {}` to the
`createContext` default.

- [ ] **Step 8: Write the memory from `NavigatorPrimary`**

After `items` is derived, add:

```tsx
  // Recorded from an effect, not the walk: this is a write to shared state
  // during render otherwise, and React 19 double-invokes render in StrictMode.
  //
  // Only the branch-active section records, and only a destination deeper than
  // its own landing — a section sitting at its landing has nothing to remember.
  const branchSection = items.find((item) =>
    isBranchActive(item.value, item.descendants, activeValue)
  )
  const branchValue = branchSection?.value
  // The declared href of the active descendant is not on the slot meta —
  // `descendants` is values only — so the value itself is the target, which
  // is what the design says to store. `activeHref` refuses a value that is
  // not path-shaped rather than producing a broken link.
  const deepHref =
    branchValue !== undefined && activeValue !== branchValue
      ? activeHref(activeValue, undefined)
      : undefined

  useEffect(() => {
    if (branchValue === undefined || deepHref === undefined) return
    rememberSection(branchValue, deepHref)
  }, [branchValue, deepHref, rememberSection])
```

- [ ] **Step 9: Read the memory where links are built**

In `NavigatorItem.tsx`, after `effectiveHref` and `isBranch` are computed:

```tsx
  const { sectionMemory } = use(NavigatorContext)
  const targetHref = rememberedHref(
    sectionMemory,
    value,
    effectiveHref,
    isBranch
  )
```

and pass `targetHref` to `NavigatorDestination` instead of `effectiveHref`.
`sectionMemory` comes from the same `use(NavigatorContext)` call already at the
top of the component — add it to that destructure rather than calling `use`
twice.

In `NavigatorPrimary.tsx`, the tab's `href`:

```tsx
              href={rememberedHref(
                sectionMemory,
                tab.value,
                tab.href,
                active
              )}
```

Leave `selectDestination`'s logic alone — it reasons about `topValue` and
`activeValue`, which the memory does not touch.

- [ ] **Step 10: Run everything**

Run: `cd packages/components && pnpm vitest run src/components/Navigator`
Expected: PASS, act warnings ≤ 2.

- [ ] **Step 11: Commit**

```bash
git add packages/components/src/components/Navigator
git commit -m "feat(navigator): remember each section's last destination for link targets"
```

---

## Task 9: Migrate `~/Code/prototype`'s `PersonaSwitcher`

The proof. Today it writes `<Navigator.End><PersonaSwitcher /></Navigator.End>`,
the stray-child warning fires, `deriveMobileSlots` sees no End item, no final
tab is derived, and the rail's `hidden md:block` takes the whole `End` with
it — so the account menu **silently vanishes below `md`**. `Navigator.Panel` is
not done until this migrates and the menu survives on mobile.

This is a different repository. Build and link the components package first.

**Files:**
- Modify: `~/Code/prototype/src/components/account/PersonaSwitcher.tsx`
- Modify: `~/Code/prototype/src/components/AppNavigator.tsx:56-61, 90-94, 129-131`

- [ ] **Step 1: Confirm the bug before fixing it**

```bash
cd ~/Code/roadie && pnpm --filter @oztix/roadie-components build
cd ~/Code/prototype && pnpm dev
```

At 390px on `/studio`, confirm the account menu is unreachable and that the
console carries the stray-child warning. Record what you saw — a fix for a bug
you did not reproduce is a guess.

- [ ] **Step 2: Rewrite `PersonaSwitcher` as panel content**

Drop the `Popover` and the trigger entirely: `Navigator.Panel` owns both
presentations now, and the `compact` prop went with the trigger — the rail's
own `data-form` decides how a row renders.

```tsx
"use client";

import { usePathname, useRouter } from "next/navigation";
import { IconTile, List } from "@oztix/roadie-components";
import { Navigator } from "@oztix/roadie-components/navigator";
import {
  BuildingsIcon,
  CheckIcon,
  SignOutIcon,
  StorefrontIcon,
  TicketIcon,
  UserIcon,
} from "@phosphor-icons/react/ssr";
import { ACCOUNT_DATA } from "@/data/account";
import type { PersonaId } from "@/data/account/types";
import { useAccount } from "@/components/AccountProvider";

// …Account type and ACCOUNTS unchanged…

export function PersonaSwitcher() {
  const { persona, setPersona, signOut } = useAccount();
  const router = useRouter();
  const pathname = usePathname();

  const inStudio = pathname.startsWith("/studio");

  const choose = (account: Account) => {
    setPersona(account.personaId);
    router.push(account.landing);
  };

  const toggleApp = () =>
    router.push(inStudio ? (persona?.landing ?? PERSONAL.landing) : "/studio");

  const logOut = () => {
    signOut();
    router.push(PERSONAL.landing);
  };

  return (
    <Navigator.Item value="account" icon={<UserIcon />}>
      {persona?.name ?? "Not signed in"}
      <Navigator.Panel aria-label="Account">
        <List emphasis="subtler">
          <List.Group>
            <List.GroupTitle>Switch account</List.GroupTitle>
            {ACCOUNTS.map((account) => {
              const active = account.personaId === persona?.id;
              return (
                <List.Item
                  key={account.key}
                  title={account.name}
                  current={active}
                  chevron={false}
                  onClick={() => choose(account)}
                  leading={
                    <IconTile intent="accent" emphasis="subtle" size="sm">
                      {account.org ? (
                        <BuildingsIcon weight="bold" />
                      ) : (
                        <UserIcon weight="bold" />
                      )}
                    </IconTile>
                  }
                  trailing={
                    active ? (
                      <CheckIcon weight="bold" className="size-4" />
                    ) : undefined
                  }
                />
              );
            })}
          </List.Group>
          <List.Item
            title={inStudio ? "Switch to Oztix" : "Switch to Studio"}
            chevron={false}
            onClick={toggleApp}
            leading={
              <IconTile intent="brand" emphasis="subtle" size="sm">
                {inStudio ? (
                  <TicketIcon weight="bold" />
                ) : (
                  <StorefrontIcon weight="bold" />
                )}
              </IconTile>
            }
          />
          <List.Item
            title="Log out"
            chevron={false}
            onClick={logOut}
            leading={
              <IconTile intent="neutral" emphasis="subtle" size="sm">
                <SignOutIcon weight="bold" />
              </IconTile>
            }
          />
        </List>
      </Navigator.Panel>
    </Navigator.Item>
  );
}
```

The `List` is `Drawer.Body`'s direct child in the mobile rendering, which is
what its inset unwind requires — do not wrap it.

The `StatusAvatar` presence dot has no home in a rail row's icon slot; drop it
rather than smuggling a positioned span into `icon`. If the dot matters, it is
a `badge` on the item, which is a separate change and a separate conversation.

- [ ] **Step 3: Drop the `compact` prop at all three call sites**

`AppNavigator.tsx`: `<PersonaSwitcher compact />` → `<PersonaSwitcher />` in
`UserRail`; the other two already pass nothing. `PersonaSwitcher` is now a
`Navigator.Item`, so it stays inside `Navigator.End` — but it must be a
**direct child** of it, which it already is.

- [ ] **Step 4: Verify the fix**

At 390px: the account tab is the final tab in the bar, tapping it opens the
bottom drawer, switching accounts navigates and dismisses, swipe-down and
Escape dismiss. At 1200px: the rail row opens the popover anchored to it, and
the menu content is identical. The stray-child warning is gone from the
console.

At 390px on `/studio`, confirm the Events section's tab and the account tab
coexist — five slots is the cap and Studio declares three items plus End.

- [ ] **Step 5: Commit in the prototype repo**

```bash
cd ~/Code/prototype
git add src/components/account/PersonaSwitcher.tsx src/components/AppNavigator.tsx
git commit -m "feat: move the account menu onto Navigator.Panel"
```

---

## Task 10: Docs

**Files:**
- Modify: `docs/src/app/components/navigator/page.mdx`
- Test: manual, plus `pnpm --filter docs typecheck`

- [ ] **Step 1: Update the Overflow section**

The prose at `page.mdx:189-195` says the overflow "opens a disclosure pane …
it closes when you tap another tab, tap outside, or press Escape". Outside-tap
is gone. Rewrite to describe a full-screen pane pushed onto the stack with the
tab bar still visible, dismissed by tapping a row, tapping More again, or
Escape. Extend the live example's `Navigator.Content` with a
`Navigator.Overflow` carrying a `Pane.Header` / `Pane.Title` and a
`Navigator.OverflowItems`, so the composable form is the one on the page and
the generated fallback is described in prose.

- [ ] **Step 2: Add a Grouping section**

Between Nesting and Overflow. A live example with two `Navigator.Group`s in the
primary rail, each with a `Navigator.GroupTitle`, plus prose covering: the
title is an `<h2>` by default and `render` changes the level; the group is
announced as a named list; groups flatten on the mobile strip and in the tab
bar's first four slots.

- [ ] **Step 3: Add a Tab slots section**

A live example using `tabs={['/', '/calendar', '/listings', '/messages']}` on a
rail that declares more, with prose covering: omitted means source order and is
non-breaking; the tuple caps at four because the fifth slot is More; a value
not in the tree is a dev-mode warning; tab order may differ from rail order.

- [ ] **Step 4: Add a Panel section**

A live example of an `Navigator.End` item declaring a `Navigator.Panel` with a
`List` inside, and prose covering: declaring a panel makes the item a
disclosure rather than a link, so `href` is ignored; it renders as a popover
anchored to the rail row from `md` and as a drawer below; it works on any item,
primary or End; the `List` should be the panel's direct child.

- [ ] **Step 5: Add a Section memory note**

Under Guidelines. Two sentences: returning to a section you have visited lands
where you left it; the URL is the only source of truth, so a reload starts
every section at its declared href.

- [ ] **Step 6: Update the RSC warning list**

`page.mdx:502` names the compounds that find children by reference. Add
`Navigator.Group` (it finds its title), and `Navigator.Panel`.

- [ ] **Step 7: Verify the docs**

```bash
pnpm --filter @oztix/roadie-components build
```

Then, with the dev server running, check every new example at 390 / 900 / 1200
/ 1600px. Do **not** run `pnpm --filter docs build` while the dev server is up,
and do **not** run `prettier --write` on the `.mdx`.

Check `<PropsDefinitions>` renders `tabs`, and the `Navigator.GroupTitle`,
`Navigator.Overflow`, `Navigator.OverflowItems` and `Navigator.Panel` sections.
If `tabs` is missing, the tuple union has tripped `react-docgen-typescript` —
the fix is the same shape as the CVA one: keep the literal union inline on the
prop and export the alias beside it.

- [ ] **Step 8: Commit**

```bash
git add docs/src/app/components/navigator/page.mdx
git commit -m "docs(navigator): document grouping, tab slots, the overflow pane and panels"
```

---

## Task 11: Definition of done

- [ ] **Step 1: Clear the incremental cache and run everything**

```bash
cd ~/Code/roadie
find . -name "*.tsbuildinfo" -not -path "*/node_modules/*" -delete
pnpm typecheck && pnpm lint && pnpm test
```

Expected: all pass. This is CI's view; a local pass on a warm cache is not.

- [ ] **Step 2: Confirm the act-warning budgets**

```bash
cd packages/components && pnpm vitest run src/components/Navigator/Navigator.test.tsx 2>&1 | grep -c 'not wrapped in act'
cd packages/components && pnpm vitest run 2>&1 | grep -c 'not wrapped in act'
```

Expected: ≤ 2 and ≤ 5. Phase 1 brought these down from 14 / 30; giving that
back is a regression, not a rounding error.

- [ ] **Step 3: Confirm the deletions actually happened**

```bash
grep -rn "navigator-overflow-pane\|FLOATING_PANE\|navigatorOverflowPaneVariants\|navigatorGroupLabelVariants\|splitSecondary(" packages/ docs/src ~/Code/prototype/src
```

Expected: no matches. `splitSecondary.ts` the *file* stays — only the function
named `splitSecondary` is gone.

- [ ] **Step 4: Confirm the animated properties**

For the overflow pane and the tab bar, read the computed `transition-property`
in the browser and confirm it lists `translate` / `opacity` and never
`transform` or a layout property. This bug appeared three times in Phase 1 and
the class string reads correctly in every one of them.

- [ ] **Step 5: Verify the four widths**

`http://localhost:9614` at 390 / 900 / 1200 / 1600px. The browser tool floors
at 500px, so use device emulation or read computed values for true mobile.

At 390: tab bar, grouped items flattened, More opens a full-screen pane, an
account panel opens a drawer. At 900: rail with grouped lists, panes still
stacked, panel opens a popover. At 1200: panes as columns. At 1600: unchanged
from Phase 1.

- [ ] **Step 6: Record the follow-ups**

Append to `docs/plans/2026-07-27-pane-phase-1-follow-ups.md` (or create a
Phase 2 sibling) the deferrals this plan made deliberately:

- `Pane.SecondaryNav` — not built; the automatic header injection covers every
  consumer and the override has none.
- **Grouping in the overflow.** A `Navigator.Group` whose items fold does not
  render as a `List.Group` there. `NavigatorSlotMeta` carries no group
  membership, so it would mean threading a group id through the walk for a
  capability with no consumer.
- **`Navigator.End` has no list semantics.** Task 2 gave the rail's primary and
  secondary runs `<ul>`/`<li>`; `Navigator.End` takes arbitrary children, so it
  stayed a `<div>`.
- **The mobile tab bar still animates layout properties** — untouched here, as
  the kickoff required.
- Whether `Navigator.Panel`'s desktop rendering should be configurable. One
  value until something asks for two.

- [ ] **Step 7: Commit**

```bash
git add docs/plans
git commit -m "docs(plan): record Phase 2 follow-ups"
```

---

## Self-review notes

Checked against the kickoff's six scope items:

1. `Navigator.Group` rework + `Navigator.GroupTitle` — Task 1.
2. Rail list semantics — Task 2.
3. `tabs` tuple — Task 3.
4. `Navigator.Overflow` + `Navigator.OverflowItems` — Tasks 4–5.
5. `Navigator.Panel` — Tasks 6–7, proved by Task 9.
6. Per-section stack memory — Task 8.

Two things the design describes that this plan deliberately does **not** build,
both recorded in Task 11 Step 6 rather than left to be discovered:
`Pane.SecondaryNav`, and `List.Group` rendering for grouped items that fold
into the overflow.

One thing the plan adds that the design does not name: the dev warning when
items fold with no `Navigator.Content` mounted. It exists because moving the
overflow into the stack makes its absence silent, and silent failure is this
branch's recurring cost.

---

## Task 12: `Pane.Header` collapse-on-scroll

Added mid-execution by request. Phase 1 recorded this as deferred — "iOS
collapse-on-scroll for `Pane.Header`, the large title shrinking into a small
centred title in the top row. Deferred by request." It is now in scope.

Three behaviours: the header takes a docked shadow once the pane is scrolled;
the large title cross-fades into a small one centred between the back
affordance and `Pane.Actions`; and tapping that small title scrolls the pane
back to the top.

**Runs after Task 8 and before Task 9**, so the prototype and the docs both
verify it. Its number is 12 only because renumbering would invalidate the
briefs already extracted for Tasks 5–11.

### Decisions taken before writing this

- **Two titles, cross-faded — not one title travelling between two cells.**
  The collapsed title sits in the header's top row; the large one sits below
  it. Those are different grid cells, so a single element cannot move between
  them on transform alone without absolute positioning and measured
  endpoints — which would need a `ResizeObserver` on the row, the back button
  and the actions, since their widths define the centre. Two elements
  cross-fading is what iOS actually does, needs no measurement, and stays
  inside `opacity` + `scale`.
- **Only the collapsed title is tappable.** Expanded, you are already at the
  top, so the tap is a no-op — a permanently-tappable heading that usually
  does nothing is a worse affordance than one that appears when it means
  something. This mirrors the tab bar's existing tap-the-active-tab-to-scroll.
- **`Pane.Title` renders both, not `Pane.Header`.** The header deliberately
  does not walk its children — `Pane.Actions` and `Pane.Back` place themselves
  in its grid instead. Making the header find the title by element identity
  would add an RSC silent-failure surface for no gain. `Pane.Title` knows its
  own children, so it emits a fragment of the `<h2>` and the compact echo, and
  both land in the header's grid because fragment children flatten into it.
- **The heading stays the `<h2>`; the echo is a labelled button.** Marking the
  echo `aria-hidden` would bury its own tap target, so instead it carries
  `aria-label='Scroll to top'` and its visible text is `aria-hidden`.
  Assistive tech hears one heading and one button whose purpose is explicit,
  rather than the same words twice.

### The trade-off this forces, stated plainly

**The header's height change is not animated. Only the cross-fade is.**

Making the header shorter means animating a layout property — `height`,
`max-height` or `grid-template-rows` — and the branch's non-negotiable is
`translate` / `scale` / `opacity` only. So the large title leaves the flow at
the threshold and the header's height snaps, while the two titles cross-fade
across it. `--pane-header-height` is republished by the existing
`ResizeObserver`, so sticky content below stays correct.

The alternative — keeping the large title in the box with `invisible`, as the
tab bar does for its hide state — animates perfectly but never shrinks the
header, which is the point of the feature. The snap is the honest cost.

**Files:**
- Modify: `packages/components/src/components/Pane/PaneContext.ts`
- Modify: `packages/components/src/components/Pane/PaneRoot.tsx`
- Modify: `packages/components/src/components/Pane/PaneTitle.tsx`
- Modify: `packages/components/src/components/Pane/PaneHeader.tsx`
- Modify: `packages/components/src/components/Pane/variants.ts`
- Test: `packages/components/src/components/Pane/Pane.test.tsx`
- Modify: `docs/src/app/components/pane/page.mdx`

**Interfaces:**
- Consumes: `PaneContext`, currently `{ role } | null`.
- Produces on `PaneContextValue`:
  ```ts
  /** The pane is scrolled past the collapse threshold. */
  collapsed: boolean
  /** Scrolls this pane's viewport to the top, honouring reduced motion. */
  scrollToTop: () => void
  ```
  plus `paneTitleCompactVariants` and a `collapsed` variant on
  `paneHeaderVariants` and `paneTitleVariants`.

- [ ] **Step 1: Write the failing tests**

```tsx
describe('Pane.Header collapse on scroll', () => {
  const scrolled = (viewport: HTMLElement, top: number) => {
    Object.defineProperty(viewport, 'scrollTop', {
      value: top,
      configurable: true
    })
    fireEvent.scroll(viewport)
  }

  const viewportOf = () =>
    document.querySelector('[data-slot="pane-viewport"]') as HTMLElement
  const headerOf = () =>
    document.querySelector('[data-slot="pane-header"]') as HTMLElement

  it('starts expanded', () => {
    render(
      <Pane>
        <Pane.Header>
          <Pane.Title>Components</Pane.Title>
        </Pane.Header>
      </Pane>
    )
    expect(headerOf()).toHaveAttribute('data-collapsed', 'false')
  })

  it('collapses once the viewport scrolls past the threshold', async () => {
    render(
      <Pane>
        <Pane.Header>
          <Pane.Title>Components</Pane.Title>
        </Pane.Header>
      </Pane>
    )
    await act(async () => {
      scrolled(viewportOf(), 40)
      await Promise.resolve()
    })
    expect(headerOf()).toHaveAttribute('data-collapsed', 'true')
  })

  it('does not flap between the two thresholds', async () => {
    render(
      <Pane>
        <Pane.Header>
          <Pane.Title>Components</Pane.Title>
        </Pane.Header>
      </Pane>
    )
    await act(async () => {
      scrolled(viewportOf(), 40)
      await Promise.resolve()
    })
    // Between the expand and collapse thresholds: the state it is already in
    // wins, so a scroll that crosses neither changes nothing.
    await act(async () => {
      scrolled(viewportOf(), 16)
      await Promise.resolve()
    })
    expect(headerOf()).toHaveAttribute('data-collapsed', 'true')

    await act(async () => {
      scrolled(viewportOf(), 2)
      await Promise.resolve()
    })
    expect(headerOf()).toHaveAttribute('data-collapsed', 'false')
  })

  it('exposes the compact title as a scroll-to-top button', async () => {
    render(
      <Pane>
        <Pane.Header>
          <Pane.Title>Components</Pane.Title>
        </Pane.Header>
      </Pane>
    )
    const button = screen.getByRole('button', { name: 'Scroll to top' })
    expect(button).toBeInTheDocument()
    // The heading is the h2, not the button — the button's own text is
    // decorative, so the accessible name comes from its label.
    expect(
      screen.getByRole('heading', { name: 'Components', level: 2 })
    ).toBeInTheDocument()
  })

  it('keeps the compact button out of the tab order while expanded', () => {
    render(
      <Pane>
        <Pane.Header>
          <Pane.Title>Components</Pane.Title>
        </Pane.Header>
      </Pane>
    )
    expect(screen.getByRole('button', { name: 'Scroll to top' })).toHaveAttribute(
      'tabindex',
      '-1'
    )
  })

  it('scrolls the viewport to the top when the compact title is tapped', async () => {
    render(
      <Pane>
        <Pane.Header>
          <Pane.Title>Components</Pane.Title>
        </Pane.Header>
      </Pane>
    )
    const viewport = viewportOf()
    const scrollTo = vi.fn()
    viewport.scrollTo = scrollTo as unknown as typeof viewport.scrollTo

    await act(async () => {
      scrolled(viewport, 40)
      await Promise.resolve()
    })
    await userEvent.click(screen.getByRole('button', { name: 'Scroll to top' }))
    expect(scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' })
  })

  it('renders no compact title outside a Pane', () => {
    render(<Pane.Title>Loose</Pane.Title>)
    expect(screen.queryByRole('button', { name: 'Scroll to top' })).toBeNull()
    expect(screen.getByRole('heading', { name: 'Loose' })).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run them and confirm they fail for the right reason**

Run: `cd packages/components && pnpm vitest run src/components/Pane/Pane.test.tsx -t 'collapse on scroll'`

Expected: FAIL — no `data-collapsed` attribute, no "Scroll to top" button. The
last test (`renders no compact title outside a Pane`) is the one that should
**pass** at RED, because nothing renders a compact title yet; note that in
your evidence rather than treating it as broken.

- [ ] **Step 3: Extend `PaneContext`**

```ts
export type PaneContextValue = {
  role: PaneRole
  /** The pane is scrolled past the collapse threshold. */
  collapsed: boolean
  /** Scrolls this pane's viewport to the top, honouring reduced motion. */
  scrollToTop: () => void
}
```

- [ ] **Step 4: Own the collapse state in `PaneRoot`**

The pane computes this from its own viewport, with no reference to the
orchestrator — a standalone `Pane` with no `Navigator` anywhere must collapse
its header exactly the same way.

Add above the component:

```tsx
// Hysteresis, not one threshold: a header that toggles on a 1px scroll
// oscillates, and the cross-fade makes that obvious. Collapse late, expand
// early, and the band between them holds whatever state it is already in.
const COLLAPSE_AT = 24
const EXPAND_AT = 8
```

Inside `PaneRoot`:

```tsx
  const [collapsed, setCollapsed] = useState(false)
```

`handleScroll`'s existing early return is gated on `primaryNav !== 'auto'`.
That gate is about **reporting to the orchestrator**, not about collapsing —
a pane declaring `primaryNav='visible'` still collapses its own header. So the
collapse must be computed before the gate:

```tsx
  const handleScroll = () => {
    if (frame.current !== null) return
    frame.current = requestAnimationFrame(() => {
      frame.current = null
      const viewport = viewportRef.current
      if (!viewport) return
      const top = viewport.scrollTop
      setCollapsed((was) =>
        was ? top > EXPAND_AT : top > COLLAPSE_AT
      )
      // A pane that has opted out of `auto` is not describing scroll-linked
      // nav behaviour at all, so it stays silent rather than reporting a
      // position the orchestrator would have to learn to ignore.
      if (primaryNav !== 'auto') return
      onViewportScroll(top)
    })
  }
```

Add a `scrollToTop` the pane can call on itself. `registerScroller` already
hands an identical closure to the orchestrator; extract it so there is one
definition rather than two that can drift:

```tsx
  const scrollToTop = useCallback(() => {
    const viewport = viewportRef.current
    if (!viewport) return
    viewport.scrollTo({
      top: 0,
      behavior: prefersReducedMotion() ? 'auto' : 'smooth'
    })
  }, [])

  useLayoutEffect(() => {
    registerScroller(scrollToTop)
    return () => registerScroller(null)
  }, [registerScroller, scrollToTop])
```

and widen the context value:

```tsx
  const context = useMemo(
    () => ({ role, collapsed, scrollToTop }),
    [role, collapsed, scrollToTop]
  )
```

- [ ] **Step 5: Add the variants**

In `packages/components/src/components/Pane/variants.ts`:

```ts
// The docked shadow. `box-shadow` is a paint property, not a layout one, so
// transitioning it is allowed where `height` is not — the same reason the tab
// bar already transitions its own.
export const paneHeaderVariants = cva(
  [
    'sticky top-0 z-sticky grid gap-2',
    PANE_CHROME_SURFACE,
    'px-(--content-inset) pt-4 pb-2',
    '[&:has(>[data-slot=pane-back])>[data-slot=pane-actions]]:max-w-[calc(100%_-_--spacing(14))]',
    'motion-safe:transition-[box-shadow] motion-safe:duration-slow motion-safe:ease-enter',
    'motion-reduce:transition-none'
  ],
  {
    variants: {
      backOnly: { true: 'lg:hidden', false: '' },
      collapsed: { true: 'shadow-md', false: 'shadow-none' }
    },
    defaultVariants: { backOnly: false, collapsed: false }
  }
)
```

```ts
// The large title. Leaves on `scale` and `opacity` — never a layout property —
// and drops out of the flow at the end so the header actually gets shorter.
// `transition-discrete` holds `display` until the fade has finished, the same
// technique the mobile tab bar uses for its hide state.
export const paneTitleVariants = cva(
  [
    surfaceTitleClass,
    'origin-left',
    'motion-safe:transition-[scale,opacity,display] motion-safe:transition-discrete',
    'motion-safe:duration-slow motion-safe:ease-enter',
    'motion-reduce:transition-none'
  ],
  {
    variants: {
      collapsed: {
        true: 'hidden scale-95 opacity-0',
        false: 'scale-100 opacity-100'
      }
    },
    defaultVariants: { collapsed: false }
  }
)

// The compact echo: centred in the header's top row, between the back
// affordance and `Pane.Actions`, which share that same cell. Scaled up rather
// than sized up, so the growth is compositor-only.
export const paneTitleCompactVariants = cva(
  [
    'col-start-1 row-start-1 justify-self-center',
    'min-w-0 truncate text-sm font-semibold text-strong',
    'motion-safe:transition-[scale,opacity] motion-safe:duration-slow',
    'motion-safe:ease-enter motion-reduce:transition-none'
  ],
  {
    variants: {
      collapsed: {
        true: 'scale-100 opacity-100',
        // Not `hidden`: it keeps its cell so the row's centre never reflows
        // as it appears. `invisible` is what takes it out of the AT tree.
        false: 'invisible scale-95 opacity-0'
      }
    },
    defaultVariants: { collapsed: false }
  }
)
```

**Verify the emitted CSS, do not trust the class strings.** Compile and read
the `transition-property` on all three: Tailwind v4 emits `scale` as its own
property, so a list naming `transform` would animate nothing. This bug shipped
three times in Phase 1.

- [ ] **Step 6: Render both titles from `Pane.Title`**

```tsx
'use client'

import { type ComponentProps, use } from 'react'

import { cn } from '@oztix/roadie-core/utils'

import { PaneContext } from './PaneContext'
import { paneTitleCompactVariants, paneTitleVariants } from './variants'

export type PaneTitleProps = ComponentProps<'h2'>

/**
 * Rendered as an `<h2>` so it never collides with the page's own `<h1>`.
 *
 * Inside a `Pane`, also emits a compact echo that fades into the header's top
 * row as the pane scrolls, and scrolls the pane back to the top when tapped.
 * The two are separate elements rather than one that travels: they sit in
 * different grid cells, and crossing between them on transform alone would
 * need measured endpoints and a `ResizeObserver` on every neighbour.
 *
 * The `<h2>` stays the heading; the echo is a button labelled for what it
 * does, with its own text hidden, so assistive tech hears one heading and one
 * purposeful control rather than the same words twice.
 */
export function PaneTitle({ className, children, ...props }: PaneTitleProps) {
  const pane = use(PaneContext)
  const collapsed = pane?.collapsed ?? false

  return (
    <>
      <h2
        data-slot='pane-title'
        className={cn(paneTitleVariants({ collapsed }), className)}
        {...props}
      >
        {children}
      </h2>
      {pane ? (
        <button
          type='button'
          data-slot='pane-title-compact'
          aria-label='Scroll to top'
          // Invisible while expanded, so it must not be reachable either.
          tabIndex={collapsed ? undefined : -1}
          aria-hidden={collapsed ? undefined : true}
          onClick={pane.scrollToTop}
          className={paneTitleCompactVariants({ collapsed })}
        >
          <span aria-hidden>{children}</span>
        </button>
      ) : null}
    </>
  )
}

PaneTitle.displayName = 'Pane.Title'
```

`Pane.Title` must stay a **direct child** of `Pane.Header` — the echo places
itself in the header's grid, and grid placement only reaches direct children.
Add that line to the docblock alongside `Pane.Actions`', which says the same.

- [ ] **Step 7: Give the header its collapsed attribute**

In `PaneHeader.tsx`, read the pane's collapse state and pass it through:

```tsx
  const collapsed = pane?.collapsed ?? false
```

```tsx
    <header
      ref={headerRef}
      data-slot='pane-header'
      data-collapsed={String(collapsed)}
      className={cn(paneHeaderVariants({ backOnly, collapsed }), className)}
    >
```

`pane` is already read at the top of the component for the back-affordance
rule; add to that, do not call `use` twice.

- [ ] **Step 8: Run the tests**

Run: `cd packages/components && pnpm vitest run src/components/Pane/Pane.test.tsx`
Expected: PASS. Then the whole suite once: act warnings ≤ 5 overall.

- [ ] **Step 9: Verify in the browser**

The docs dev server runs at `http://localhost:9614`; do not start another and
do not run a docs build.

At 390px and at 1200px, on a pane with enough content to scroll: the header
takes its shadow as you scroll, the large title fades and scales out, the
compact title fades in centred between the back affordance and the actions,
and tapping it returns the pane to the top with the large title coming back.
Confirm the compact title does not collide with `Pane.Actions` on a long
title — it truncates, the actions keep their cell.

Then check `prefers-reduced-motion`: both titles swap instantly, the shadow
appears instantly, and the scroll-to-top jumps rather than smooth-scrolls.

- [ ] **Step 10: Document it**

In `docs/src/app/components/pane/page.mdx`, add a short section under the
header's existing documentation: the collapse is automatic and needs no prop;
the compact title is a scroll-to-top control; `Pane.Title` must be a direct
child of `Pane.Header`; and the header's height snaps while the titles
cross-fade, because animating height is a layout property this design system
does not animate.

Never run `prettier --write` on the `.mdx`.

- [ ] **Step 11: Commit**

```bash
git add packages/components/src/components/Pane docs/src/app/components/pane
git commit -m "feat(pane): collapse the header on scroll with a scroll-to-top compact title"
```

---

# Registration rework — Tasks 13–15

Added mid-execution from a consumer bug report (`~/Code/prototype`, Next.js 16
App Router app shell). **Runs immediately after Task 5, before Tasks 6–12.**

## The bug

`Navigator.Content` identifies panes by walking its **direct children** and
comparing `child.type === PaneRoot`. In an App Router app shell, panes arrive
inside parallel-route slot nodes whose `type` is a Next.js segment component,
so the comparison never matches. No pane is recognised, `data-top` is never
written, and every behaviour keyed off it is silently inert: no push/pop
motion, panes overlapping with no ordering so taps hit the wrong one, covered
panes still interactive, `headerExtras` permanently `null`, `primaryNav`
ignored.

Verified against the source: the walk in `NavigatorContent.tsx`, the
`cloneElement` that only runs for identified panes, and the stack CSS in
`navigatorContentVariants`, which is entirely `&>` direct-child selectors — so
even a `data-top` written onto a nested pane would not match.

**This is not consumer misuse.** The `Pane` docs compose panes literally, which
works; the app-shell recipe prescribes parallel routes, which cannot. A layout
receives slots as opaque nodes and cannot reach inside them or hoist what they
return. The existing docblock reads as an authoring mistake to avoid; in the
App Router it is not avoidable.

**Why it was silent.** `PaneChromeContext` defaults to `PANE_CHROME_NONE` — the
identical inert value the orchestrator hands a *covered* pane. So "never seen"
and "correctly behind another pane" are indistinguishable. That default is the
bug behind the bug.

## The fix, and why it is an improvement rather than a patch

Panes **register** with the nearest orchestrator through context and receive
their stack position back, instead of being found by an element-identity walk.
Three things fall out that the current design has to work around:

- **The sibling combinator goes.** Direction (`ahead` / `behind`) currently
  comes from `[data-top=true] ~ [data-top=false]`, which forces declaration
  order to be a visual assumption — a constraint Task 8 had to tiptoe around.
  Registration knows the order in JS, so each pane carries its own position.
- **The unconditional wrapper goes.** Every pane is currently wrapped in a
  `PaneChromeContext` element whether or not it is top, purely because changing
  a parent's element type remounts the subtree and loses scroll position. With
  registration, `PaneRoot` provides its own chrome context from a lookup, so
  there is no wrapper left to make conditional.
- **`Navigator.Overflow`'s special case goes.** Task 5 taught the walk a second
  element type; a registering overflow pane needs no recognition at all,
  because it renders a `PaneRoot` like everything else. The generated fallback
  still renders from `Navigator.Content` — it just stops being a walk concern.

### Constraints the rework must preserve

All are load-bearing and documented in code comments today:

- **No remount as the stack moves** — scroll position is lost on a parent type
  change.
- **Band-independence.** No `matchMedia`, no breakpoint logic in JS. Whether
  depth matters stays a CSS question.
- **`Pane` works with no `Navigator` present.** `Pane` defines the context;
  `Navigator` fills it. Registration degrades to a no-op standalone, and the
  dependency stays one-directional with no module cycle.
- **An inspector never participates** in the stack.
- **A single section-nav landmark** — only the top pane's header renders it.
- **Server-safety** — `NavigatorContent` must not force more of the tree client
  side than it already does.

### Decision: one attribute, not two

`data-top` is **replaced** by `data-stack-position` (`top` | `ahead` |
`behind`), not supplemented by it. Keeping both would be two attributes
expressing one decision — the redundancy that killed `collapseNav` +
`hideOnMobile` in the Phase 1 design. Tests asserting `data-top` are updated,
not bridged. A standalone pane has no orchestrator, so it carries no attribute
at all and the stack rules never match it — which is how "CSS owns whether
depth matters" survives the move.

---

## Task 13: The registration seam

**Files:**
- Create: `packages/components/src/components/Pane/PaneStackContext.ts`
- Modify: `packages/components/src/components/Pane/PaneRoot.tsx`
- Modify: `packages/components/src/components/Navigator/NavigatorContent.tsx`
- Modify: `packages/components/src/components/Navigator/paneStack.ts`
- Test: `packages/components/src/components/Pane/Pane.test.tsx`,
  `packages/components/src/components/Navigator/paneStack.test.ts`

**Interfaces produced:**

```ts
// PaneStackContext.ts — defined by Pane, filled by Navigator.
export type PaneStackPosition = 'top' | 'ahead' | 'behind'

export type PaneRegistration = {
  role: PaneRole
  current: boolean
  presentation: PanePresentation
  primaryNav: PanePrimaryNav
}

export type PaneStackContextValue = {
  register: (id: string, node: HTMLElement, entry: PaneRegistration) => void
  unregister: (id: string) => void
  positionOf: (id: string) => PaneStackPosition | null
  chromeOf: (id: string) => PaneChromeContextValue
}

// `null` means no orchestrator: a standalone pane stacks with nothing.
export const PaneStackContext =
  createContext<PaneStackContextValue | null>(null)
```

- [ ] **Step 1: Write the failing tests**

The regression the bug report asks for — a pane behind a wrapper component,
not a direct child:

```tsx
describe('pane registration through a wrapper', () => {
  // Stands in for a Next.js parallel-route slot node: an opaque component
  // whose type is not PaneRoot and which the orchestrator cannot see through.
  const Slot = ({ children }: { children: ReactNode }) => <>{children}</>

  const positions = () =>
    Array.from(document.querySelectorAll('[data-slot="pane"]')).map((p) =>
      p.getAttribute('data-stack-position')
    )

  it('gives a wrapped pane a stack position', async () => {
    render(
      <Navigator value='/a'>
        <Navigator.Content>
          <Slot>
            <Pane role='list'>List</Pane>
          </Slot>
          <Slot>
            <Pane role='detail' current>
              Detail
            </Pane>
          </Slot>
        </Navigator.Content>
      </Navigator>
    )
    await flushViewportMeasurement()
    expect(positions()).toEqual(['behind', 'top'])
  })

  it('orders two panes contributed by one wrapper', async () => {
    render(
      <Navigator value='/a'>
        <Navigator.Content>
          <Slot>
            <Pane role='list'>List</Pane>
            <Pane role='detail' current>
              Detail
            </Pane>
          </Slot>
        </Navigator.Content>
      </Navigator>
    )
    await flushViewportMeasurement()
    expect(positions()).toEqual(['behind', 'top'])
  })

  it('marks a pane declared after the top one as ahead', async () => {
    render(
      <Navigator value='/a'>
        <Navigator.Content>
          <Pane role='list' current>
            List
          </Pane>
          <Slot>
            <Pane role='detail'>Detail</Pane>
          </Slot>
        </Navigator.Content>
      </Navigator>
    )
    await flushViewportMeasurement()
    expect(positions()).toEqual(['top', 'ahead'])
  })

  it('leaves a standalone pane unpositioned', async () => {
    render(<Pane role='list'>Alone</Pane>)
    await flushViewportMeasurement()
    expect(positions()).toEqual([null])
  })

  it('hands chrome to the wrapped top pane', async () => {
    render(
      <Navigator value='/foundations'>
        <Navigator.Primary aria-label='Main'>
          <Navigator.Item value='/foundations' href='/foundations'>
            Foundations
            <Navigator.Secondary aria-label='Foundations pages'>
              <Navigator.Item
                value='/foundations/colors'
                href='/foundations/colors'
              >
                Colors
              </Navigator.Item>
            </Navigator.Secondary>
          </Navigator.Item>
        </Navigator.Primary>
        <Navigator.Content>
          <Slot>
            <Pane role='detail' current>
              <Pane.Header>
                <Pane.Title>Foundations</Pane.Title>
              </Pane.Header>
            </Pane>
          </Slot>
        </Navigator.Content>
      </Navigator>
    )
    await flushViewportMeasurement()
    expect(
      document.querySelector('[data-slot="navigator-secondary-strip"]')
    ).not.toBeNull()
  })
})
```

- [ ] **Step 2: Run them and confirm they fail**

Run: `cd packages/components && pnpm vitest run src/components/Pane/Pane.test.tsx -t 'registration through a wrapper'`

Expected: FAIL — `data-stack-position` does not exist, so every case reports
nulls. The standalone test should PASS at RED; note that in your evidence
rather than treating it as broken.

- [ ] **Step 3: Create `PaneStackContext.ts`**

Write the types above, with this docblock on the context:

```ts
// Registration, not an element-identity walk: an orchestrator cannot see
// through a wrapper it did not render — a Next.js parallel-route slot node
// most of all — so panes announce themselves instead of being found. `Pane`
// defines this and fills nothing; `Navigator.Content` provides it. That keeps
// `Pane` usable with no `Navigator` anywhere and the dependency one-way.
```

- [ ] **Step 4: Register from `PaneRoot`**

`PaneRoot` takes a `useId()`, registers its node and entry, and reads back its
own position and chrome. Registration re-runs when any entry value changes,
because the orchestrator derives the top from `current`:

```tsx
  const stack = use(PaneStackContext)
  const paneId = useId()
  const paneRef = useRef<HTMLElement | null>(null)

  const setPaneRef = useCallback(
    (node: HTMLDivElement | null) => {
      paneRef.current = node as HTMLElement | null
      if (typeof forwardedRef === 'function') forwardedRef(node)
      else if (forwardedRef) forwardedRef.current = node
    },
    [forwardedRef]
  )

  useEffect(() => {
    const node = paneRef.current
    if (!stack || !node) return
    stack.register(paneId, node, { role, current, presentation, primaryNav })
    return () => stack.unregister(paneId)
  }, [stack, paneId, role, current, presentation, primaryNav])

  const position = stack?.positionOf(paneId) ?? null
  const chrome = stack?.chromeOf(paneId) ?? PANE_CHROME_NONE
```

Render `data-stack-position={position ?? undefined}` on the `<section>`, drop
`data-current` in favour of it, and provide the chrome to its own subtree:

```tsx
        <ScrollArea.Content fitWidth={false}>
          <PaneChromeContext value={chrome}>
            <PaneContext value={context}>{children}</PaneContext>
          </PaneChromeContext>
        </ScrollArea.Content>
```

The pane providing its own chrome is what removes `NavigatorContent`'s
unconditional wrapper — and with it the remount hazard that forced the wrapper
to be unconditional in the first place.

- [ ] **Step 5: Order registrations by DOM position**

Registration order is mount order, which is not reliably visual order once
slots are involved. Sort by document position instead — read once per
registration change, never per frame. Add to `paneStack.ts`:

```ts
/**
 * Registered panes in document order. Mount order is not visual order when
 * panes arrive through slots the orchestrator did not render, so the DOM is
 * the authority on which pane is ahead of which.
 */
export function orderByDocumentPosition<T extends { node: HTMLElement }>(
  entries: readonly T[]
): T[] {
  return [...entries].sort((a, b) =>
    a.node === b.node
      ? 0
      : a.node.compareDocumentPosition(b.node) &
          Node.DOCUMENT_POSITION_FOLLOWING
        ? -1
        : 1
  )
}

/**
 * Each pane's position, given the ordered stack. `top` is the deepest
 * `current` pane; anything after it is `ahead` (not yet reached), anything
 * before it is `behind` (already visited). An `inspector` never participates.
 */
export function derivePositions(
  entries: readonly PaneEntry[]
): (PaneStackPosition | null)[] {
  const top = deriveTopIndex(entries)
  return entries.map((entry, index) =>
    entry.role === 'inspector'
      ? null
      : index === top
        ? 'top'
        : index > top
          ? 'ahead'
          : 'behind'
  )
}
```

`deriveTopIndex` is unchanged and stays band-independent — no `matchMedia`
enters here.

Add unit tests for both in `paneStack.test.ts`, including an inspector
declared first (which must not take a slot it never occupies) and a stack with
no `current` pane at all.

- [ ] **Step 6: Make `NavigatorContent` the provider**

Replace the children walk entirely. `NavigatorContent` holds the registration
Map in a ref, keeps a render-triggering version counter, and derives positions
from the ordered entries:

- `register` / `unregister` mutate the ref and bump the counter.
- Ordering and derivation run during render from the ref's current contents.
- `positionOf` and `chromeOf` read the derived result.
- The top pane's `primaryNav` is published to `NavigatorContext` from an
  effect, exactly as today.
- `chromeOf(id)` returns the live chrome for the top pane and
  `PANE_CHROME_NONE` for every other — the top-pane gate is unchanged in
  meaning, only in delivery.

The `Navigator.Overflow` recognition Task 5 added to the walk is **deleted**:
an overflow pane registers like any other. The generated fallback still renders
from `Navigator.Content` when nothing is declared.

`children` is now rendered untouched:

```tsx
  return (
    <main
      data-slot='navigator-content'
      className={cn(navigatorContentVariants(), className)}
      {...props}
    >
      <PaneStackContext value={stackValue}>
        {children}
        {fallbackOverflow}
      </PaneStackContext>
    </main>
  )
```

- [ ] **Step 7: Update the tests that assert `data-top`**

Every existing assertion on `data-top` becomes one on `data-stack-position`.
`toHaveAttribute('data-top', 'true')` becomes `'data-stack-position', 'top'`;
`'false'` becomes `'behind'` or `'ahead'` depending on which side of the top
pane it sits — **do not** blanket-replace `false` with `behind`, which would
silently weaken the ahead cases. Report how many you changed and how many were
`ahead`.

- [ ] **Step 8: Run everything**

Run: `cd packages/components && pnpm vitest run src/components/Pane src/components/Navigator`
then `pnpm typecheck` from the repo root. Act warnings: `Navigator.test.tsx`
≤ 2, whole suite ≤ 5.

- [ ] **Step 9: Commit**

```bash
git add packages/components/src/components/Pane packages/components/src/components/Navigator
git commit -m "feat(pane): register panes with the orchestrator instead of walking children"
```

---

## Task 14: Move the stack CSS onto the pane

The stack rules are direct-child selectors on `Navigator.Content`, so they
cannot reach a wrapped pane no matter what attribute it carries. They move onto
the pane itself, keyed on its own `data-stack-position`.

**Files:**
- Modify: `packages/components/src/components/Pane/variants.ts`
- Modify: `packages/components/src/components/Navigator/variants.ts`
- Test: `packages/components/src/components/Pane/Pane.test.tsx`

- [ ] **Step 1: Write the failing test**

A class-string assertion is the wrong tool here — assert the emitted CSS
instead. Add a test that compiles the pane's class string and checks the
resolved `transition-property` contains `translate` and `opacity` and does
**not** contain `transform` or any layout property. If the repo has no existing
CSS-compilation test helper, say so in your report and pin the behaviour with a
DOM assertion that a positioned pane carries the stack classes while a
standalone one does not, then note the gap explicitly.

- [ ] **Step 2: Move the rules**

Delete from `navigatorContentVariants` every rule matching
`max-lg:[&>[data-top…]]` and `max-lg:[&>[data-slot=pane]]`, and add to
`paneVariants` a `stackPosition` variant carrying the same geometry keyed on
the pane's own state. Preserve each verbatim — every one was learned the hard
way and the comments explaining why are load-bearing:

- `absolute!` — beats Base UI's inline `position: relative`, which no class can
  outrank.
- `inset-0`.
- `behind`: `-translate-x-1/3`, `opacity-90` — iOS dims the covered view with a
  scrim rather than fading it out; 0.6 ghosted the frame through the pane.
- `ahead`: `translate-x-full`, `opacity-100` — parked fully off-screen right.
- `pointer-events-none` and `[content-visibility:auto]` on both non-top states.
- `motion-safe:transition-[translate,opacity]`, `duration-slow`, `ease-enter`,
  and `motion-reduce:transition-none`.

`translate`, **not** `transform`: Tailwind v4 emits the translate utilities as
the independent `translate` property, so naming `transform` transitions
nothing. This bug shipped three times in Phase 1 — compile and read the emitted
`transition-property` rather than trusting the class string.

All of it stays `max-lg:` gated: below `lg` the panes stack, from `lg` they are
columns and every stacking rule is inert. A pane with no `data-stack-position` —
standalone, or an inspector — matches none of it.

- [ ] **Step 3: Verify in the browser**

The docs dev server runs at `http://localhost:9614`; do not start another and
do not run a docs build. At 390px: list → detail pushes in from the right, back
pops it out, the covered pane sits a third left and dimmed. At 1200px: columns,
no transforms. Read the computed `transition-property` on a pane and confirm it
lists `translate`, not `transform`.

- [ ] **Step 4: Commit**

```bash
git add packages/components/src/components/Pane/variants.ts packages/components/src/components/Navigator/variants.ts
git commit -m "refactor(pane): key the stack geometry off the pane's own position"
```

---

## Task 15: Make the failure loud, and pin the acceptance criteria

**Files:**
- Modify: `packages/components/src/components/Navigator/NavigatorContent.tsx`
- Test: `packages/components/src/components/Navigator/Navigator.test.tsx`
- Modify: `docs/src/app/components/pane/page.mdx`

- [ ] **Step 1: Write the failing tests**

```tsx
it('warns when it renders children but no pane registers', async () => {
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
  render(
    <Navigator value='/a'>
      <Navigator.Content>
        <div>Not a pane</div>
      </Navigator.Content>
    </Navigator>
  )
  await flushViewportMeasurement()
  expect(
    warn.mock.calls.some((c) => String(c[0]).includes('identified no panes'))
  ).toBe(true)
  warn.mockRestore()
})

it('does not warn when it has no children at all', async () => {
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
  render(
    <Navigator value='/a'>
      <Navigator.Content />
    </Navigator>
  )
  await flushViewportMeasurement()
  expect(
    warn.mock.calls.some((c) => String(c[0]).includes('identified no panes'))
  ).toBe(false)
  warn.mockRestore()
})
```

- [ ] **Step 2: Add the warning**

From an effect, gated on `isDev()`, never from render — React 19 double-invokes
it:

```tsx
  const noPanes = registeredCount === 0 && children != null
  useEffect(() => {
    if (!isDev() || !noPanes) return
    console.warn(
      '[Roadie] Navigator.Content rendered children but identified no ' +
        'panes. Stack position, push/pop motion, the mobile section nav ' +
        'and primaryNav are all inert until a Pane registers. If your ' +
        'panes render inside a wrapper that suppresses effects, or you are ' +
        'rendering a Pane from a server component, that is the cause.'
    )
  }, [noPanes])
```

`react-hooks/exhaustive-deps` is not registered in this package, so do not add
an `eslint-disable` for it.

- [ ] **Step 3: Pin the acceptance criteria**

One test each, in `Navigator.test.tsx`:

1. A pane inside a wrapper receives a stack position — Task 13 covers this;
   reference it rather than duplicating.
2. Below `lg`, list → detail and detail → list carry the push and pop
   geometry — assert the position attribute flips, not the animation itself.
3. A covered pane is `pointer-events-none`.
4. Two panes contributed by one wrapper stack correctly relative to each
   other — the case that broke in the prototype: an event pane plus a
   drill-down pane, both returned by one page component.
5. `primaryNav` and the section nav resolve against the true top pane when
   that pane is wrapped.
6. The literal-children composition still works unchanged.

- [ ] **Step 4: Document the change**

In `docs/src/app/components/pane/page.mdx`, replace any text stating panes must
be direct children of `Navigator.Content` — that constraint is gone. Say
instead that panes announce themselves to the nearest `Navigator.Content`
wherever they sit in its subtree, so a pane returned by a route, a slot or a
wrapper component participates in the stack normally.

Never run `prettier --write` on the `.mdx`.

- [ ] **Step 5: Confirm the report's own reproduction**

Rebuild components (`pnpm --filter @oztix/roadie-components build`), then in
`~/Code/prototype` check the app-shell route: every `[data-slot=pane]` carries
`data-stack-position`, list → detail animates below `lg`, and tapping a row in
a second pane reaches the right pane. Remove the `max-lg:hidden` workaround in
`OrgEventAllocationView.tsx` and confirm navigation still works without it —
that workaround is commented as removable once the orchestrator handles
nesting, and this is that point.

- [ ] **Step 6: Commit**

```bash
git add packages/components/src/components/Navigator docs/src/app/components/pane
git commit -m "feat(navigator): warn when Content identifies no panes, and pin the nesting cases"
```

---

## Task 16: A panel item is not a page

Found by review during Task 8, confirmed by a second reviewer. **Runs before
Task 9**, because the prototype migration should land on correct semantics.

### The defect

`isBranchActive` has three clauses, and the third is a route-prefix match
(`activeValue.startsWith('${itemValue}/')`) that deliberately fires for routes
the declared tree cannot enumerate. A `Navigator.Panel` item therefore reads as
branch-active whenever a consumer mounts a route beneath its value — a
supported pattern.

`NavigatorTab` maps `active` straight to `aria-current`:

```tsx
const ariaCurrent = active ? (isDisclosure ? 'true' : 'page') : undefined
```

With no explicit `tabs` prop and four or fewer items, every item including a
panel lands in `slots.tabs`. So a panel item under such a route announces
**`aria-current="page"`** on its mobile tab — on a `<button>` that opens a
menu and navigates nowhere. A screen-reader user tabbing the bar hears
"Account, current page" for a control that is not a page and cannot be one.

`Navigator.OverflowItems` has the same defect by the same route: it passes
`current={active}` to `List.Item`, which drives its own `aria-current`.

**This is not pre-existing.** The prefix clause is old, but `Navigator.Panel`
is new in this branch, so the combination ships here for the first time. It is
a defect this PR introduces.

### Why it needs a named concept rather than a third guard

Task 8 fixed the same root cause at the memory write site with an inline
`!item.panel &&`. This would be the second and third such guard. Three sites
open-coding "a panel item is not a section" is the accretion this branch has
been removing everywhere else — and the ruling on Task 8 said explicitly that
if the guard belonged in more than one place, that was the signal to name it.

**Files:**
- Modify: `packages/components/src/components/Navigator/NavigatorContext.ts`
- Modify: `packages/components/src/components/Navigator/NavigatorPrimary.tsx`
- Modify: `packages/components/src/components/Navigator/NavigatorOverflowItems.tsx`
- Test: `packages/components/src/components/Navigator/Navigator.test.tsx`

**Interfaces:**
- Produces `isSectionActive(item, activeValue)` — or a better name — beside
  `isBranchActive` in `NavigatorContext.ts`: branch-active **and** not a
  panel. It takes the slot meta (or the value/descendants/panel triple) so
  every caller answers the question the same way.
- Task 8's inline `!item.panel &&` at the `branchSection` derivation is
  replaced by a call to it, so there is one definition rather than three.

- [ ] **Step 1: Write the failing tests**

Three, each proven to fail first:

```tsx
describe('a panel item is not a page', () => {
  const nav = (value: string) => (
    <Navigator value={value}>
      <Navigator.Primary aria-label='Main'>
        <Navigator.Item value='/home' href='/home'>
          Home
        </Navigator.Item>
        <Navigator.Item value='/account'>
          Account
          <Navigator.Panel aria-label='Account'>
            <List>
              <List.Item title='Log out' />
            </List>
          </Navigator.Panel>
        </Navigator.Item>
      </Navigator.Primary>
    </Navigator>
  )

  it('does not announce a panel tab as the current page', async () => {
    render(nav('/account/billing'))
    await flushViewportMeasurement()
    const tab = within(tabBarOf()).getByRole('button', { name: 'Account' })
    expect(tab).not.toHaveAttribute('aria-current', 'page')
  })

  it('still announces a real section as the current page', async () => {
    render(nav('/home'))
    await flushViewportMeasurement()
    const tab = within(tabBarOf()).getByRole('link', { name: 'Home' })
    expect(tab).toHaveAttribute('aria-current', 'page')
  })

  it('still announces an open panel as expanded, not current', async () => {
    render(nav('/home'))
    await flushViewportMeasurement()
    await userEvent.click(
      within(tabBarOf()).getByRole('button', { name: 'Account' })
    )
    expect(await screen.findByRole('dialog')).toBeInTheDocument()
  })
})
```

Add a fourth covering the overflow row: a folded panel item under a route
beneath its value does not render its `List.Item` as `aria-current`.

The second and third tests should PASS at RED — they are the guarantees that
must not regress. Only the first and the overflow one must fail. Say which in
your evidence.

- [ ] **Step 2: Name the concept**

Add beside `isBranchActive`, with a docblock saying what the code cannot: that
a panel owns a menu rather than a destination, so route-prefix matching — which
exists to light up sections whose sub-pages the tree cannot enumerate — must
not reach it.

- [ ] **Step 3: Use it at all three sites**

`NavigatorPrimary`'s `branchSection` derivation (replacing Task 8's inline
guard), the tab bar's `active`, and `NavigatorOverflowItems`' `current`.

Leave `NavigatorItem`'s rail `isBranch` alone unless a test proves it wrong:
its `aria-current` keys off `isCurrent`, not `isBranch`, and a panel item never
reaches the chevron path. If you find otherwise, say so.

- [ ] **Step 4: Run and commit**

```bash
cd packages/components && pnpm vitest run src/components/Navigator
```
then `pnpm typecheck` from the repo root.

```bash
git add packages/components/src/components/Navigator
git commit -m "fix(navigator): stop a panel item announcing itself as the current page"
```

---

## Task 17: A pane inside a pane is not on the stack

Found while browser-verifying Task 12. **A regression this branch introduced**,
and it breaks the reference consumer — run it before Task 9.

### The defect

Before the registration rework, `Navigator.Content` matched panes by walking
its **direct children**, so a `Pane` rendered deeper in the tree was invisible
to it. That was the bug Tasks 13–15 fixed — but it was also, accidentally, what
kept a `Pane` rendered *inside page content* out of the orchestrator's stack.

Registration finds the nearest orchestrator through context, so now every
`Pane` in the subtree registers. `docs/src/app/components/pane/page.mdx` has a
`<Pane>` example that is **not** wrapped in its own `Navigator`, so its nearest
orchestrator is the docs site's own `DocsNavigator`. That example pane joins
the site's stack, takes a `data-stack-position`, and below `lg` picks up
`absolute! inset-0` plus a translate — landing off-screen, nondeterministically,
depending on registration order.

Observed live: a Task 12 implementer could not complete a browser check because
the example pane they were inspecting kept vanishing off-screen.

### The rule

**A pane nested inside another pane's content is not a sibling in that
orchestrator's stack.** It is content *within* a pane, and the stack is the
panes an orchestrator arranges.

`PaneRoot` already provides `PaneContext` to its own children, so a nested pane
can see it is inside one. The missing half is that entering an orchestrator
should put you back at stack level: `Navigator.Content` resets `PaneContext` to
`null` for its subtree.

That gives exactly the right behaviour in all three shapes:

| shape | `PaneContext` at the inner pane | registers? |
| --- | --- | --- |
| pane declared in `Navigator.Content` | `null` (reset by Content) | yes — correct |
| bare pane inside another pane's content | non-null | no — correct |
| pane in its *own* `Navigator.Content`, itself inside a pane | `null` (reset by the inner Content) | yes, with the inner orchestrator — correct |

The third row is why the reset belongs on `Navigator.Content` rather than
`PaneRoot` simply refusing to register whenever any ancestor pane exists — the
docs page has exactly that shape in its second example, and it must keep
working.

**Files:**
- Modify: `packages/components/src/components/Navigator/NavigatorContent.tsx`
- Modify: `packages/components/src/components/Pane/PaneRoot.tsx`
- Modify: `packages/components/src/components/Pane/PaneHeader.tsx` (stale docblock, see below)
- Test: `packages/components/src/components/Pane/Pane.test.tsx`

- [ ] **Step 1: Write the failing tests**

```tsx
describe('a pane inside a pane', () => {
  const positions = () =>
    Array.from(document.querySelectorAll('[data-slot="pane"]')).map((p) =>
      p.getAttribute('data-stack-position')
    )

  it('does not join the surrounding orchestrator stack', async () => {
    render(
      <Navigator value='/a'>
        <Navigator.Content>
          <Pane role='detail' current>
            Outer
            <Pane role='list'>Example inside content</Pane>
          </Pane>
        </Navigator.Content>
      </Navigator>
    )
    await flushViewportMeasurement()
    // The outer pane is the whole stack; the inner one is content.
    expect(positions()).toEqual(['top', null])
  })

  it('still registers with its own orchestrator', async () => {
    render(
      <Navigator value='/a'>
        <Navigator.Content>
          <Pane role='detail' current>
            Outer
            <Navigator value='/x'>
              <Navigator.Content>
                <Pane role='list'>Inner list</Pane>
                <Pane role='detail' current>
                  Inner detail
                </Pane>
              </Navigator.Content>
            </Navigator>
          </Pane>
        </Navigator.Content>
      </Navigator>
    )
    await flushViewportMeasurement()
    expect(positions()).toEqual(['top', 'behind', 'top'])
  })

  it('leaves the zero-pane warning alone', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    render(
      <Navigator value='/a'>
        <Navigator.Content>
          <Pane role='detail' current>
            Outer
            <Pane role='list'>Inner</Pane>
          </Pane>
        </Navigator.Content>
      </Navigator>
    )
    await flushViewportMeasurement()
    expect(
      warn.mock.calls.some((c) => String(c[0]).includes('identified no panes'))
    ).toBe(false)
    warn.mockRestore()
  })
})
```

The first should fail with `['top', 'behind']` or similar; the second and third
should pass at RED. Say which in your evidence.

- [ ] **Step 2: Skip registration when already inside a pane**

In `PaneRoot`, read `PaneContext` and skip registering when it is non-null. A
pane that does not register has no position and no chrome — it renders as a
plain surface, which is exactly right for one used as content.

Keep the standalone case working: no orchestrator **and** no surrounding pane
is still a plain unpositioned pane.

- [ ] **Step 3: Reset the context when entering an orchestrator**

In `NavigatorContent`, wrap the children in `<PaneContext value={null}>`
alongside the existing `PaneStackContext` provider, with a comment saying why:
entering an orchestrator means you are at stack level again, so a pane declared
here registers even when the whole Navigator is nested inside someone else's
pane.

- [ ] **Step 4: Fix the stale docblock**

`PaneHeader.tsx`'s docblock still says the back affordance and `Pane.Actions`
"claim the same grid cell". That stopped being true when the header's top row
became three explicit columns. Correct it — a comment that misdescribes the
structure is worse than none, and this repo's own rule is that comments explain
what the code cannot rather than restating or contradicting it.

- [ ] **Step 5: Run and verify**

```bash
cd packages/components && pnpm vitest run src/components/Pane src/components/Navigator
```
then `pnpm typecheck` from the repo root.

Then check the docs at `http://localhost:9614/components/pane` below `lg`: the
bare `<Pane>` example renders in place, in the flow of the page, and does not
land off-screen. Do not run a docs build.

- [ ] **Step 6: Commit**

```bash
git add packages/components/src/components/Pane packages/components/src/components/Navigator
git commit -m "fix(pane): keep a pane rendered inside another pane off the stack"
```

---

## Task 18: Two silent failures the consumer migration exposed

Found while migrating `~/Code/prototype` onto `Navigator.Panel`, and confirmed
independently against source by a second reviewer. **Runs before Task 10**, so
the docs describe corrected behaviour.

Both are silent failures — the exact class this branch has been eliminating
everywhere else, and the reason the migration cost as much time as it did.

### Gap 1 — a stray child inside `Navigator.End` warns about nothing

`Navigator.Primary`'s walk sets `foundStray` for an unrecognised **direct**
child, which produces a helpful dev warning naming the compound-patterns rule.
But its `Navigator.End` branch iterates `endProps.children` and silently skips
anything that is not a `Navigator.Item` — no `foundStray`, no warning.

So `<Navigator.End><PersonaSwitcher /></Navigator.End>` produced **no console
output at all**, while the account menu vanished below `md`. The consumer had
to read library source to find out why. The task brief for the migration even
assumed a warning fired here; it does not.

This is worse than the outer case in one respect: a component that merely
*returns* a `Navigator.Item` is invisible for the same reference-equality
reason, so the natural refactor — extract the item into a shared component —
fails exactly as silently as the original mistake.

### Gap 2 — `List.Group` renders its title through an unkeyed array

`ListGroup` collects its title with `title.push(cloneElement(child, { id: titleId }))`
and renders `{title}` — an array, so React demands keys and logs a warning in
every consumer's console. It was noticed during the first task of this plan and
recorded as pre-existing; the migration confirmed it firing in a real app.

`NavigatorGroup` took the same shape from `ListGroup`, so check both.

**Files:**
- Modify: `packages/components/src/components/Navigator/NavigatorPrimary.tsx`
- Modify: `packages/components/src/components/List/ListGroup.tsx`
- Modify: `packages/components/src/components/Navigator/NavigatorGroup.tsx`
- Test: `packages/components/src/components/Navigator/Navigator.test.tsx`,
  `packages/components/src/components/List/List.test.tsx`

- [ ] **Step 1: Write the failing tests**

```tsx
it('warns about a stray child inside Navigator.End', async () => {
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
  const NotAnItem = () => <div>Account</div>
  render(
    <Navigator value='/a'>
      <Navigator.Primary aria-label='Main'>
        <Navigator.Item value='/a' href='/a'>
          A
        </Navigator.Item>
        <Navigator.End>
          <NotAnItem />
        </Navigator.End>
      </Navigator.Primary>
    </Navigator>
  )
  await flushViewportMeasurement()
  expect(warn).toHaveBeenCalled()
  expect(String(warn.mock.calls[0]?.[0])).toContain('Navigator.End')
  warn.mockRestore()
})

it('does not warn about a well-formed End', async () => {
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
  render(
    <Navigator value='/a'>
      <Navigator.Primary aria-label='Main'>
        <Navigator.Item value='/a' href='/a'>
          A
        </Navigator.Item>
        <Navigator.End>
          <Navigator.Item value='/account' href='/account'>
            Account
          </Navigator.Item>
        </Navigator.End>
      </Navigator.Primary>
    </Navigator>
  )
  await flushViewportMeasurement()
  expect(warn).not.toHaveBeenCalled()
  warn.mockRestore()
})
```

And, for the key warning, in both `List.test.tsx` and `Navigator.test.tsx`: a
group with a title renders without any `console.error`. React logs key warnings
through `console.error`, so spy on that, not `console.warn`.

- [ ] **Step 2: Warn for a stray End child**

Set the same `foundStray` flag from the `Navigator.End` branch, and widen the
existing warning's copy so it names `Navigator.End` as well as `Navigator.Primary`.

The message must be actionable, because the whole point is that the current
silence is not. It should say that a component wrapping a `Navigator.Item` is
invisible too — that is the non-obvious half, and the one that sends people
back to the source. Keep it to the existing warning's register: what was
skipped, why, and what to do.

Fire it from an effect, gated on `isDev()`, as the existing one already is.

- [ ] **Step 3: Key the title**

Give the cloned title a key in `ListGroup`, and the same in `NavigatorGroup` if
it shares the shape. A single-element array does not need to be an array at
all — if collapsing it to a lone node reads better than adding a key, do that
instead and say why.

- [ ] **Step 4: Run and commit**

```bash
cd packages/components && pnpm vitest run src/components/List src/components/Navigator
```
then `pnpm typecheck` from the repo root. The suite's own output must be
pristine — a key warning in the test log is the defect, so a clean run is part
of the evidence.

```bash
git add packages/components/src
git commit -m "fix(navigator,list): warn for a stray End child, and key the group title"
```

---

## Task 19: Contributing docs, and one wrong example

Two files agents read before anything else describe a library that predates
this branch, plus one docs example that contradicts a convention the same page
teaches.

### The gaps

**`AGENTS.md`'s component tree** lists up to `Carousel/` and
`SpotIllustration/` and contains **zero** mentions of `Navigator`, `Pane`,
`Drawer`, `List` or `Popover`. Every agent loads this file first.

**`COMPOUND_PATTERNS.md` §1.2** documents the direct-children identity walk and
names one exception — `Navigator.Secondary` descending into `Navigator.Group`.
It does not know two things this branch established:

- `Navigator.Primary`'s walks gained the same single-level `Group` descent.
- **Registration replaced an identity walk**, because an orchestrator cannot
  see through a wrapper it did not render. A consumer's panes arrived through
  Next.js parallel-route slots, were never recognised, and the entire stack
  went silently inert. That is the branch's most important architectural
  lesson, and it is absent from the document every runtime warning cites by
  name.

**The wrong example:** `docs/src/app/components/pane/page.mdx:114` uses
`<IconButton>` with no `size`, which defaults to `md`, while `:287` uses
`<Button size='sm'>` and the Guideline at `:372` documents `size='sm'`. The
first example contradicts the convention the same page teaches.

**Files:**
- Modify: `AGENTS.md`
- Modify: `docs/contributing/COMPOUND_PATTERNS.md`
- Modify: `docs/src/app/components/pane/page.mdx`

- [ ] **Step 1: Bring `AGENTS.md`'s component list current**

Add every component now in `packages/components/src/components/` that the tree
omits, each with the one-line description the existing entries use. Read the
directory rather than trusting this list.

Check the rest of the file for the same staleness — the "Component Patterns"
section, the linking table, and the form-component rules were written before
`Navigator`, `Pane`, `Drawer` and `List` existed. Fix what is factually wrong;
do not rewrite what is merely terse.

- [ ] **Step 2: Add registration to `COMPOUND_PATTERNS.md`**

A new subsection under §1, alongside the two existing wiring idioms. It needs
to answer, for someone choosing between them:

- **What it is.** The child announces itself to the nearest orchestrator
  through context and receives its position back, rather than the parent
  finding it by element identity.
- **When to reach for it.** When children can arrive through something the
  parent did not render — a router, a parallel-route slot, a layout wrapper.
  An identity walk cannot see through any of those, and fails **silently**.
- **What it costs.** Registration is an effect, so the parent does not know
  its children on the first render. `Navigator.Content` handles that; anything
  copying the pattern must.
- **The seam.** `Pane` defines `PaneStackContext` and fills nothing;
  `Navigator.Content` provides it. That one-way direction is what keeps `Pane`
  usable standalone and avoids a module cycle.

Point at the real implementation — `PaneStackContext.ts`, `PaneRoot.tsx`'s
registration effect, `NavigatorContent.tsx`'s provider — rather than restating
it inline. Add a row to §1.3's decision matrix: *children may arrive through a
router or slot you do not control* → registration.

Also correct §1.2's exception paragraph: the descent applies to
`Navigator.Primary`'s walks as well as `Navigator.Secondary`'s.

- [ ] **Step 3: Fix the example**

`size='sm'` on the `IconButton` at `pane/page.mdx:114`. Then check the other
docs pages for header actions that miss the convention, and say what you found.

- [ ] **Step 4: Verify and commit**

`pnpm --filter docs typecheck`, and check the page renders at
`http://localhost:9614/components/pane`. Never run `prettier --write` on
`.mdx`; never run a docs build.

```bash
git add AGENTS.md docs/contributing/COMPOUND_PATTERNS.md docs/src/app/components/pane/page.mdx
git commit -m "docs: bring the contributing docs up to the registration seam"
```

---

## Task 20: Page titles in the pane header

The docs site renders 45 inline `# Title` headings in page content while its
own detail `Pane.Header` shows only a back button. Moving the title into the
header makes the docs demonstrate the collapse-on-scroll behaviour they
document, and deletes 45 duplicated headings.

### The API gap this exposes

`Pane.Title` is typed `ComponentProps<'h2'>` with **no `render` escape**, while
`List.GroupTitle` and `Navigator.GroupTitle` both have one. It is the odd one
out, and without it the docs cannot keep an `<h1>`.

**Decision:** `Pane.Title` gains `render`, matching its siblings exactly. The
docs render it as `<h1>`, so each page keeps exactly one — now the collapsing
title.

**Files:**
- Modify: `packages/components/src/components/Pane/PaneTitle.tsx`
- Modify: `docs/src/components/Navigation.tsx`
- Modify: `docs/src/components/OnThisPage.tsx` (heading seeding)
- Modify: 45 `.mdx` pages under `docs/src/app/`
- Test: `packages/components/src/components/Pane/Pane.test.tsx`

- [ ] **Step 1: Give `Pane.Title` a `render` prop**

Copy the shape from `ListGroupTitle` / `NavigatorGroupTitle` verbatim — same
prop type, same resolution, same docblock register:

```tsx
export type PaneTitleProps = ComponentProps<'h2'> & {
  render?: (props: ComponentProps<'h2'>) => ReactElement
}
```

The compact echo `Pane.Title` also renders must keep working: it is a
`<button>` and is not affected by `render`, which replaces only the heading.
**Write a test proving the echo still appears when `render` is passed** — that
is the interaction most likely to break.

- [ ] **Step 2: Render the title in the docs header**

**The title's source of truth is the page's own `metadata`**, not a nav label
that happens to match. Each `.mdx` already exports
`metadata = { title, description, status, category }`, and
`docs/src/lib/component-manifest.ts` already parses that block off every page.
Read from there.

That matters beyond tidiness: a nav label can be shortened or reworded for the
rail, and the page heading should not silently inherit that. One declaration,
one heading.

Add it to the detail pane's existing `Pane.Header`:

```tsx
<Pane.Title render={(p) => <h1 {...p} />}>{pageTitle}</Pane.Title>
```

`Navigation.tsx` is a client component, so it cannot read a page's `metadata`
export directly — that is a server-side Next.js concern. Route the title
through whatever the manifest already feeds the layout, and if the manifest
covers only `/components/*`, extend it rather than inventing a second source.
Say what you found and what you extended.

**Any page without `metadata.title` is the finding, not an edge case.** A page
that renders no heading because it declares no title is a page that should
declare one. Enumerate them and add the metadata rather than special-casing
the header. Exceptions — `/debug/*`, the appearance pane — should be
deliberate and named in your report.

- [ ] **Step 3: Rework the TOC's heading seeding**

`OnThisPage` seeds ids from the page's `h1` inside `#docs-content` so that
`rehype-slug`'s id for the title is not reassigned to a later same-text `h3`.
The `h1` is leaving that container, so that seeding has to change.

Read the existing comment before touching it — it documents a real collision
it was written to prevent. Preserve the behaviour, not the mechanism, and keep
the comment accurate to whatever you land on.

- [ ] **Step 4: Strip the inline titles**

Remove the `# Title` line from each `.mdx`. **Leave the lead paragraph** — it
is the page's description and belongs in the body, not the header.

`.mdx` files are edited by hand: `prettier --write` empties them, and that has
already happened once on this branch. Work through them deliberately and
report the count.

- [ ] **Step 5: Verify**

At `http://localhost:9614`, across several pages and at 390 / 1200px:

- exactly one `<h1>` per page, in the header
- it collapses on scroll into the compact title, which scrolls back to top on
  tap
- the on-this-page rail still lists the right headings and highlights correctly
- a page with no nav entry renders no stray heading

Then `pnpm --filter docs typecheck` and the components suite. Act-warning
budgets: `Pane.test.tsx` ≤ 2, whole suite ≤ 5 — **the suite is exactly at 5**,
so a new test that adds a warning breaches it.

- [ ] **Step 6: Commit**

```bash
git add packages/components/src/components/Pane docs/src
git commit -m "feat(pane): give Pane.Title a render prop, and move the docs titles into the header"
```

---

## Task 21: Header actions are default size

A correction to Task 19, which resolved a size inconsistency in the wrong
direction.

`Pane.Header`'s action examples disagreed: one used `<IconButton>` at its
default `md`, another `<Button size='sm'>`, and the Guideline documented
`size='sm'`. Task 19 made the IconButton `sm` to match. **The convention is the
opposite** — header actions use each control's **default** size.

That is the right call: the header's top row is chrome a user acts on, not a
dense toolbar, and a `sm` control in a row sized around a back affordance and a
title reads as an afterthought. It also means consumers write
`<Button>Publish</Button>` and get the right thing without knowing a rule.

**Files:**
- Modify: `docs/src/app/components/pane/page.mdx`
- Check: every other place a control sits in `Pane.Header`

- [ ] **Step 1: Undo Task 19's fix and invert it**

Remove the `size='sm'` Task 19 added to the `IconButton`, and remove
`size='sm'` from the `Button` in the header example. Both become default.

- [ ] **Step 2: Fix the Guideline**

The `Guideline.Do` block documents `<Button size='sm'>Publish</Button>`. Drop
the `size` so the guideline teaches the convention it is meant to.

- [ ] **Step 3: Sweep**

Find every control rendered inside a `Pane.Header` — across the docs, the docs
site's own layout (`docs/src/components/Navigation.tsx` has one in
`Pane.Actions`), and any example in `packages/components`. Bring each to
default size. Report the full list, including any you left and why.

- [ ] **Step 4: Say it once, where it belongs**

Add a sentence to the `Pane.Header` documentation stating that actions use
their default size. A convention that only exists in examples is one the next
person breaks.

- [ ] **Step 5: Verify**

At `http://localhost:9614/components/pane`, both header examples at 390 and
1200px: the actions match each other, and sit correctly against the back
affordance and the title without crowding the collapsed compact title. Never
run `prettier --write` on `.mdx`; never run a docs build.

```bash
git add docs/src packages/components/src
git commit -m "docs(pane): header actions use their default size"
```

---

## Task 22: The mobile section nav is a real `Tabs`

Below `md`, the active section's `Navigator.Secondary` renders as a horizontal
strip inside the top pane's `Pane.Header`. It is currently a bespoke assembly
that *imitates* `Tabs` — and says so:

- `navigatorSecondaryStripViewportVariants` composes `tabsListVariants({ emphasis: 'subtle' })`
- `NavigatorItem`, in `'strip'` presentation, composes `tabsTabVariants({ emphasis: 'subtle', size: 'sm' })`
- `navigatorIndicatorVariants`' `strip` surface carries a comment saying it
  "visually echoes `tabsIndicatorVariants({ emphasis: 'subtle' })` … but can't
  import it: this indicator's positioning and var mapping are Navigator's own,
  so the two are kept in sync **by eye, not by import**"

Three copies of one design, one of them explicitly maintained by eye. That is
drift waiting to happen, and it already forced a workaround: a CVA output
string cannot be pushed through a `[&_…]:` selector, which is why
`NavigatorItem` reaches for `NavigatorPresentationContext` to pick its own
classes.

**Use the real component.** `Tabs.Tab` already accepts `href` and routes
through `RoadieLinkProvider` — it is in the repo's own list of link-bearing
components — and `Tabs.Indicator` already animates. Wrap the list in
`ScrollArea` following Base UI's documented ScrollArea-with-Tabs pattern.

### What has to survive

- **These are routed links, not tab panels.** The strip is a `<nav>` of
  destinations; there is no `Tabs.Panel` and the router owns selection. Roadie's
  `Tabs` supports `href` tabs precisely for this, but check what Base UI emits
  for roles — a `role="tablist"` of links with no panels is a worse a11y story
  than the current `<nav>` + `aria-current`. **If the semantics come out wrong,
  stop and report it rather than shipping tabs that lie about what they are.**
  That judgement is the substance of this task.
- Horizontal scrolling with the section's active item reachable.

### The strip's placement — a requirement, and a latent bug

**Edge to edge, hugging the bottom of the header.** The strip is the header's
bottom edge, not a row floating inside its padding — it should scroll the full
width of the pane and sit flush against the header's lower boundary with no gap
beneath it.

Two things stand between the current code and that:

- **The horizontal bleed is hardcoded against a variable.**
  `navigatorSecondaryStripVariants` is `-mx-4`, and `paneHeaderVariants` pads
  with `px-(--content-inset)`. That cancels today only because
  `--content-inset` happens to be `--spacing(4)` (`paneVariants`). It is a
  custom property precisely so it can change — and when it does, the bleed
  breaks silently and the scrollbar stops meeting the pane's edges. Bleed by
  `-mx-(--content-inset)` so the two cannot disagree. Check `Pane.Search`,
  which sits in the same header, for the same coupling.
- **The header pads its bottom.** `paneHeaderVariants` carries `pt-4 pb-2`, so
  a strip at the end of the header sits 0.5rem above its edge. Cancel that for
  the strip specifically, or make the header drop its bottom padding when a
  strip is present — whichever leaves fewer rules. Say which you chose and why.

Do not solve either by hardcoding a matching number somewhere else. The whole
point is that the two values stop being independently maintained.
- The sliding indicator's behaviour, including no slide-in from (0,0) on first
  paint — `data-[ready=false]` covers that today.
- `motion-reduce` handling.
- **Act-warning budgets.** `Navigator.test.tsx` ≤ 2, whole suite ≤ 5, and the
  suite is **exactly at 5**. `TabsList` already contributes 3 of those 5, so
  introducing another `Tabs` instance may push it over. If it does, that is a
  finding to report — do not raise the budget.

### What should fall out

- `navigatorSecondaryStripViewportVariants` and the `strip` surface of
  `navigatorIndicatorVariants` should be deletable.
- `NavigatorItem`'s `'strip'` branch, and possibly
  `NavigatorPresentationContext` itself if nothing else reads it.
- `useSlidingIndicator`'s strip usage, if `Tabs.Indicator` replaces it.

If any of those turns out to be load-bearing for the rail as well, say so —
the rail and the tab bar use the same indicator hook, so this is not obviously
a clean excision.

**Files:**
- Modify: `packages/components/src/components/Navigator/NavigatorPaneChrome.tsx`
- Modify: `packages/components/src/components/Navigator/NavigatorItem.tsx`
- Modify: `packages/components/src/components/Navigator/variants.ts`
- Test: `packages/components/src/components/Navigator/Navigator.test.tsx`

- [ ] **Step 1: Read Base UI's ScrollArea-with-Tabs guidance**

It is the pattern this task is named after. Follow it rather than improvising a
wrapper.

- [ ] **Step 2: Settle the semantics before writing anything**

Render both shapes and compare what reaches the accessibility tree. Report
which you chose and why. This is the step that decides whether the rest of the
task is worth doing.

- [ ] **Step 3: Rebuild the strip on `Tabs` + `ScrollArea`**

- [ ] **Step 4: Delete what the change makes dead**

Then grep for each removed identifier to prove nothing still references it.

- [ ] **Step 5: Verify**

At 390px on a section with sub-pages — `/foundations` is one — the strip
scrolls, the active item is reachable and marked, the indicator animates and
does not slide in from the corner on load, and `prefers-reduced-motion`
suppresses it. Confirm exactly one section-nav landmark exists in the DOM.

Run the components suite and report the act-warning count explicitly.

```bash
git add packages/components/src/components/Navigator
git commit -m "refactor(navigator): build the mobile section nav on Tabs and ScrollArea"
```

---

## Task 23: `Pane.Title` is a page title, not a surface title

Moving the docs page titles into `Pane.Header` (Task 20) revealed the default is
too small for what it now is. The markdown `# Title` rendered at
`text-display-prose-1` (`docs/mdx-components.tsx:14`); through `Pane.Title` it
renders at `text-display-ui-4`, several steps down.

**Ruled: `text-display-ui-3`.**

### The decision inside it

`Pane.Title` does not own its size. It composes `surfaceTitleClass`
(`packages/components/src/variants.ts:17` — `text-display-ui-4 text-strong`),
shared with `Dialog.Title` and `Drawer.Title`. Bumping that constant would
enlarge all three.

That would be wrong. A dialog and a drawer are compact overlay surfaces where
`ui-4` is correctly sized; a pane title is the heading of a full column or
page. So **`Pane.Title` decouples from `surfaceTitleClass` and takes its own
token.** `Dialog.Title` and `Drawer.Title` keep the shared class unchanged.

This is a divergence, not an oversight, so it needs a comment saying why —
otherwise the next person "fixes" the inconsistency by re-composing it.

**Files:**
- Modify: `packages/components/src/components/Pane/variants.ts`
- Test: `packages/components/src/components/Pane/Pane.test.tsx`
- Modify: `docs/src/app/components/pane/page.mdx` if it states the size

- [ ] **Step 1: Write the failing test**

Assert `Pane.Title` carries `text-display-ui-3`, and — separately — that
`Dialog.Title` and `Drawer.Title` still carry `text-display-ui-4`. The second
is the one that matters: it pins the decoupling, so a later re-composition
fails loudly instead of quietly resizing two other components.

Both must fail against the current code for the right reason. If a
`Dialog`/`Drawer` title test already exists, extend it rather than duplicating.

- [ ] **Step 2: Give `Pane.Title` its own size**

In `paneTitleVariants`, replace `surfaceTitleClass` with the explicit classes,
and comment the divergence: a pane title heads a column or a page, where a
dialog's and a drawer's head compact overlay surfaces, so it does not share
their scale.

Leave everything else in that variant alone — `origin-left`, the
`scale`/`opacity`/`display` transition, `transition-discrete`, and the
`collapsed` variant are all load-bearing for the collapse-on-scroll behaviour.

- [ ] **Step 3: Check what a bigger title does to the collapse**

The large title scales and fades out while a compact `text-sm` echo fades in.
A larger starting size makes that transition more pronounced — which is the
intent, but verify rather than assume:

- the collapse still reads as a cross-fade, not a jump
- `--pane-header-height` still resolves correctly; it is measured by
  `ResizeObserver`, so a taller header should just work, but confirm sticky
  content below it is not offset wrong
- the compact echo still truncates correctly against the actions in its column
- a long title still wraps or truncates sensibly at 390px

- [ ] **Step 4: Verify in the browser**

`http://localhost:9614` at 390 and 1200px, on a docs page and on the `Pane`
docs' own examples. The docs' page title is an `<h1>` via `render` — confirm it
reads as a page heading now, and that the examples' titles have not become
overbearing in a small embedded pane.

If `pane/page.mdx` states the title's size anywhere, update it.

Never run `prettier --write` on `.mdx`; never run a docs build — a dev server
runs at `http://localhost:9614`.

- [ ] **Step 5: Run and commit**

```bash
cd packages/components && pnpm vitest run src/components/Pane src/components/Dialog src/components/Drawer
```
then `pnpm typecheck` from the repo root. Act-warning budgets: `Pane.test.tsx`
≤ 2, whole suite ≤ 5, and **the suite is exactly at 5** — no headroom.

```bash
git add packages/components/src docs/src
git commit -m "feat(pane): size Pane.Title as a page heading, not a surface title"
```

---

## Task 24: `Navigator.Panel` is a full-screen `Pane` below `md`

**This reverses a decision made during planning.** Decision 1 of this plan ruled
that a panel's small-screen form should be a `Drawer` rather than the
full-screen `Pane` the design document specified. Having seen it in a real
consumer, the user has ruled for the original design.

### Why the original reasoning no longer holds

The Drawer decision rested on two arguments. One has been dismantled by work
done since; the other was always a judgement call, and the user has made it.

- **"A pane declared in the rail cannot join the stack without portalling."**
  That was true when the stack was `Navigator.Content`'s declared children. It
  is no longer the obstacle it was — but note that a React **portal still would
  not work**, because a portal preserves the React tree's context from where it
  is *declared*, not where it lands. A panel pane portalled out of the rail
  would still see no `PaneStackContext`.

  The real answer is the pattern that already exists: **`Navigator.Content`
  renders the pane itself**, reading state from `NavigatorContext`, exactly as
  it already renders the generated overflow fallback. No portal, no hoisted
  context, no new mechanism.

- **"A menu is transient; a pane is somewhere you are."** Still true, and it is
  the real cost: the panel joins the back-stack, so Back exits the menu rather
  than leaving the page. The user has weighed that and prefers the consistency
  — the overflow and the panel are both mobile disclosures, and they should not
  be two different shapes.

### The shape

`Navigator.Primary` already publishes `openPanel` to `NavigatorContext`, and
`overflowItems` already carries `NavigatorSlotMeta`s whose `panel` field holds
the declared element. So the open panel's content is already reachable from
`Navigator.Content` — but only for *folded* items. **Every panel item's meta
must be reachable, not just folded ones.**

**Files:**
- Create: `packages/components/src/components/Navigator/NavigatorPanelPane.tsx`
- Delete: `packages/components/src/components/Navigator/NavigatorPanelDrawer.tsx`
- Modify: `NavigatorContext.ts`, `NavigatorPrimary.tsx`, `NavigatorContent.tsx`,
  `NavigatorPanel.tsx` (docblock), `variants.ts`
- Modify: `docs/src/app/components/navigator/page.mdx`
- Test: `Navigator.test.tsx`

- [ ] **Step 1: Write the failing tests**

Below `md`, tapping a panel item's tab:

- mounts a `[data-slot=pane]` carrying `data-stack-position='top'`
- that pane is `md:hidden`
- it carries `data-primary-nav='visible'` — the tab bar stays, as it does for
  the overflow
- the panel's content renders inside it
- **no `role=dialog` is mounted** — this is the test that proves the drawer is
  gone rather than merely unused
- dismissing returns the previous pane to `top`
- a panel item that folded into the overflow opens the same pane from its
  overflow row

Plus: at `md`+ the rail popover still opens and no pane mounts.

- [ ] **Step 2: Make every panel meta reachable**

`overflowItems` holds only folded items. Publish the panel metas separately —
a `panelItems` on the context, or a lookup keyed by value. Whichever you
choose, it must cover a panel item that is a **tab**, one that **folded**, and
one in `Navigator.End`.

Keep the write in an effect with a stable dependency key, as `overflowItems`
does. This branch has lost time to two infinite render loops caused by
publishing a fresh array every render.

- [ ] **Step 3: Create `NavigatorPanelPane`**

A `PaneRoot` with `role='detail'`, `current` driven by whether this panel is
the open one, `primaryNav='visible'`, and `md:hidden` — the same variant shape
`NavigatorOverflow` uses. Give it a `Pane.Header` with the panel's
`aria-label` as `Pane.Title` and a dismiss affordance wired to
`setOpenPanel(null)`, then the panel's children.

The design says the panel "inherits `Pane.Header`'s Back/Close affordance" —
use `onBack`, since there is no href to go back to.

- [ ] **Step 4: Render it from `Navigator.Content`**

Alongside the generated overflow fallback, inside the `PaneStackContext`
provider so it registers. Only the open panel needs a pane — do not mount one
per declared panel.

- [ ] **Step 5: Delete the drawer**

Remove `NavigatorPanelDrawer.tsx` and its mounting in `NavigatorPrimary`. Grep
for every reference — including tests asserting `role=dialog` for a panel,
which should now assert the pane instead. If `Drawer` becomes an unused import
anywhere, remove it.

**Note what this costs**, in your report: swipe-to-dismiss, the scrim and the
drawer's focus trap go with it. The pane's dismissal is the header affordance
and Escape. Say whether Escape still works and whether focus is handled
sensibly on open and close — a full-screen pane with no focus management is a
real regression against what the drawer gave for free.

- [ ] **Step 6: Update the docs and this plan's decision**

`navigator/page.mdx`'s Panel section states the drawer behaviour — correct it.
`NavigatorPanel.tsx`'s docblock says "a `Drawer` below it" and explains the
reasoning at length; rewrite it to describe what it now does and why.

Also correct **Decision 1 at the top of this plan** — leaving a documented
decision that the code contradicts is how the docs went stale the first time.

- [ ] **Step 7: Verify**

The prototype needs no source change — it already declares `Navigator.Panel`.
Rebuild components and check `~/Code/prototype` at 390px: tapping the account
tab pushes a full-screen pane with the tab bar still visible, dismissal
returns to the page, and the rail popover is unchanged at 1200px.

Act-warning budgets: `Navigator.test.tsx` ≤ 2, whole suite ≤ 5 — **the suite is
exactly at 5**, though removing the drawer may free some.

```bash
cd packages/components && pnpm vitest run src/components/Navigator src/components/Pane
```
then `pnpm typecheck` from the repo root.

```bash
git add packages/components/src docs/src docs/plans
git commit -m "feat(navigator): make a Panel a full-screen Pane below md"
```

---

## Task 25: A closable column

From `lg` up, panes are columns rather than a stack, and there is no way to
dismiss one. The back affordance is `lg:hidden` — it exists only in the band
where panes cover each other. So a consumer who drills list → detail → detail
ends up with three columns and no way back to two.

**Add a Close affordance in the top-left of every pane that is not the root**,
from `lg` up.

### The shape

Back and Close are the same slot at different sizes. `paneHeaderBackVariants`
is already `col-start-1 row-start-1 justify-self-start lg:hidden`; Close takes
the same cell with `max-lg:hidden`. They swap at the breakpoint, and neither
can ever collide with the other or with the compact title's centre column.

That also means the header's three-column grid needs no change.

### Two constraints that decide the API

**Roadie cannot close a pane it does not own.** Whether a column disappears is
the consumer's routing or state — the same reason `Navigator` never navigates.
So the affordance appears only when the consumer supplies a handler:
`Pane.Header` gains `onClose`.

**The root pane must never get one.** A consumer passing `onClose` to every
pane uniformly — the likely shape, since it is one prop threaded through a map
— must not put a Close on the first column. So the pane has to know whether it
is the root, and the component decides, not the call site.

Registration already derives each pane's position. What it does not expose is
"am I the base of the stack". Add that — `derivePositions` already computes the
ordered, inspector-filtered list that the answer falls out of. Put it on
`PaneContext` so `Pane.Header` can read it the way it already reads `role`.

**An `inspector` never gets one.** It is not in the stack, it yields rather
than stacks, and it already has its own reveal affordance. Consistent with
every other rule about inspectors.

**Files:**
- Modify: `packages/components/src/components/Pane/PaneHeader.tsx`
- Modify: `packages/components/src/components/Pane/PaneContext.ts`
- Modify: `packages/components/src/components/Pane/PaneRoot.tsx`
- Modify: `packages/components/src/components/Pane/variants.ts`
- Modify: `packages/components/src/components/Navigator/paneStack.ts`
- Test: `packages/components/src/components/Pane/Pane.test.tsx`
- Modify: `docs/src/app/components/pane/page.mdx`

- [ ] **Step 1: Write the failing tests**

- a non-root pane with `onClose` renders a Close control; clicking it calls the
  handler
- the **root** pane with `onClose` renders none — this is the one that matters,
  and it must fail against a naive implementation that only checks the prop
- an `inspector` with `onClose` renders none
- a pane with no `onClose` renders none
- Close and Back can coexist on one pane without colliding: assert they share
  `col-start-1 row-start-1` and are gated `max-lg:hidden` / `lg:hidden`
  respectively, so only one is visible per band
- a standalone `Pane` with no orchestrator renders none — with no stack, there
  is no root to be non-root of

- [ ] **Step 2: Expose root-ness**

Derive it where positions are derived, so there is one definition rather than a
second walk. Thread it to `PaneContext` alongside `role` and `collapsed`.

Watch the standalone case: a `Pane` with no orchestrator has no position and no
root-ness. Default to treating it as root, so the affordance stays off — an
unregistered pane showing a Close it cannot honour is worse than none.

- [ ] **Step 3: Render it**

An `IconButton` with `XIcon` from `@phosphor-icons/react`, `aria-label='Close'`,
at the header's **default action size** — this branch established that header
controls use their default size, so do not reach for `sm`.

Reuse `paneHeaderBackVariants`' cell with its own gate rather than adding a
third grid participant.

Note `PaneHeader`'s existing `visible` calculation: it decides whether the
header draws at all, and a header whose only content is a Close must still
render. Check that logic rather than assuming it already covers it.

- [ ] **Step 4: Document it**

`pane/page.mdx` — what it is, when it appears, and that it needs `onClose`
because Roadie does not own the arrangement. Put it near the back affordance's
documentation; they are two halves of one idea.

- [ ] **Step 5: Verify**

At 1600px on a three-column arrangement — the docs' own layout is one, or build
a scratch page under `docs/src/app/debug/`: the first column has no Close, the
others do, clicking one calls the handler. At 390px no Close appears anywhere
and the back affordance behaves as before. Confirm the Close does not crowd the
compact title when the header is collapsed.

Never run `prettier --write` on `.mdx`; never run a docs build — a dev server
runs at `http://localhost:9614`.

```bash
cd packages/components && pnpm vitest run src/components/Pane src/components/Navigator
```
then `pnpm typecheck` from the repo root. Act-warning budgets: `Pane.test.tsx`
≤ 2, whole suite ≤ 5.

```bash
git add packages/components/src docs/src
git commit -m "feat(pane): give a non-root column a close affordance"
```

---

## Task 26: One current tab at a time

Reported from a live measurement at 420px on a panel declared in
`Navigator.End`. With the panel open, **two tabs claim currency**:

| Tab     | closed                  | open                                          |
| ------- | ----------------------- | --------------------------------------------- |
| Tickets | `aria-current="page"`   | `aria-current="page"` ← still                 |
| Account | `aria-expanded="false"` | `aria-current="true"`, `aria-expanded="true"`  |

Two consequences:

1. **The sliding pill does not move.** `useSlidingIndicator.ts:53` does
   `track.querySelector(ACTIVE_DESTINATION_SELECTOR)`, where the selector is
   `[data-slot="navigator-item"][aria-current]` — first match in document order
   wins, which is the route tab. The panel tab still takes the accent styling
   that keys off `aria-current`, so two tabs read as half-active.
2. `aria-current` marks one item in a set, so assistive tech announces both.

### The rule, which already exists

While a disclosure is open it **supersedes** the route: the route tab drops
`aria-current`, the disclosure is the only current tab, the indicator follows.

That is not a new rule. `NavigatorPrimary.tsx:532` already reads:

```tsx
const visualActive = tab.panel ? active : active && !overflowOpen
```

with a comment stating the route tab "yields its pill and currency" to the More
disclosure "so exactly one tab reads as active". The overflow already works this
way. Task 24 added the panel branch and did not mirror the yield.

**So this is restoring a symmetry, not inventing a rule** — and the fix should
read as one rule about disclosures, not two special cases stapled together.

**Files:**
- Modify: `packages/components/src/components/Navigator/NavigatorPrimary.tsx`
- Test: `packages/components/src/components/Navigator/Navigator.test.tsx`

- [ ] **Step 1: Write the failing tests**

At tab-bar scope, with a panel declared in `Navigator.End` and a route tab
current:

- with the panel **open**, exactly one element in the bar carries
  `aria-current` — assert the count, not just that the panel tab has it. A test
  asserting only the panel tab passes today.
- the route tab has no `aria-current` while the panel is open, and regains it on
  close
- the panel tab keeps `aria-current="true"` and `aria-expanded="true"` while open
- the same holds when the panel item is the **sole folded** tab rather than one
  of the route tabs — check that branch separately, it renders through different
  code
- the existing overflow behaviour is unchanged: with the overflow open, exactly
  one element carries `aria-current`

- [ ] **Step 2: Make the yield cover both disclosures**

Express it as one condition: a route tab is current only when no disclosure is
open. Do not add a second `&&` clause that reads as an afterthought — if the
two disclosure flags want a shared name, give them one.

Check the final-tab branch too, and `foldedIsActive`. The bug was that one
branch learned the rule and another did not; do not repeat that.

- [ ] **Step 3: Confirm the indicator follows**

The pill should move to the panel tab when it opens and back when it closes.
Assert what the suite can — that exactly one element matches
`ACTIVE_DESTINATION_SELECTOR` — and verify the movement itself in the browser
at 420px, since `useSlidingIndicator` measures real geometry that jsdom does not
provide.

- [ ] **Step 4: Consider the selector**

`ACTIVE_DESTINATION_SELECTOR` relies on document order to pick a winner when
several match. Once exactly one element is current that is no longer load
bearing — but it is still a latent trap. Either tighten it or leave it with a
comment saying what now guarantees uniqueness. Say which you chose and why;
do not silently leave it relying on an invariant nothing enforces.

- [ ] **Step 5: Run and commit**

```bash
cd packages/components && pnpm vitest run src/components/Navigator
```
then `pnpm typecheck` from the repo root. Act-warning budgets:
`Navigator.test.tsx` ≤ 2, whole suite ≤ 5 — the suite is exactly at 5.

```bash
git add packages/components/src
git commit -m "fix(navigator): let an open disclosure supersede the route tab's currency"
```

---

## Task 27: `onBack` implies a Close on a column

Task 25 gave a non-root pane a Close from `lg` up, gated on a new `onClose`
prop. In practice that reads as friction: a consumer's `onBack` almost always
already means "dismiss this drill-down", and requiring a second prop carrying
the identical handler leaves the top-left empty until someone notices.

Confirmed in a real consumer: `~/Code/prototype` passes `onBack` on its panes
and shows no Close at any width, because it never passes `onClose`.

**Ruled: a pane with `onBack` renders Back below `lg` and Close from `lg`,
calling the same handler. `onClose` still overrides**, for the case where
closing a column genuinely differs from going back to the previous pane.

### What this deliberately does not cover

**`backHref` does not imply a Close.** A link-based back navigates; an ✕ that
navigates somewhere is lying about what it does. A pane using `backHref` — the
prototype's `TicketDetailView` is one — needs an explicit `onClose`, or to move
to `onBack`. This was chosen over the alternative; do not extend it.

**The root pane still never gets a Close**, whatever it is passed. That rule is
already implemented and tested; this task must not weaken it.

**Files:**
- Modify: `packages/components/src/components/Pane/PaneHeader.tsx`
- Test: `packages/components/src/components/Pane/Pane.test.tsx`
- Modify: `docs/src/app/components/pane/page.mdx`

- [ ] **Step 1: Write the failing tests**

- a non-root pane with **only** `onBack` renders a Close; clicking it calls that
  handler
- the same pane still renders Back — both exist, gated `lg:hidden` /
  `max-lg:hidden`, so exactly one shows per band
- `onClose` **overrides** `onBack` for the Close: given both, clicking Close
  calls `onClose` and not `onBack`
- the **root** pane with `onBack` renders no Close — the rule this must not
  weaken
- a pane with only `backHref` renders **no** Close
- an `inspector` with `onBack` renders no Close

The override test and the root test are the two that a naive implementation
passes by accident; make sure each fails against one.

- [ ] **Step 2: Derive the handler**

`showClose` currently keys off `onClose !== undefined`. It becomes: a Close
shows when the pane is non-root, not an `inspector`, and **either** handler is
present — with `onClose` preferred when both are.

Express the handler choice once, next to the visibility decision, so the two
cannot disagree about which prop won. Keep `showBack` as it is: `backHref` and
`onBack` both still produce Back below `lg`.

Note `PaneHeader`'s `visible` and `edgeOnly` calculations already account for
`showClose`; re-check them once the condition widens, since more panes now
qualify.

- [ ] **Step 3: Update the docblocks and the docs**

`onBack`'s docblock should say it also supplies the Close from `lg`;
`onClose`'s should say it overrides. `pane/page.mdx` documents the affordance —
correct it there too, including that `backHref` does not imply a Close and why.

- [ ] **Step 4: Verify against the real consumer**

Rebuild (`pnpm --filter @oztix/roadie-components build`), then check
`~/Code/prototype` at 1600px: `TicketStatePane`, which passes `onBack`, should
now show a Close in its top-left; the root Tickets pane should not.
`TicketDetailView` uses `backHref` and correctly will not — confirm that rather
than treating it as a miss.

**Do not modify anything in that repository.** It has uncommitted work
belonging to the user.

```bash
cd packages/components && pnpm vitest run src/components/Pane src/components/Navigator
```
then `pnpm typecheck` from the repo root. Act-warning budgets: `Pane.test.tsx`
≤ 2, whole suite ≤ 5 — the suite is exactly at 5.

```bash
git add packages/components/src docs/src
git commit -m "feat(pane): let onBack supply the column's close affordance"
```

---

## Task 28: A stacked pane must not escape its column

Reported from a live screenshot at ~900px: the pane behind the current one
slides out over the navigator rail.

### Why it happens, and why only here

Three things compose:

- `navigatorContentVariants` is `max-lg:relative` with **no overflow clip**
  (`variants.ts:60`)
- a stacked pane is `max-lg:absolute! max-lg:inset-0` — sized to Content's box
- a **behind** pane carries `-translate-x-1/3`

A third of Content's width at 900px is roughly 220–280px, far wider than the
rail. `Navigator.Content` sits after the rail in DOM order, so the translated
pane paints over it.

**This exists only in the `md`–`lg` band (768–1023).** Below `md` there is no
rail to cover; from `lg` panes are columns and never translate. That band is
the fourth one Phase 2's design introduced, and nothing tests this about it.

### The fix

Clip stacked panes to Content's box below `lg` — Content already establishes
the positioning context, so it should own the boundary too.

Do **not** fix this by reducing the translate distance or by adding a
rail-width offset. The translate is motion; the containment is layout. A magic
number tuned to the rail's current width would silently break when the rail
changes form — and it has two forms already (`compact` and `nested`, different
widths).

**Files:**
- Modify: `packages/components/src/components/Navigator/variants.ts`
- Test: `packages/components/src/components/Navigator/Navigator.test.tsx`

- [ ] **Step 1: Write the failing test**

A class-level assertion is the honest instrument here — jsdom computes no
layout, so nothing can assert non-overlap directly. Assert that
`navigatorContentVariants` clips below `lg`, and say plainly in the test's
comment that it pins the rule rather than proving the geometry.

Then verify the geometry in a browser, which is the only thing that can.

- [ ] **Step 2: Clip below `lg`**

Add the clip to `navigatorContentVariants`, gated `max-lg:` so the column
arrangement from `lg` is untouched — a clip there could crop a pane's shadow or
a popover anchored inside it.

- [ ] **Step 3: Check what the clip costs**

Three things sit near this boundary. Verify each rather than assuming:

- **`Pane.Header`'s sticky positioning.** The pane's own `ScrollArea` viewport
  is the scroller, not Content, so a clip on Content should not affect it —
  confirm at 900px that the header still sticks while the pane scrolls.
- **The mobile tab bar.** It is positioned against the root, not Content, so it
  should be unaffected — but it is `max-md:absolute` and worth a look.
- **Anything anchored out of a pane.** A popover or drawer portals to the body
  and is unaffected; a rail popover is outside Content entirely. Confirm no
  in-pane affordance is now cropped.

- [ ] **Step 4: Verify across the band**

At **390px** (no rail): push and pop still animate, nothing clipped that was
not before. At **900px**: the behind-pane no longer crosses the rail, and the
push/pop still animates fully rather than appearing to start mid-slide. At
**1200px**: columns, unaffected.

The middle case is the fix; the outer two are the regression check.

```bash
cd packages/components && pnpm vitest run src/components/Navigator src/components/Pane
```
then `pnpm typecheck` from the repo root. Act-warning budgets:
`Navigator.test.tsx` ≤ 2, whole suite ≤ 5.

```bash
git add packages/components/src
git commit -m "fix(navigator): clip stacked panes to the content column"
```
