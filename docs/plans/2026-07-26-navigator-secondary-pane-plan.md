# Navigator secondary-as-pane + components list panel — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a `Navigator.Secondary` render as a dedicated, filterable, groupable list pane instead of nesting in the rail, and make the Roadie docs Components section the first consumer — replacing its card-grid landing page and rail sub-nav with a master–detail list panel.

**Architecture:** `Navigator.Secondary` is already a declaration read by parents and rendered into two surfaces (nested rail group, mobile strip). This adds a third — a list pane — selected by a `presentation` prop, hosted by a new `Navigator.SecondaryPane` placed inside `Navigator.Content`. Supporting additions: `Navigator.Group` for headed sections, `leading`/`keywords` on `Navigator.Item`, an extensible filter-predicate registry with a built-in `Search` control, `emphasis` and `hideOnMobile` on `Navigator.Pane`, and `children` on `Navigator.Pane.Header`. Mobile pane stacking moves off `:last-child` onto a `:has()` participation rule so DOM order stops being load-bearing.

**Tech Stack:** React 19, `@base-ui/react@1.3.0`, Tailwind CSS v4 + Roadie utilities, CVA, Vitest + React Testing Library, tsdown, Next.js 16 MDX docs.

**Design doc:** [`docs/brainstorms/2026-07-26-components-list-panel-design.md`](../brainstorms/2026-07-26-components-list-panel-design.md)

## Prerequisite (already met)

This plan is sequenced **after ScrollArea Task 4**, which has landed (`7e0cc171`, `0bfe7beb`). `Navigator.Pane` already renders `ScrollArea` with a function `render` prop; the pane is still `<section data-slot="navigator-pane">` and the scroll container is a nested `<div data-slot="navigator-pane-viewport">`. All code in this plan is written against that post-Task-4 shape. Confirm before starting:

```bash
grep -n "navigator-pane-viewport" packages/components/src/components/Navigator/NavigatorPane.tsx
```

Expected: two hits (the `data-slot` and the variant import usage). If absent, stop — the ScrollArea work has been reverted and this plan does not apply.

**One correction to the design doc.** It says pane children must never be wrapped in `ScrollArea.Content`. That was true of the original ScrollArea plan, but `ee2b0de7` since added `<ScrollArea.Content fitWidth={false}>` around the pane's children so the scrollbar re-measures when route content swaps. `fitWidth={false}` keeps the wrapper at the viewport's width, so it neither defeats the horizontal clamp nor gives sticky children a box to escape — `Navigator.Pane.Header` already sticks correctly through it. Sticky group headers (Task 4) resolve against the viewport the same way, and the `--navigator-pane-header-height` custom property set on the pane element (Task 3) inherits down through the wrapper. Do not remove the wrapper.

## Global Constraints

- Every file using React client hooks or `@base-ui/react/*` starts with `'use client'`. `Navigator/index.tsx` must **never** carry it — it is the server-safe property-assignment layer.
- Every rendered DOM element carries a `data-slot`, kebab-case from its dot-path. `data-slot` goes immediately after the opening tag, before `className` and `...props`.
- Compounds use named exports + property assignment. Function names are compound-prefixed (`NavigatorGroup`, not `Group`); `displayName` is dot-notation (`'Navigator.Group'`).
- Prefer `type X = Base & { ... }` over `interface X extends Base` for subcomponent prop types.
- **Never** type a public prop as `VariantProps<typeof variants>['key']` — `react-docgen-typescript` cannot drill into CVA conditional types and the prop vanishes from `<PropsDefinitions>`. Inline the literal union and export a sibling type alias.
- Dev-only warnings use the `isDev()` helper from `packages/components/src/utils/isDev.ts`. Never `import.meta.env.DEV`.
- No `as` / `asChild` / `ElementType` API. Polymorphism is Base UI's `render` prop only.
- Never hardcode colours or spacing. Use Roadie semantic utilities and `var(--intent-*)`.
- Icons: Phosphor `*Icon`-suffixed exports, `weight='bold'`, sized with Tailwind `className` not the `size` prop.
- Prettier: single quotes, no semicolons, 2 spaces, 80 cols. **Never** run `prettier --write` on `.mdx` — it empties them. Edit MDX by hand.
- Comments are minimal: quirks, edge cases, workarounds and *why*. Never restate what the code says.
- Trees containing `Navigator.Secondary`, `Navigator.Item` or `Navigator.Group` must be authored in a client component — Flight replaces element types authored in server components with `React.lazy` wrappers and every identity walk silently fails. See `docs/contributing/COMPOUND_PATTERNS.md` §1.2.
- The existing Navigator suite (94 `aria-current` / `data-slot` assertions) must stay green at every commit.
- After changing `packages/components`, run `pnpm --filter @oztix/roadie-components build` before any docs check — docs resolve the package via dist through a workspace symlink.

**Full gate**, run before declaring any task done:

```bash
pnpm --filter @oztix/roadie-components test
pnpm typecheck
pnpm lint
```

---

## File structure

**Created — components package**

| File | Responsibility |
| --- | --- |
| `Navigator/isTopPane.ts` | The single rule for "is this pane the visible one", shared by CSS and JS |
| `Navigator/NavigatorGroup.tsx` | Headed group of secondary items; renders per presentation |
| `Navigator/NavigatorSecondaryPane.tsx` | Placement host; renders the active pane Secondary as a `role='list'` pane |
| `Navigator/NavigatorSecondaryPaneSearch.tsx` | Built-in text filter control |
| `Navigator/NavigatorFilterContext.ts` | Predicate registry + `NavigatorItemMeta` |
| `Navigator/collectItemMetas.ts` | One-level walk producing `NavigatorItemMeta[]`, plus `flattenText` |

**Modified — components package**

| File | Change |
| --- | --- |
| `Navigator/variants.ts` | `emphasis` on pane variants; `:has()` stacking; pane-presentation item/group classes |
| `Navigator/NavigatorPane.tsx` | `emphasis` + `hideOnMobile` props; `isTopPane`; pane ref into context |
| `Navigator/NavigatorPaneContext.ts` | Role string → object carrying role + pane ref |
| `Navigator/NavigatorPaneHeader.tsx` | `children` slot; publishes measured height as a CSS var |
| `Navigator/NavigatorPresentationContext.ts` | Adds `'pane'` |
| `Navigator/NavigatorSecondary.tsx` | `presentation` prop |
| `Navigator/NavigatorItem.tsx` | `leading` + `keywords`; pane-presentation row; filter visibility |
| `Navigator/NavigatorPrimary.tsx` | Presentation-aware `nests`, strip hoisting, pane hoisting, dev warning |
| `Navigator/NavigatorContext.ts` | `paneSecondary` + `registerSecondaryPane` |
| `Navigator/splitSecondary.ts` | Walks descend one level into `Group`; `secondaryPresentation` helper |
| `Navigator/index.tsx` | Export the new parts and types |

**Created / modified — docs**

| File | Change |
| --- | --- |
| `docs/src/lib/component-manifest.ts` | **Create.** Single source for the component FS walk + category order |
| `docs/src/components/ComponentSkeleton.tsx` | **Create.** Extracted from the landing page, plus `ComponentThumbnail` |
| `docs/src/app/layout.tsx` | Use the manifest; pass grouped components to `DocsNavigator` |
| `docs/src/app/components/page.tsx` | Card grid → `EmptyState` |
| `docs/src/components/Navigation.tsx` | Components section → `presentation='pane'`; `SecondaryPane`; widths; `hideOnMobile` |
| `docs/src/app/components/navigator/page.mdx` | Document every addition + the rail-vs-pane decision |
| `docs/src/app/debug/rsc-smoke/` | Canary gains a `Group` + pane-presentation case |
| `docs/solutions/` | One new entry (Task 12) |

---

## Task 1: `Navigator.Pane` gains `emphasis`

**Files:**

- Modify: `packages/components/src/components/Navigator/variants.ts` (`navigatorPaneVariants`)
- Modify: `packages/components/src/components/Navigator/NavigatorPane.tsx`
- Modify: `packages/components/src/components/Navigator/index.tsx`
- Test: `packages/components/src/components/Navigator/Navigator.test.tsx`

**Interfaces:**

- Consumes: nothing from earlier tasks.
- Produces:
  - `type NavigatorPaneEmphasis = 'raised' | 'normal' | 'subtle' | 'subtler'`, exported from `Navigator/variants.ts` and re-exported from `Navigator/index.tsx`.
  - `NavigatorPaneProps` gains `emphasis?: NavigatorPaneEmphasis` (default `'raised'`).

Task 3 uses `NavigatorPaneEmphasis`; Tasks 7 and 11 pass `emphasis`.

- [ ] **Step 1: Write the failing tests**

Add to `Navigator.test.tsx`, inside the top-level `describe('Navigator', …)`:

```tsx
  it('gives a pane the raised surface by default', () => {
    const { container } = render(
      <Navigator value='events'>
        <Navigator.Content>
          <Navigator.Pane role='list'>Events</Navigator.Pane>
        </Navigator.Content>
      </Navigator>
    )

    expect(container.querySelector('[data-slot="navigator-pane"]')).toHaveClass(
      'emphasis-raised'
    )
  })

  it('drops every surface utility at the subtler emphasis', () => {
    const { container } = render(
      <Navigator value='events'>
        <Navigator.Content>
          <Navigator.Pane role='list' emphasis='subtler'>
            Events
          </Navigator.Pane>
        </Navigator.Content>
      </Navigator>
    )
    const pane = container.querySelector('[data-slot="navigator-pane"]')!

    expect(pane.className).not.toMatch(/emphasis-/)
  })

  it('applies the other emphases as their matching utility', () => {
    const { container } = render(
      <Navigator value='events'>
        <Navigator.Content>
          <Navigator.Pane role='list' emphasis='subtle'>
            Events
          </Navigator.Pane>
        </Navigator.Content>
      </Navigator>
    )

    expect(container.querySelector('[data-slot="navigator-pane"]')).toHaveClass(
      'emphasis-subtle'
    )
  })
```

- [ ] **Step 2: Run the tests to verify they fail**

```bash
pnpm --filter @oztix/roadie-components test -- Navigator --run
```

Expected: the `subtler` and `subtle` cases FAIL (every pane still carries `emphasis-raised`). The default case passes already — that is correct, it is the regression guard.

- [ ] **Step 3: Move the surface into a variant**

In `variants.ts`, replace the `navigatorPaneVariants` definition:

```ts
export type NavigatorPaneEmphasis = 'raised' | 'normal' | 'subtle' | 'subtler'

// The pane is a ScrollArea root: it owns the surface, the shape and the
// sizing; its viewport owns the scroll. The page itself never scrolls.
export const navigatorPaneVariants = cva(
  [
    'relative min-h-0 min-w-0',
    // Rounded card on desktop, where panes sit in a gap-3 row and the rounding
    // reads. On mobile a pane is full-bleed (absolute inset-0 fills the whole
    // viewport), so `rounded-2xl` would only carve sunken cutouts at the screen
    // corners — `max-md:rounded-none` keeps the surface clean edge to edge.
    // `overflow-hidden` keeps the viewport's square corners inside the card.
    'overflow-hidden rounded-2xl max-md:rounded-none'
  ],
  {
    variants: {
      role: {
        list: 'md:w-[24rem] md:shrink-0',
        detail: 'md:min-w-0 md:flex-1'
      },
      // Mirrors Card's value names, with one deliberate divergence: a pane's
      // `subtler` is no surface at all, not Card's faint tint plus hairline.
      // The recessive pane sits directly on the sunken frame the way the rail
      // does; a tinted card-in-a-card reads as a mistake at pane scale.
      emphasis: {
        raised: 'emphasis-raised',
        normal: 'emphasis-normal',
        subtle: 'emphasis-subtle',
        subtler: ''
      }
    },
    defaultVariants: { role: 'list', emphasis: 'raised' }
  }
)
```

- [ ] **Step 4: Thread the prop through the pane**

In `NavigatorPane.tsx`, add to `NavigatorPaneProps` (after `collapseNav`):

```ts
  /**
   * Surface treatment. Mirrors `Card`'s value names, except that a pane's
   * `subtler` is **no surface at all** — transparent, no border, no shadow —
   * so the pane sits directly on the sunken frame the way the rail does.
   *
   * @default 'raised'
   */
  emphasis?: NavigatorPaneEmphasis
```

Import the type alongside the variants:

```ts
import {
  type NavigatorPaneEmphasis,
  type NavigatorPaneRole,
  navigatorPaneVariants,
  navigatorPaneViewportVariants
} from './variants'
```

Destructure `emphasis = 'raised'` in the signature and pass it through:

```tsx
      className={cn(navigatorPaneVariants({ role, emphasis }), className)}
```

- [ ] **Step 5: Export the type**

In `Navigator/index.tsx`, extend the existing variants type export:

```ts
export type {
  NavigatorPaneRole,
  NavigatorPaneEmphasis,
  NavigatorIndicatorSurface
} from './variants'
```

- [ ] **Step 6: Run the full suite**

```bash
pnpm --filter @oztix/roadie-components test -- Navigator --run
pnpm typecheck && pnpm lint
```

Expected: all pass, including the 94 pre-existing assertions.

- [ ] **Step 7: Commit**

```bash
git add packages/components/src/components/Navigator/
git commit -m "feat(navigator): add emphasis prop to Navigator.Pane"
```

---

## Task 2: Mobile stacking by participation, not position

**Files:**

- Create: `packages/components/src/components/Navigator/isTopPane.ts`
- Modify: `packages/components/src/components/Navigator/variants.ts` (`navigatorContentVariants`)
- Modify: `packages/components/src/components/Navigator/NavigatorPane.tsx`
- Modify: `packages/components/src/components/Navigator/index.tsx`
- Test: `packages/components/src/components/Navigator/Navigator.test.tsx`

**Interfaces:**

- Consumes: `NavigatorPaneProps` from Task 1.
- Produces:
  - `isTopPane(pane: Element | null): boolean` from `Navigator/isTopPane.ts`.
  - `NavigatorPaneProps` gains `hideOnMobile?: boolean` (default `false`), emitting `data-mobile='hidden'`.

Task 11 uses `hideOnMobile` for both `OnThisPage` and the landing detail pane.

**Background.** `navigatorContentVariants` currently pushes every `:not(:last-child)` off-canvas, and `NavigatorPane` decides "am I visible" with `el.nextElementSibling !== null` in two places. Both are position rules. A `display:none` pane authored last therefore steals the top slot from the pane behind it *and* silently disables `collapseNav` and the tap-to-scroll-to-top affordance — which is exactly why `OnThisPage` is authored first with a compensating `lg:order-2` in the docs shell today.

- [ ] **Step 1: Write the failing tests**

Add to `Navigator.test.tsx`:

```tsx
  it('marks a hideOnMobile pane as out of the stack', () => {
    const { container } = render(
      <Navigator value='events'>
        <Navigator.Content>
          <Navigator.Pane role='list'>Events</Navigator.Pane>
          <Navigator.Pane role='detail' hideOnMobile>
            Contents
          </Navigator.Pane>
        </Navigator.Content>
      </Navigator>
    )
    const panes = container.querySelectorAll('[data-slot="navigator-pane"]')

    expect(panes[0]).not.toHaveAttribute('data-mobile')
    expect(panes[1]).toHaveAttribute('data-mobile', 'hidden')
  })
```

And, in a new `describe` block:

```tsx
describe('isTopPane', () => {
  const paneStack = (...attrs: (string | null)[]) => {
    const parent = document.createElement('div')
    attrs.forEach((attr) => {
      const pane = document.createElement('section')
      if (attr !== null) pane.setAttribute('data-mobile', attr)
      parent.append(pane)
    })
    return [...parent.children]
  }

  it('treats the last participating pane as the top pane', () => {
    const [list, detail] = paneStack(null, null)

    expect(isTopPane(list)).toBe(false)
    expect(isTopPane(detail)).toBe(true)
  })

  it('ignores hidden panes whatever their position', () => {
    const [list, toc] = paneStack(null, 'hidden')

    expect(isTopPane(list)).toBe(true)
    expect(isTopPane(toc)).toBe(false)
  })

  it('skips a run of hidden panes to find the top', () => {
    const [list, detail, a, b] = paneStack(null, null, 'hidden', 'hidden')

    expect(isTopPane(list)).toBe(false)
    expect(isTopPane(detail)).toBe(true)
    expect(isTopPane(a)).toBe(false)
    expect(isTopPane(b)).toBe(false)
  })

  it('is false for nothing', () => {
    expect(isTopPane(null)).toBe(false)
  })
})
```

Import it at the top of the test file:

```tsx
import { isTopPane } from './isTopPane'
```

- [ ] **Step 2: Run the tests to verify they fail**

```bash
pnpm --filter @oztix/roadie-components test -- Navigator --run
```

Expected: FAIL — `Cannot find module './isTopPane'`.

- [ ] **Step 3: Write the helper**

Create `packages/components/src/components/Navigator/isTopPane.ts`:

```ts
// The one rule for "which pane is the visible one", shared by the mobile
// stacking CSS in `navigatorContentVariants` and by NavigatorPane's scroll
// consumers. Position alone is wrong: a `hideOnMobile` pane is `display:none`
// below `md`, so it must not take the top slot from the pane before it, nor
// stop that pane from owning `collapseNav` and the scroll-to-top affordance.
export function isTopPane(pane: Element | null): boolean {
  if (!pane || pane.getAttribute('data-mobile') === 'hidden') return false

  for (
    let sibling = pane.nextElementSibling;
    sibling !== null;
    sibling = sibling.nextElementSibling
  ) {
    if (sibling.getAttribute('data-mobile') !== 'hidden') return false
  }

  return true
}
```

- [ ] **Step 4: Run to verify the helper tests pass**

```bash
pnpm --filter @oztix/roadie-components test -- Navigator --run
```

Expected: the `isTopPane` block PASSES; the `data-mobile` attribute test still FAILS.

- [ ] **Step 5: Add the prop and adopt the helper**

In `NavigatorPane.tsx`, add to `NavigatorPaneProps`:

```ts
  /**
   * Drop this pane from the mobile pane stack: hidden below `md`, and ignored
   * when working out which pane is on top. Use it for panes that only make
   * sense beside the content (a table of contents), and for a detail pane that
   * should yield to the list at a section's landing route.
   *
   * @default false
   */
  hideOnMobile?: boolean
```

Destructure `hideOnMobile = false`, import the helper, and emit the attribute:

```ts
import { isTopPane } from './isTopPane'
```

```tsx
      data-collapse-nav={collapseNav || undefined}
      data-mobile={hideOnMobile ? 'hidden' : undefined}
```

Replace both position checks. In `syncBar`:

```ts
    if (!el || !viewport || !isTopPane(el)) return
```

and in the `activePaneScroller` layout effect:

```ts
    if (!el || !viewport || !isTopPane(el)) return
```

- [ ] **Step 6: Switch the stacking CSS to participation**

**Surgical edit only.** `navigatorContentVariants` carries recent, unrelated work — desktop-only padding and a rail-gutter rule (`7ad290b0`, `a268439d`). Replace *only* the three `:not(:last-child)` entries and their comment; leave every other line in the array exactly as you find it.

Delete these four lines:

```ts
  // `:not(:last-child)` = every pane except the top one: pushed off-canvas
  // and dimmed while staying mounted, so a popped list keeps its scroll.
  'max-md:[&>*:not(:last-child)]:-translate-x-[22%]',
  'max-md:[&>*:not(:last-child)]:opacity-60',
```

and this one, further down:

```ts
  'max-md:[&>*:not(:last-child)]:pointer-events-none',
```

Put in their place, keeping the surrounding `pointer-events` comment where it is:

```ts
  // A pane opting out of the stack is gone below `md` and, crucially, does not
  // count when working out which pane is on top — see `isTopPane`, which
  // implements the same rule for the JS side.
  'max-md:[&>*[data-mobile=hidden]]:hidden',
  // "Stacked underneath" = some later sibling is still participating. The last
  // participating pane matches nothing, so it is on top. Position-independent,
  // which frees consumers to author hidden panes wherever they read best.
  'max-md:[&>*:not([data-mobile=hidden]):has(~*:not([data-mobile=hidden]))]:-translate-x-[22%]',
  'max-md:[&>*:not([data-mobile=hidden]):has(~*:not([data-mobile=hidden]))]:opacity-60',
  'max-md:[&>*:not([data-mobile=hidden]):has(~*:not([data-mobile=hidden]))]:pointer-events-none',
```

Verify with `git diff packages/components/src/components/Navigator/variants.ts` that no padding or gutter line moved.

- [ ] **Step 7: Export the helper**

In `Navigator/index.tsx`, add above the variants export:

```ts
export { isTopPane } from './isTopPane'
```

- [ ] **Step 8: Verify Tailwind actually compiles the `:has()` variants**

This is the one step in the plan that can fail silently — an arbitrary variant Tailwind cannot parse produces no CSS and no error.

```bash
pnpm --filter @oztix/roadie-components build
pnpm --filter docs build
grep -c 'data-mobile' docs/out/_next/static/chunks/*.css
```

Expected: a non-zero count, and the emitted rule contains `:has(~`.

If the count is zero, move the selector to a named utility in `packages/core/src/css/layout.css` and reference it by name from `navigatorContentVariants`:

```css
@utility navigator-pane-stack {
  & > *[data-mobile='hidden'] {
    display: none;
  }
  & > *:not([data-mobile='hidden']):has(~ *:not([data-mobile='hidden'])) {
    transform: translateX(-22%);
    opacity: 0.6;
    pointer-events: none;
  }
}
```

wrapped in the existing `@media` conventions of that file, with `max-md:navigator-pane-stack` replacing the three arbitrary variants. Re-run the grep to confirm.

- [ ] **Step 9: Run the full suite**

```bash
pnpm --filter @oztix/roadie-components test -- Navigator --run
pnpm typecheck && pnpm lint
```

Expected: all pass. Pay attention to the existing `collapseNav` block — it renders single-pane and two-pane trees with no `hideOnMobile`, so `isTopPane` must reproduce the old `nextElementSibling` result exactly there.

- [ ] **Step 10: Commit**

```bash
git add packages/components/src/components/Navigator/ packages/core/src/css/layout.css
git commit -m "feat(navigator): stack mobile panes by participation, not position"
```

---

## Task 3: `Navigator.Pane.Header` gains `children` and publishes its height

**Files:**

- Modify: `packages/components/src/components/Navigator/NavigatorPaneContext.ts`
- Modify: `packages/components/src/components/Navigator/NavigatorPane.tsx`
- Modify: `packages/components/src/components/Navigator/NavigatorPaneHeader.tsx`
- Test: `packages/components/src/components/Navigator/Navigator.test.tsx`

**Interfaces:**

- Consumes: `NavigatorPaneEmphasis` (Task 1), `isTopPane` (Task 2) — both already wired.
- Produces:
  - `NavigatorPaneContext` value becomes `NavigatorPaneContextValue | null` where
    `type NavigatorPaneContextValue = { role: NavigatorPaneRole; paneRef: RefObject<HTMLElement | null> }`.
  - `NavigatorPaneHeaderProps` gains `children?: ReactNode`.
  - CSS custom property `--navigator-pane-header-height`, set on the pane element.

Task 4's group headers consume the custom property; Task 8's `Search` renders as header `children`.

**Background.** Sticky positioning resolves against `ScrollArea.Viewport`, and `Navigator.Pane.Header` is `sticky top-0` inside it. A group header that also sticks at `top-0` would pin *underneath* the pane header and be invisible. It needs the header's height as its offset, and that height genuinely varies — heading present or not, search present or not, and on mobile the secondary strip adds a row. Measure it; do not guess.

- [ ] **Step 1: Write the failing tests**

```tsx
  it('renders pane header children between the heading and the section nav', () => {
    const { container, getByText } = render(
      <Navigator value='events'>
        <Navigator.Content>
          <Navigator.Pane role='list'>
            <Navigator.Pane.Header heading='Events'>
              <input aria-label='Filter' />
            </Navigator.Pane.Header>
          </Navigator.Pane>
        </Navigator.Content>
      </Navigator>
    )
    const header = container.querySelector(
      '[data-slot="navigator-pane-header"]'
    )!

    expect(header).toContainElement(getByText('Events'))
    expect(header).toContainElement(
      container.querySelector('input[aria-label="Filter"]')
    )
  })

  it('keeps a children-only pane header visible on desktop', () => {
    const { container } = render(
      <Navigator value='events'>
        <Navigator.Content>
          <Navigator.Pane role='list'>
            <Navigator.Pane.Header>
              <input aria-label='Filter' />
            </Navigator.Pane.Header>
          </Navigator.Pane>
        </Navigator.Content>
      </Navigator>
    )

    expect(
      container.querySelector('[data-slot="navigator-pane-header"]')
    ).not.toHaveClass('md:hidden')
  })
```

- [ ] **Step 2: Run to verify they fail**

```bash
pnpm --filter @oztix/roadie-components test -- Navigator --run
```

Expected: FAIL — `children` is not a prop, so the input never renders; and a chrome-less header is `md:hidden`.

- [ ] **Step 3: Change the pane context shape**

Replace `NavigatorPaneContext.ts` entirely:

```ts
'use client'

import { type RefObject, createContext } from 'react'

import type { NavigatorPaneRole } from './variants'

export type NavigatorPaneContextValue = {
  /**
   * Lets `Navigator.Pane.Header` be depth-aware: a `list` (first) pane is the
   * root and shows nothing; a `detail` pane is pushed/beside and shows
   * Back/Close.
   */
  role: NavigatorPaneRole
  /**
   * The pane element, so the header can publish its measured height there for
   * sticky content further down the pane to offset against.
   */
  paneRef: RefObject<HTMLElement | null>
}

/** `null` when a header is rendered outside a pane. */
export const NavigatorPaneContext =
  createContext<NavigatorPaneContextValue | null>(null)
```

- [ ] **Step 4: Provide the new value from the pane**

In `NavigatorPane.tsx`, import `useMemo` and the value type, then build a stable value:

```tsx
  const paneContextValue = useMemo(
    () => ({ role, paneRef }),
    [role]
  )
```

`paneRef` is a stable ref object, so `role` is the only real dependency. Replace the provider:

```tsx
        <NavigatorPaneContext value={paneContextValue}>
          {children}
        </NavigatorPaneContext>
```

- [ ] **Step 5: Add `children` and the measurement to the header**

In `NavigatorPaneHeader.tsx`:

Add to `NavigatorPaneHeaderProps`:

```ts
  /**
   * Extra chrome below the heading and above the mobile section nav — a filter
   * field, a segmented control, a count. Its height is included in
   * `--navigator-pane-header-height`, which sticky content further down the
   * pane can offset against.
   */
  children?: ReactNode
```

Read the context as an object and take the header ref:

```tsx
  const paneContext = use(NavigatorPaneContext)
  const paneRole = paneContext?.role ?? null
  const headerRef = useRef<HTMLElement>(null)
```

Add the measurement effect immediately after the existing `registerHeader` effect — **before** any early return, like that one, and guarded so jsdom (which has no `ResizeObserver`) does not throw:

```tsx
  // Published on the pane rather than the header so sticky content anywhere
  // inside the pane can offset against it. Measured, not constant: the header
  // grows a heading row, a children row and — on mobile — the section-nav
  // strip, independently of each other.
  useLayoutEffect(() => {
    const header = headerRef.current
    const pane = paneContext?.paneRef.current
    if (!header || !pane) return

    const publish = () =>
      pane.style.setProperty(
        '--navigator-pane-header-height',
        `${header.offsetHeight}px`
      )

    publish()

    if (typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(publish)
    observer.observe(header)
    return () => {
      observer.disconnect()
      pane.style.removeProperty('--navigator-pane-header-height')
    }
  }, [paneContext])
```

Import `useLayoutEffect` and `useRef` from React.

Count `children` as chrome so a filter-only header is not hidden on desktop:

```tsx
  const hasTopRow = dismissButton !== null || action != null
  const hasChrome = hasTopRow || heading != null || children != null

  if (!hasChrome && secondaryNav === null) return null
```

Attach the ref and render `children` between heading and strip:

```tsx
    <header
      ref={headerRef}
      data-slot='navigator-pane-header'
      className={cn(
        navigatorPaneHeaderVariants({ hideOnDesktop: !hasChrome }),
        className
      )}
    >
      {/* top row unchanged */}
      {heading != null ? (
        <h2 className={navigatorPaneHeaderHeadingVariants()}>{heading}</h2>
      ) : null}
      {children}
      {/* secondary strip unchanged */}
```

- [ ] **Step 6: Run the suite**

```bash
pnpm --filter @oztix/roadie-components test -- Navigator --run
pnpm typecheck && pnpm lint
```

Expected: all pass. The context shape change touches only `NavigatorPaneHeader`; `typecheck` will name any other consumer if one exists.

- [ ] **Step 7: Commit**

```bash
git add packages/components/src/components/Navigator/
git commit -m "feat(navigator): add children slot to Navigator.Pane.Header"
```

---

## Task 4: `Navigator.Group`

**Files:**

- Create: `packages/components/src/components/Navigator/NavigatorGroup.tsx`
- Create: `packages/components/src/components/Navigator/collectItemMetas.ts`
- Modify: `packages/components/src/components/Navigator/NavigatorPresentationContext.ts`
- Modify: `packages/components/src/components/Navigator/splitSecondary.ts`
- Modify: `packages/components/src/components/Navigator/variants.ts`
- Modify: `packages/components/src/components/Navigator/index.tsx`
- Modify: `docs/contributing/COMPOUND_PATTERNS.md`
- Test: `packages/components/src/components/Navigator/Navigator.test.tsx`

**Interfaces:**

- Consumes: nothing from earlier tasks.
- Produces:
  - `NavigatorGroup` with `type NavigatorGroupProps = { label: ReactNode; children?: ReactNode; className?: string }`, attached as `Navigator.Group`.
  - `NavigatorPresentation` becomes `'rail' | 'strip' | 'pane'`.
  - `flattenText(node: ReactNode): string` and `collectItemMetas(children: ReactNode, group?: string): NavigatorItemMeta[]` from `collectItemMetas.ts`.
  - `secondaryDescendantValues`, `firstSecondaryHref`, `firstSecondaryValue` descend one level into `NavigatorGroup`.
  - `navigatorGroupLabelVariants` from `variants.ts`.

Task 5 reads the presentation; Task 6 renders pane items inside a group; Task 8 filters groups.

**Background.** The three walks in `splitSecondary.ts` are one-level: direct `Navigator.Item` children of `Navigator.Secondary`. `Group` puts items one level deeper. The walks must descend into `Group` specifically — a known type matched by identity, exactly like `Secondary` and `Item`. This is not a licence for arbitrary wrappers, and `COMPOUND_PATTERNS.md` must say so precisely.

- [ ] **Step 1: Write the failing tests**

```tsx
  it('finds items nested inside a group when collecting descendants', () => {
    render(
      <Navigator value='/components/button'>
        <Navigator.Primary aria-label='Docs'>
          <Navigator.Item value='/components' href='/components'>
            Components
            <Navigator.Secondary aria-label='Components'>
              <Navigator.Group label='Actions'>
                <Navigator.Item value='/components/button' href='/components/button'>
                  Button
                </Navigator.Item>
              </Navigator.Group>
            </Navigator.Secondary>
          </Navigator.Item>
        </Navigator.Primary>
      </Navigator>
    )

    // The section is branch-active only if the walk saw the grouped child.
    expect(screen.getByRole('link', { name: /Components/ })).toHaveClass(
      'text-strong'
    )
    expect(
      screen.getByRole('link', { name: 'Button' })
    ).toHaveAttribute('aria-current', 'page')
  })

  it('renders a group label in the rail', () => {
    render(
      <Navigator value='/components/button'>
        <Navigator.Primary aria-label='Docs'>
          <Navigator.Item value='/components' href='/components'>
            Components
            <Navigator.Secondary aria-label='Components'>
              <Navigator.Group label='Actions'>
                <Navigator.Item value='/components/button' href='/components/button'>
                  Button
                </Navigator.Item>
              </Navigator.Group>
            </Navigator.Secondary>
          </Navigator.Item>
        </Navigator.Primary>
      </Navigator>
    )

    expect(screen.getByText('Actions')).toBeVisible()
  })
```

Add a unit block for the text flattener:

```tsx
describe('flattenText', () => {
  it('joins nested element text', () => {
    expect(
      flattenText(
        <>
          Icon <strong>Button</strong>
        </>
      )
    ).toBe('Icon Button')
  })

  it('renders numbers and drops nullish nodes', () => {
    expect(flattenText([null, 'Step ', 2, undefined, false])).toBe('Step 2')
  })
})
```

Import at the top of the test file:

```tsx
import { flattenText } from './collectItemMetas'
```

- [ ] **Step 2: Run to verify they fail**

```bash
pnpm --filter @oztix/roadie-components test -- Navigator --run
```

Expected: FAIL — `Navigator.Group` is not a function, and `./collectItemMetas` does not resolve.

- [ ] **Step 3: Add `'pane'` to the presentation context**

In `NavigatorPresentationContext.ts`:

```ts
/**
 * Which surface a `Navigator.Item` is currently rendering into. The rail, the
 * mobile strip and the secondary pane render the *same authored elements*
 * through different parents, so the item can't infer this from its own props.
 */
export type NavigatorPresentation = 'rail' | 'strip' | 'pane'
```

- [ ] **Step 4: Write the meta collector**

Create `packages/components/src/components/Navigator/collectItemMetas.ts`:

```ts
import { Children, type ReactNode, isValidElement } from 'react'

/** A filterable view of one `Navigator.Item`, independent of presentation. */
export type NavigatorItemMeta = {
  value: string
  /** Flattened text of the item's label children. */
  label: string
  keywords: string[]
  /** Flattened text of the enclosing `Navigator.Group`'s label, if any. */
  group?: string
}

/**
 * The visible text of a node. Filter controls match against strings, but item
 * labels are authored as arbitrary JSX.
 */
export function flattenText(node: ReactNode): string {
  if (node === null || node === undefined || typeof node === 'boolean') return ''
  if (typeof node === 'string') return node
  if (typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map(flattenText).join('')
  if (isValidElement<{ children?: ReactNode }>(node)) {
    return flattenText(node.props.children)
  }
  return ''
}
```

The `NavigatorItem`-aware half of this file is added in Step 6, once the group exists to be walked into.

- [ ] **Step 5: Write the group**

Create `packages/components/src/components/Navigator/NavigatorGroup.tsx`:

```tsx
'use client'

import { type ReactNode, use } from 'react'

import { cn } from '@oztix/roadie-core/utils'

import { NavigatorPresentationContext } from './NavigatorPresentationContext'
import { navigatorGroupLabelVariants } from './variants'

export type NavigatorGroupProps = {
  /** Heading for the group, e.g. 'Actions'. */
  label: ReactNode
  children?: ReactNode
  className?: string
}

/**
 * A headed group of `Navigator.Item`s inside a `Navigator.Secondary`.
 *
 * Renders per surface: a label row in the rail, a sticky header in the
 * secondary pane, and — on the mobile strip, which is a single horizontal row
 * with nowhere to put a heading — a screen-reader-only label followed by its
 * items inline.
 *
 * Author inside a client component. The three walks in `splitSecondary` find
 * this element by reference, and Flight replaces the type of every element
 * authored in a server component with a `React.lazy` wrapper.
 */
export function NavigatorGroup({
  label,
  className,
  children
}: NavigatorGroupProps) {
  const presentation = use(NavigatorPresentationContext)

  if (presentation === 'strip') {
    return (
      <>
        <span className='sr-only'>{label}</span>
        {children}
      </>
    )
  }

  return (
    <div data-slot='navigator-group' className={cn('contents', className)}>
      <p className={navigatorGroupLabelVariants({ presentation })}>{label}</p>
      {presentation === 'pane' ? <ul className='grid gap-0'>{children}</ul> : children}
    </div>
  )
}

NavigatorGroup.displayName = 'Navigator.Group'
```

Add the label variant to `variants.ts`:

```ts
// The group heading. In the rail it is the quiet uppercase label that sits
// above a run of sub-pages. In the pane it pins while its group is in view —
// offset by the pane header's measured height so it stops *below* the header
// rather than underneath it, and opaque so rows scroll out of sight behind it.
export const navigatorGroupLabelVariants = cva(
  ['text-xs font-semibold tracking-wide text-subtler uppercase'],
  {
    variants: {
      presentation: {
        rail: 'pt-3 pr-3 pb-1 pl-12',
        pane: [
          'sticky top-[var(--navigator-pane-header-height,0px)] z-[1]',
          'bg-raised px-4 py-2'
        ].join(' '),
        strip: 'sr-only'
      }
    },
    defaultVariants: { presentation: 'rail' }
  }
)
```

`contents` on the wrapper keeps the group transparent to the parent's layout — the rail's `grid gap-0` and the pane's flow both see the label and the items as direct children, so a group changes grouping without changing spacing.

In `pane` presentation the group owns a `<ul>` around **its items only**, with the sticky label outside it. `display: contents` removes the wrapper's *box*, not the DOM node, so a `<ul>` further out would end up containing a `<div>` and a `<p>` — invalid per the `<ul>` content model, and enough to cost the list its implicit role in some assistive tech. A heading followed by the list it labels is both valid and more honest.

- [ ] **Step 6: Teach the walks to descend into a group**

In `splitSecondary.ts`, add the import and a shared expander, then route the three walks through it:

```ts
import { NavigatorGroup } from './NavigatorGroup'
```

```ts
/**
 * The direct `Navigator.Item` children of a `Navigator.Secondary`, plus those
 * one level inside a `Navigator.Group`.
 *
 * This is a deliberate, single-type exception to the one-level rule: `Group`
 * is matched by reference exactly as `Secondary` and `Item` are, so the walk
 * stays immune to everything except server-authored trees. It is NOT a licence
 * for arbitrary component wrappers — those are still invisible.
 */
function secondaryItems(secondary: ReactNode[]): ReactElement[] {
  const [nested] = secondary
  if (!isValidElement<NavigatorSecondaryProps>(nested)) return []

  const items: ReactElement[] = []
  Children.forEach(nested.props.children, (child) => {
    if (!isValidElement(child)) return
    if (child.type === NavigatorItem) {
      items.push(child)
      return
    }
    if (child.type === NavigatorGroup) {
      const groupProps = child.props as { children?: ReactNode }
      Children.forEach(groupProps.children, (grandChild) => {
        if (isValidElement(grandChild) && grandChild.type === NavigatorItem) {
          items.push(grandChild)
        }
      })
    }
  })
  return items
}
```

Rewrite the three exported walks on top of it:

```ts
export function secondaryDescendantValues(secondary: ReactNode[]): string[] {
  return secondaryItems(secondary).map(
    (item) => (item.props as { value: string }).value
  )
}

export function firstSecondaryHref(secondary: ReactNode[]): string | undefined {
  return secondaryItems(secondary).find(
    (item) => (item.props as { href?: string }).href !== undefined
  )?.props.href as string | undefined
}

export function firstSecondaryValue(
  secondary: ReactNode[]
): string | undefined {
  return secondaryItems(secondary).find(
    (item) => (item.props as { href?: string }).href !== undefined
  )?.props.value as string | undefined
}
```

Export `secondaryItems` too — Task 8 needs it to build the pane's meta list. Add `ReactElement` to the React type imports.

Now complete `collectItemMetas.ts` with the walk that produces metas, keeping the group label attached:

```ts
import { NavigatorGroup } from './NavigatorGroup'
import { NavigatorItem } from './NavigatorItem'

/**
 * One `NavigatorItemMeta` per item declared under a `Navigator.Secondary`,
 * walking one level into `Navigator.Group` and carrying the group's label
 * through so filters can match on it.
 */
export function collectItemMetas(children: ReactNode): NavigatorItemMeta[] {
  const metas: NavigatorItemMeta[] = []

  const pushItem = (element: ReactNode, group?: string) => {
    if (!isValidElement(element) || element.type !== NavigatorItem) return
    const props = element.props as {
      value: string
      children?: ReactNode
      keywords?: string[]
    }
    metas.push({
      value: props.value,
      label: flattenText(props.children),
      keywords: props.keywords ?? [],
      group
    })
  }

  Children.forEach(children, (child) => {
    if (!isValidElement(child)) return
    if (child.type === NavigatorGroup) {
      const groupProps = child.props as { label: ReactNode; children?: ReactNode }
      const group = flattenText(groupProps.label)
      Children.forEach(groupProps.children, (grandChild) =>
        pushItem(grandChild, group)
      )
      return
    }
    pushItem(child)
  })

  return metas
}
```

`keywords` lands on `NavigatorItemProps` in Task 6; typing the read here is forward-compatible and needs no change then.

- [ ] **Step 7: Wire the export**

In `Navigator/index.tsx`, import `NavigatorGroup`, add `Group: typeof NavigatorGroup` to the `Navigator` type, assign `Navigator.Group = NavigatorGroup`, and export:

```ts
export type { NavigatorGroupProps } from './NavigatorGroup'
export type { NavigatorItemMeta } from './collectItemMetas'
export { flattenText, collectItemMetas } from './collectItemMetas'
export { navigatorGroupLabelVariants } from './variants'
```

- [ ] **Step 8: Update the compound docs**

In `docs/contributing/COMPOUND_PATTERNS.md`, find the direct-children constraint section and add:

```markdown
**One exception, by name.** `Navigator.Secondary`'s walks descend exactly one
level into `Navigator.Group`, so `Navigator.Item`s may be direct children of
either. `Group` is matched by reference like `Secondary` and `Item` are, which
is what keeps the walk sound — the rule is "these three types, matched by
identity", not "one level of any wrapper". A `<MyGroup>` wrapper is still
invisible to the walk, and a tree authored in a server component still fails
silently for all three.
```

- [ ] **Step 9: Run the suite**

```bash
pnpm --filter @oztix/roadie-components test -- Navigator --run
pnpm typecheck && pnpm lint
```

- [ ] **Step 10: Commit**

```bash
git add packages/components/src/components/Navigator/ docs/contributing/COMPOUND_PATTERNS.md
git commit -m "feat(navigator): add Navigator.Group for headed secondary sections"
```

---

## Task 5: `Navigator.Secondary` gains `presentation`

**Files:**

- Modify: `packages/components/src/components/Navigator/NavigatorSecondary.tsx`
- Modify: `packages/components/src/components/Navigator/splitSecondary.ts`
- Modify: `packages/components/src/components/Navigator/NavigatorItem.tsx`
- Modify: `packages/components/src/components/Navigator/NavigatorPrimary.tsx`
- Modify: `packages/components/src/components/Navigator/NavigatorContext.ts`
- Test: `packages/components/src/components/Navigator/Navigator.test.tsx`

**Interfaces:**

- Consumes: `secondaryItems` (Task 4).
- Produces:
  - `NavigatorSecondaryProps` gains `presentation?: 'rail' | 'pane'` (default `'rail'`), plus `export type NavigatorSecondaryPresentation = 'rail' | 'pane'`.
  - `secondaryPresentation(secondary: ReactNode[]): NavigatorSecondaryPresentation` from `splitSecondary.ts`.
  - `NavigatorContext` gains `paneSecondary: NavigatorSecondaryNav | null`, `setPaneSecondary`, `secondaryPaneCount: number`, `registerSecondaryPane: () => () => void`.

Task 7's `NavigatorSecondaryPane` reads `paneSecondary` and calls `registerSecondaryPane`.

- [ ] **Step 1: Write the failing tests**

```tsx
  const paneTree = (value: string) => (
    <Navigator value={value}>
      <Navigator.Primary aria-label='Docs'>
        <Navigator.Item value='/components' href='/components'>
          Components
          <Navigator.Secondary presentation='pane' aria-label='Components'>
            <Navigator.Item value='/components/button' href='/components/button'>
              Button
            </Navigator.Item>
          </Navigator.Secondary>
        </Navigator.Item>
      </Navigator.Primary>
    </Navigator>
  )

  it('renders nothing from a pane secondary in the rail', () => {
    render(paneTree('/components/button'))

    expect(screen.queryByRole('link', { name: 'Button' })).toBeNull()
  })

  it('gives a pane section no expand chevron', () => {
    const { container } = render(paneTree('/components/button'))

    expect(
      container.querySelector('[data-slot="navigator-item"] svg')
    ).toBeNull()
  })

  it('leaves the rail compact when the only secondary is a pane', () => {
    const { container } = render(paneTree('/components'))

    expect(container.querySelector('[data-slot="navigator-rail"]')).toHaveAttribute(
      'data-form',
      'compact'
    )
  })

  it('keeps a pane section branch-active from its declared descendants', () => {
    render(paneTree('/components/button'))

    expect(screen.getByRole('link', { name: /Components/ })).toHaveClass(
      'text-strong'
    )
  })
```

- [ ] **Step 2: Run to verify they fail**

```bash
pnpm --filter @oztix/roadie-components test -- Navigator --run
```

Expected: the first three FAIL — the secondary still renders inline in the rail, still draws a chevron, and still flips the rail to `nested`.

- [ ] **Step 3: Add the prop**

In `NavigatorSecondary.tsx`:

```ts
export type NavigatorSecondaryPresentation = 'rail' | 'pane'

export type NavigatorSecondaryProps = {
  /** Names the nested landmark, e.g. 'Events sections'. */
  'aria-label': string
  /**
   * Where this section's sub-nav renders.
   *
   * `rail` (default) nests it under its primary item on desktop and hoists it
   * into `Navigator.Pane.Header` as a horizontal strip on mobile. Right for a
   * handful of flat sub-pages.
   *
   * `pane` gives it a dedicated list pane instead — it renders nothing in the
   * rail and nothing in the strip. Right when the list is long, grouped,
   * filterable, or its rows carry more than a label. Requires a
   * `Navigator.SecondaryPane` inside `Navigator.Content`.
   */
  presentation?: NavigatorSecondaryPresentation
  className?: string
  children?: ReactNode
}
```

Destructure `presentation = 'rail'` and emit it so the surface is inspectable:

```tsx
    <nav
      data-slot='navigator-secondary'
      data-presentation={presentation}
      aria-label={ariaLabel}
      className={cn(navigatorSecondaryVariants(), className)}
    >
```

- [ ] **Step 4: Add the presentation reader**

In `splitSecondary.ts`:

```ts
/** The surface a section's declared `Navigator.Secondary` renders into. */
export function secondaryPresentation(
  secondary: ReactNode[]
): NavigatorSecondaryPresentation {
  const [nested] = secondary
  if (!isValidElement<NavigatorSecondaryProps>(nested)) return 'rail'
  return nested.props.presentation ?? 'rail'
}
```

Import `NavigatorSecondaryPresentation` as a type from `./NavigatorSecondary`.

- [ ] **Step 5: Stop the rail rendering a pane secondary**

In `NavigatorItem.tsx`, after the existing `splitSecondary` call:

```tsx
  const presentsInRail =
    secondary.length > 0 && secondaryPresentation(secondary) === 'rail'
```

Use it for the chevron:

```tsx
  const trailing =
    badge || presentsInRail ? (
      <span className={navigatorItemTrailingVariants()}>
        {badge}
        {presentsInRail ? (
          <CaretRightIcon
            weight='bold'
            aria-hidden='true'
            className={navigatorChevronVariants({ expanded: isBranch })}
          />
        ) : null}
      </span>
    ) : null
```

and for the inline render:

```tsx
      {isBranch && presentsInRail ? secondary : null}
```

Add `secondaryPresentation` to the `splitSecondary` import.

- [ ] **Step 6: Make `NavigatorPrimary` presentation-aware**

Three changes.

Count only rail secondaries toward nesting, in the main walk:

```tsx
      const itemProps = child.props as NavigatorItemProps
      items.push(toSlotMeta(itemProps))
      const { secondary } = splitSecondary(itemProps.children)
      if (secondary.length > 0 && secondaryPresentation(secondary) === 'rail') {
        foundNesting = true
      }
```

Split the active-secondary derivation by surface. Replace the `activeSecondary` memo with:

```tsx
  // Re-walked rather than folded into the memo above: the derivation that
  // shapes the rail and tab bar is deliberately independent of which item is
  // active, and the hoisted section nav is the one thing that isn't.
  const { activeRailSecondary, activePaneSecondary } = useMemo(() => {
    let rail: NavigatorSecondaryProps | undefined
    let pane: NavigatorSecondaryProps | undefined

    Children.forEach(children, (child) => {
      if (!isValidElement(child) || child.type !== NavigatorItem) return

      const itemProps = child.props as NavigatorItemProps
      const { secondary } = splitSecondary(itemProps.children)
      const branchActive = isBranchActive(
        itemProps.value,
        secondaryDescendantValues(secondary),
        activeValue
      )
      if (!branchActive) return

      const [nested] = secondary
      if (!isValidElement<NavigatorSecondaryProps>(nested)) return
      if (secondaryPresentation(secondary) === 'pane') {
        pane ??= nested.props
      } else {
        rail ??= nested.props
      }
    })

    return { activeRailSecondary: rail, activePaneSecondary: pane }
  }, [children, activeValue])
```

Hoist each to its own context slot:

```tsx
  useEffect(() => {
    setSecondaryNav(
      activeRailSecondary
        ? {
            'aria-label': activeRailSecondary['aria-label'],
            className: activeRailSecondary.className,
            children: activeRailSecondary.children
          }
        : null
    )
  }, [activeRailSecondary, setSecondaryNav])

  useEffect(() => {
    setPaneSecondary(
      activePaneSecondary
        ? {
            'aria-label': activePaneSecondary['aria-label'],
            className: activePaneSecondary.className,
            children: activePaneSecondary.children
          }
        : null
    )
  }, [activePaneSecondary, setPaneSecondary])
```

Point the existing "no header to host it" warning at `activeRailSecondary`, and add its sibling:

```tsx
  useEffect(() => {
    if (!isDev() || !activePaneSecondary || secondaryPaneCount > 0) return
    const id = setTimeout(() => {
      console.warn(
        "[Roadie] A Navigator.Secondary with presentation='pane' is active " +
          'but no Navigator.SecondaryPane is mounted, so the section nav has ' +
          'nowhere to render. Add <Navigator.SecondaryPane /> inside ' +
          'Navigator.Content.'
      )
    })
    return () => clearTimeout(id)
  }, [activePaneSecondary, secondaryPaneCount])
```

Pull `setPaneSecondary` and `secondaryPaneCount` from `use(NavigatorContext)`.

- [ ] **Step 7: Extend the root context**

In `NavigatorContext.ts`, add to `NavigatorContextValue`:

```ts
  /** The active pane-presentation section's declaration, for SecondaryPane. */
  paneSecondary: NavigatorSecondaryNav | null
  setPaneSecondary: (nav: NavigatorSecondaryNav | null) => void
  /** How many SecondaryPanes are mounted, for the dev warning. */
  secondaryPaneCount: number
  registerSecondaryPane: () => () => void
```

In `NavigatorRoot.tsx`, mirror the existing `secondaryNav` / `registerHeader` wiring:

```tsx
  const [paneSecondary, setPaneSecondary] =
    useState<NavigatorSecondaryNav | null>(null)
  const [secondaryPaneCount, setSecondaryPaneCount] = useState(0)

  const registerSecondaryPane = useCallback(() => {
    setSecondaryPaneCount((count) => count + 1)
    return () => setSecondaryPaneCount((count) => count - 1)
  }, [])
```

Add all four to the `useMemo` value and its dependency array.

- [ ] **Step 8: Run the suite**

```bash
pnpm --filter @oztix/roadie-components test -- Navigator --run
pnpm typecheck && pnpm lint
```

Expected: all pass. Existing rail-presentation trees are untouched — `presentation` defaults to `'rail'` everywhere.

- [ ] **Step 9: Commit**

```bash
git add packages/components/src/components/Navigator/
git commit -m "feat(navigator): add presentation prop to Navigator.Secondary"
```

---

## Task 6: `Navigator.Item` renders a pane row

**Files:**

- Modify: `packages/components/src/components/Navigator/NavigatorItem.tsx`
- Modify: `packages/components/src/components/Navigator/variants.ts`
- Test: `packages/components/src/components/Navigator/Navigator.test.tsx`

**Interfaces:**

- Consumes: `NavigatorPresentation` `'pane'` (Task 4).
- Produces: `NavigatorItemProps` gains `leading?: ReactNode` and `keywords?: string[]`; `navigatorPaneItemVariants` from `variants.ts`.

Task 7 renders items under `NavigatorPresentationContext value='pane'`; Task 8 filters on `keywords`.

**Background.** Pane rows must look like `List.Item` but keep Navigator's a11y contract — `aria-current='page'`, not `List.Item`'s `aria-current='true'` — and must call `setValue`. So they compose `NavigatorDestination` with List's exported class constants rather than rendering a `List.Item`.

- [ ] **Step 1: Write the failing tests**

```tsx
  const paneItem = (extra: Partial<React.ComponentProps<typeof Navigator.Item>> = {}) => (
    <NavigatorPresentationContext value='pane'>
      <ul>
        <Navigator.Item
          value='/components/icon-button'
          href='/components/icon-button'
          leading={<span data-testid='thumb' />}
          {...extra}
        >
          Icon Button
        </Navigator.Item>
      </ul>
    </NavigatorPresentationContext>
  )

  it('renders a pane item as a list row with its leading media', () => {
    const { getByTestId } = render(
      <Navigator value='/components/icon-button'>{paneItem()}</Navigator>
    )

    expect(getByTestId('thumb')).toBeVisible()
    expect(screen.getByRole('link', { name: /Icon Button/ })).toHaveAttribute(
      'aria-current',
      'page'
    )
  })

  it('wraps a pane item in a list item element', () => {
    const { container } = render(
      <Navigator value='/components'>{paneItem()}</Navigator>
    )

    expect(container.querySelector('li [data-slot="navigator-item"]')).toBeTruthy()
  })

  it('ignores leading media in the rail', () => {
    const { queryByTestId } = render(
      <Navigator value='/components/icon-button'>
        <Navigator.Primary aria-label='Docs'>
          <Navigator.Item
            value='/components/icon-button'
            href='/components/icon-button'
            leading={<span data-testid='thumb' />}
          >
            Icon Button
          </Navigator.Item>
        </Navigator.Primary>
      </Navigator>
    )

    expect(queryByTestId('thumb')).toBeNull()
  })
```

Import the presentation context in the test file:

```tsx
import { NavigatorPresentationContext } from './NavigatorPresentationContext'
```

- [ ] **Step 2: Run to verify they fail**

```bash
pnpm --filter @oztix/roadie-components test -- Navigator --run
```

Expected: FAIL — `leading` is not a prop, so the thumb never renders in any presentation.

- [ ] **Step 3: Add the pane row variant**

In `variants.ts`, import List's class constants at the top:

```ts
import {
  listItemBodyClass,
  listItemContentVariants,
  listItemLeadingClass,
  listItemTitleClass,
  listItemVariants
} from '../List/variants'
```

and add:

```ts
// A pane row reads as a List row — same rhythm, same inset divider, same
// selected fill — but stays a Navigator destination, so currency is
// `aria-current='page'` and activation still routes through NavigatorItem.
// Composed from List's constants rather than duplicated so the two can't drift.
export const navigatorPaneItemVariants = cva('', {
  variants: {
    selected: {
      true: cn(listItemVariants({ selected: true })),
      false: cn(listItemVariants({ selected: false }))
    }
  },
  defaultVariants: { selected: false }
})

export const navigatorPaneItemLeadingClass = listItemLeadingClass
export const navigatorPaneItemBodyClass = listItemBodyClass
export const navigatorPaneItemTitleClass = listItemTitleClass
export const navigatorPaneItemContentVariants = listItemContentVariants
```

- [ ] **Step 4: Add the props and the pane branch**

In `NavigatorItem.tsx`, add to `NavigatorItemProps`:

```ts
  /**
   * Leading media for the secondary-pane row — a thumbnail, avatar or tile.
   * Ignored in the rail and the mobile strip, which use `icon`.
   */
  leading?: ReactNode
  /**
   * Extra terms a filter control matches against, alongside the item's visible
   * label — a slug, a synonym, an abbreviation.
   */
  keywords?: string[]
```

Destructure `leading` in the signature. `keywords` is read by the walk in `collectItemMetas`, not by the component, so destructure it into a discard to keep it off the DOM:

```tsx
export function NavigatorItem({
  value,
  href,
  icon,
  leading,
  badge,
  keywords: _keywords,
  className,
  children,
  onClick
}: NavigatorItemProps) {
```

Before the existing `finalClassName` computation, branch for the pane:

```tsx
  if (presentation === 'pane') {
    return (
      <li>
        <NavigatorDestination
          href={effectiveHref}
          ariaCurrent={ariaCurrent}
          className={cn(navigatorPaneItemVariants({ selected: isCurrent }), className)}
          onClick={handleClick}
        >
          {leading != null ? (
            <span className={navigatorPaneItemLeadingClass}>{leading}</span>
          ) : null}
          <span
            data-slot='navigator-item-content'
            className={navigatorPaneItemContentVariants({
              hasLeading: leading != null
            })}
          >
            <span className={navigatorPaneItemBodyClass}>
              <span className={navigatorPaneItemTitleClass}>{label}</span>
            </span>
          </span>
        </NavigatorDestination>
      </li>
    )
  }
```

`ariaCurrent` and `handleClick` are already computed above this point; leave them where they are. `NavigatorDestination` sets `data-slot='navigator-item'` itself, which is what the `li [data-slot="navigator-item"]` test asserts.

- [ ] **Step 5: Run the suite**

```bash
pnpm --filter @oztix/roadie-components test -- Navigator --run
pnpm typecheck && pnpm lint
```

- [ ] **Step 6: Commit**

```bash
git add packages/components/src/components/Navigator/
git commit -m "feat(navigator): render Navigator.Item as a pane row with leading media"
```

---

## Task 7: `Navigator.SecondaryPane`

**Files:**

- Create: `packages/components/src/components/Navigator/NavigatorSecondaryPane.tsx`
- Modify: `packages/components/src/components/Navigator/index.tsx`
- Test: `packages/components/src/components/Navigator/Navigator.test.tsx`

**Interfaces:**

- Consumes: `paneSecondary` / `registerSecondaryPane` (Task 5), `NavigatorPresentation` `'pane'` (Task 4), `Navigator.Pane` `emphasis` (Task 1).
- Produces: `NavigatorSecondaryPane`, attached as `Navigator.SecondaryPane`, with
  `type NavigatorSecondaryPaneProps = { heading?: ReactNode; emphasis?: NavigatorPaneEmphasis; className?: string; children?: ReactNode }`.

Task 8 attaches `.Search` to it.

- [ ] **Step 1: Write the failing tests**

```tsx
describe('Navigator.SecondaryPane', () => {
  const tree = (value: string) => (
    <Navigator value={value}>
      <Navigator.Primary aria-label='Docs'>
        <Navigator.Item value='/components' href='/components'>
          Components
          <Navigator.Secondary presentation='pane' aria-label='Components'>
            <Navigator.Group label='Actions'>
              <Navigator.Item value='/components/button' href='/components/button'>
                Button
              </Navigator.Item>
            </Navigator.Group>
          </Navigator.Secondary>
        </Navigator.Item>
        <Navigator.Item value='/tokens' href='/tokens'>
          Tokens
        </Navigator.Item>
      </Navigator.Primary>
      <Navigator.Content>
        <Navigator.SecondaryPane />
        <Navigator.Pane role='detail'>Doc</Navigator.Pane>
      </Navigator.Content>
    </Navigator>
  )

  it('renders the active pane section as a list pane', () => {
    const { container } = render(tree('/components/button'))
    const pane = container.querySelector(
      '[data-slot="navigator-secondary-pane"]'
    )!

    expect(pane).toHaveAttribute('data-role', 'list')
    expect(pane).toContainElement(screen.getByRole('link', { name: 'Button' }))
    expect(screen.getByText('Actions')).toBeVisible()
  })

  it('renders nothing when no pane section is active', () => {
    const { container } = render(tree('/tokens'))

    expect(
      container.querySelector('[data-slot="navigator-secondary-pane"]')
    ).toBeNull()
  })

  it('names the pane nav from the secondary declaration', () => {
    render(tree('/components/button'))

    expect(screen.getByRole('navigation', { name: 'Components' })).toBeVisible()
  })
})
```

- [ ] **Step 2: Run to verify they fail**

```bash
pnpm --filter @oztix/roadie-components test -- Navigator --run
```

Expected: FAIL — `Navigator.SecondaryPane` is not a function.

- [ ] **Step 3: Write the component**

Create `packages/components/src/components/Navigator/NavigatorSecondaryPane.tsx`:

```tsx
'use client'

import { type ReactNode, use, useEffect } from 'react'

import { cn } from '@oztix/roadie-core/utils'

import { NavigatorContext } from './NavigatorContext'
import { NavigatorPane } from './NavigatorPane'
import { NavigatorPaneHeader } from './NavigatorPaneHeader'
import { NavigatorPresentationContext } from './NavigatorPresentationContext'
import type { NavigatorPaneEmphasis } from './variants'

export type NavigatorSecondaryPaneProps = {
  /** Optional pane heading, above any filter controls. */
  heading?: ReactNode
  /**
   * Surface treatment, forwarded to the underlying `Navigator.Pane`.
   *
   * @default 'raised'
   */
  emphasis?: NavigatorPaneEmphasis
  className?: string
  /**
   * Filter controls for the pane header — `Navigator.SecondaryPane.Search`, or
   * your own control registering a predicate.
   */
  children?: ReactNode
}

/**
 * Hosts the active `presentation='pane'` section's nav as a list pane. Place it
 * inside `Navigator.Content`, before the detail pane.
 *
 * Explicit rather than rendered automatically by `Navigator.Content`: pane
 * order is meaningful, and `Navigator.Content` is server-safe — reading context
 * there would forfeit that. It mirrors `Navigator.Pane.Header`, which hosts the
 * mobile strip the same way.
 *
 * Renders `null` when no pane section is active.
 */
export function NavigatorSecondaryPane({
  heading,
  emphasis,
  className,
  children
}: NavigatorSecondaryPaneProps) {
  const { paneSecondary, registerSecondaryPane } = use(NavigatorContext)

  useEffect(() => registerSecondaryPane(), [registerSecondaryPane])

  if (paneSecondary === null) return null

  return (
    <NavigatorPane
      role='list'
      emphasis={emphasis}
      data-slot='navigator-secondary-pane'
      className={className}
    >
      <NavigatorPaneHeader heading={heading}>{children}</NavigatorPaneHeader>
      <nav
        data-slot='navigator-secondary-pane-nav'
        aria-label={paneSecondary['aria-label']}
        className={cn('grid gap-0 pb-4', paneSecondary.className)}
      >
        <NavigatorPresentationContext value='pane'>
          {renderPaneChildren(paneSecondary.children)}
        </NavigatorPresentationContext>
      </nav>
    </NavigatorPane>
  )
}

NavigatorSecondaryPane.displayName = 'Navigator.SecondaryPane'
```

`Navigator.Group` owns the `<ul>` around its own items (see Task 4), so the pane must **not** blanket-wrap. `renderPaneChildren` passes `Navigator.Group` children straight through and wraps each run of consecutive ungrouped children in its own `<ul>`:

```tsx
// Groups bring their own list; loose items still need one, and an <li> with
// no list parent is as invalid as a <div> inside a <ul>.
function renderPaneChildren(children: ReactNode) {
  const out: ReactNode[] = []
  let loose: ReactNode[] = []

  const flush = () => {
    if (loose.length === 0) return
    out.push(
      <ul key={`loose-${out.length}`} className='grid gap-0'>
        {loose}
      </ul>
    )
    loose = []
  }

  Children.forEach(children, (child) => {
    if (isValidElement(child) && child.type === NavigatorGroup) {
      flush()
      out.push(child)
      return
    }
    loose.push(child)
  })
  flush()

  return out
}
```

The `data-slot` lands on the pane element because `NavigatorPane` spreads `...props` onto the `ScrollArea` root; it overrides the pane's own `navigator-pane` slot, which is why the tests query `navigator-secondary-pane` for role and containment.

- [ ] **Step 4: Wire the export**

In `Navigator/index.tsx`:

```ts
import { NavigatorSecondaryPane } from './NavigatorSecondaryPane'
```

Add `SecondaryPane: typeof NavigatorSecondaryPane` to the `Navigator` type, assign `Navigator.SecondaryPane = NavigatorSecondaryPane`, and export the props type.

- [ ] **Step 5: Run the suite**

```bash
pnpm --filter @oztix/roadie-components test -- Navigator --run
pnpm typecheck && pnpm lint
```

Expected: all pass, and the dev warning from Task 5 no longer fires for these trees.

- [ ] **Step 6: Commit**

```bash
git add packages/components/src/components/Navigator/
git commit -m "feat(navigator): add Navigator.SecondaryPane host"
```

---

## Task 8: Filter registry and `SecondaryPane.Search`

**Files:**

- Create: `packages/components/src/components/Navigator/NavigatorFilterContext.ts`
- Create: `packages/components/src/components/Navigator/NavigatorSecondaryPaneSearch.tsx`
- Modify: `packages/components/src/components/Navigator/NavigatorSecondaryPane.tsx`
- Modify: `packages/components/src/components/Navigator/NavigatorItem.tsx`
- Modify: `packages/components/src/components/Navigator/NavigatorGroup.tsx`
- Modify: `packages/components/src/components/Navigator/index.tsx`
- Test: `packages/components/src/components/Navigator/Navigator.test.tsx`

**Interfaces:**

- Consumes: `collectItemMetas`, `NavigatorItemMeta`, `flattenText` (Task 4); `NavigatorSecondaryPane` (Task 7).
- Produces:
  - `NavigatorFilterContext` with
    `type NavigatorFilterContextValue = { register: (id: string, predicate: (item: NavigatorItemMeta) => boolean) => void; unregister: (id: string) => void; isVisible: (item: NavigatorItemMeta) => boolean }`.
  - `NavigatorSecondaryPaneSearch`, attached as `Navigator.SecondaryPane.Search`.

**Background — the constraint that makes this work.** Filtering must be *view-only*. A hidden item still appears in the authored children array, so `secondaryDescendantValues` never shrinks and `isBranchActive` never flips. If filtering instead removed children, filtering out the page you are currently on would drop the section from `activePaneSecondary` and unmount the pane you are typing into. Items hide by returning `null` from render — which removes them from the accessibility tree too, so a filtered-out row is not a destination anyone can land on, while leaving the declaration intact.

- [ ] **Step 1: Write the failing tests**

```tsx
describe('Navigator.SecondaryPane filtering', () => {
  const tree = (value: string) => (
    <Navigator value={value}>
      <Navigator.Primary aria-label='Docs'>
        <Navigator.Item value='/components' href='/components'>
          Components
          <Navigator.Secondary presentation='pane' aria-label='Components'>
            <Navigator.Group label='Actions'>
              <Navigator.Item value='/components/button' href='/components/button'>
                Button
              </Navigator.Item>
              <Navigator.Item
                value='/components/icon-button'
                href='/components/icon-button'
                keywords={['icon-button']}
              >
                Icon Button
              </Navigator.Item>
            </Navigator.Group>
            <Navigator.Group label='Forms'>
              <Navigator.Item value='/components/input' href='/components/input'>
                Input
              </Navigator.Item>
            </Navigator.Group>
          </Navigator.Secondary>
        </Navigator.Item>
      </Navigator.Primary>
      <Navigator.Content>
        <Navigator.SecondaryPane>
          <Navigator.SecondaryPane.Search placeholder='Filter components' />
        </Navigator.SecondaryPane>
        <Navigator.Pane role='detail'>Doc</Navigator.Pane>
      </Navigator.Content>
    </Navigator>
  )

  const type = async (text: string) => {
    const field = screen.getByPlaceholderText('Filter components')
    await userEvent.clear(field)
    await userEvent.type(field, text)
  }

  it('narrows rows to label matches', async () => {
    render(tree('/components/button'))
    await type('inp')

    expect(screen.queryByRole('link', { name: 'Button' })).toBeNull()
    expect(screen.getByRole('link', { name: 'Input' })).toBeVisible()
  })

  it('matches keywords as well as the visible label', async () => {
    render(tree('/components/button'))
    await type('icon-b')

    expect(screen.getByRole('link', { name: 'Icon Button' })).toBeVisible()
    expect(screen.queryByRole('link', { name: 'Input' })).toBeNull()
  })

  it('hides a group whose items all filtered out', async () => {
    render(tree('/components/button'))
    await type('inp')

    expect(screen.queryByText('Actions')).toBeNull()
    expect(screen.getByText('Forms')).toBeVisible()
  })

  it('shows an empty state when nothing matches', async () => {
    render(tree('/components/button'))
    await type('zzzz')

    expect(screen.getByText('No matches')).toBeVisible()
  })

  it('keeps the pane mounted when the active item is filtered out', async () => {
    const { container } = render(tree('/components/button'))
    await type('inp')

    expect(
      container.querySelector('[data-slot="navigator-secondary-pane"]')
    ).toBeTruthy()
    expect(screen.getByRole('link', { name: /Components/ })).toHaveClass(
      'text-strong'
    )
  })

  it('clears the field from the clear button', async () => {
    render(tree('/components/button'))
    await type('inp')
    await userEvent.click(screen.getByRole('button', { name: 'Clear filter' }))

    expect(screen.getByRole('link', { name: 'Button' })).toBeVisible()
  })
})
```

Ensure `userEvent` is imported in the test file:

```tsx
import userEvent from '@testing-library/user-event'
```

- [ ] **Step 2: Run to verify they fail**

```bash
pnpm --filter @oztix/roadie-components test -- Navigator --run
```

Expected: FAIL — `Navigator.SecondaryPane.Search` is not a function.

- [ ] **Step 3: Write the filter context**

Create `packages/components/src/components/Navigator/NavigatorFilterContext.ts`:

```ts
'use client'

import { createContext } from 'react'

import type { NavigatorItemMeta } from './collectItemMetas'

export type NavigatorFilterPredicate = (item: NavigatorItemMeta) => boolean

export type NavigatorFilterContextValue = {
  /** Add or replace a named predicate. Re-registering the same id replaces it. */
  register: (id: string, predicate: NavigatorFilterPredicate) => void
  unregister: (id: string) => void
  /** True when every registered predicate passes. */
  isVisible: (item: NavigatorItemMeta) => boolean
}

/**
 * The secondary pane's filter registry. Any control inside the pane header can
 * register a predicate; an item shows when all of them pass. Search is the
 * first control, not the mechanism — a status select or a category toggle
 * registers its own predicate and needs no change here.
 *
 * `null` outside a filterable pane, which means "everything is visible".
 */
export const NavigatorFilterContext =
  createContext<NavigatorFilterContextValue | null>(null)
```

- [ ] **Step 4: Own the registry in the pane**

In `NavigatorSecondaryPane.tsx`, add the state and provider. Predicates live in a ref-backed `Map` with a version counter, so registering does not depend on identity-stable callbacks:

```tsx
  const predicates = useRef(new Map<string, NavigatorFilterPredicate>())
  const [version, setVersion] = useState(0)

  const filter = useMemo<NavigatorFilterContextValue>(
    () => ({
      register: (id, predicate) => {
        predicates.current.set(id, predicate)
        setVersion((n) => n + 1)
      },
      unregister: (id) => {
        predicates.current.delete(id)
        setVersion((n) => n + 1)
      },
      isVisible: (item) =>
        [...predicates.current.values()].every((predicate) => predicate(item))
    }),
    // `version` is the dependency on purpose: it is what makes a re-registered
    // predicate produce a new context value and re-render every subscriber.
    [version]
  )
```

Compute the empty state from the same metas the items will use:

```tsx
  const metas = useMemo(
    () => collectItemMetas(paneSecondary?.children),
    [paneSecondary]
  )
  const hasMatches = metas.length === 0 || metas.some(filter.isVisible)
```

Note `paneSecondary` may be `null` on the first render before the hoisting effect runs; `collectItemMetas` must tolerate `undefined` children, which `Children.forEach` already does.

Wrap **both the pane header and the nav** in the provider, and add the empty line — after the `if (paneSecondary === null) return null` guard, which must now sit **below** all hooks. The header matters: `Search` is passed through `children` into `Navigator.Pane.Header`, so a provider wrapping only the `<nav>` leaves the control outside it, permanently reading `filter === null` and never registering a predicate.

```tsx
      <NavigatorFilterContext value={filter}>
        <nav
          data-slot='navigator-secondary-pane-nav'
          aria-label={paneSecondary['aria-label']}
          className={cn('grid gap-0 pb-4', paneSecondary.className)}
        >
          <NavigatorPresentationContext value='pane'>
            {renderPaneChildren(paneSecondary.children)}
          </NavigatorPresentationContext>
          {hasMatches ? null : (
            <p className='px-4 py-3 text-sm text-subtle'>No matches</p>
          )}
        </nav>
      </NavigatorFilterContext>
```

Move the early return so every hook runs unconditionally: compute `paneSecondary === null` into a `const isHidden` and return `null` after the hooks, or hoist the whole body into an inner component. Prefer the former — one guard line after the last hook.

- [ ] **Step 5: Hide filtered items and empty groups**

In `NavigatorItem.tsx`, inside the `presentation === 'pane'` branch, before returning the row:

```tsx
  if (presentation === 'pane') {
    const meta = {
      value,
      label: flattenText(children),
      keywords: _keywords ?? []
    }
    // View-only: the element still exists in the authored tree, so the walks
    // that drive branch-activity never see the list shrink. Returning null
    // also drops it from the accessibility tree, which a `hidden` class
    // would not.
    if (filter !== null && !filter.isVisible(meta)) return null
    …
```

`children` here is the item's raw children — flatten those, not `label`, since `splitSecondary` has already removed any nested `Secondary` and `label` is an array. Either is correct for text; use `label` for consistency with what the row renders:

```tsx
      label: flattenText(label),
```

Read the context near the other `use` calls:

```tsx
  const filter = use(NavigatorFilterContext)
```

In `NavigatorGroup.tsx`, hide a group with no surviving items:

```tsx
  const filter = use(NavigatorFilterContext)
  const metas = collectItemMetas(
    presentation === 'pane' ? [{ label, children }] : null
  )
```

That is awkward — instead walk the group's own children directly:

```tsx
  const filter = use(NavigatorFilterContext)

  if (presentation === 'pane' && filter !== null) {
    const metas = collectItemMetas(children).map((meta) => ({
      ...meta,
      group: flattenText(label)
    }))
    if (metas.length > 0 && !metas.some(filter.isVisible)) return null
  }
```

Place it after the `strip` early return so the strip is never filtered.

- [ ] **Step 6: Write the search control**

Create `packages/components/src/components/Navigator/NavigatorSecondaryPaneSearch.tsx`:

```tsx
'use client'

import { use, useEffect, useId, useState } from 'react'

import { MagnifyingGlassIcon, XIcon } from '@phosphor-icons/react'

import { cn } from '@oztix/roadie-core/utils'

import { IconButton } from '../Button/IconButton'
import { Input } from '../Input'
import { NavigatorFilterContext } from './NavigatorFilterContext'

export type NavigatorSecondaryPaneSearchProps = {
  placeholder?: string
  'aria-label'?: string
  className?: string
}

const matches = (haystack: string, needle: string) =>
  haystack.toLowerCase().includes(needle)

/**
 * Text filter for a `Navigator.SecondaryPane`. Matches, case-insensitively,
 * against each item's visible label and its `keywords`.
 */
export function NavigatorSecondaryPaneSearch({
  placeholder = 'Filter',
  'aria-label': ariaLabel = 'Filter',
  className
}: NavigatorSecondaryPaneSearchProps) {
  const filter = use(NavigatorFilterContext)
  const id = useId()
  const [query, setQuery] = useState('')

  useEffect(() => {
    if (filter === null) return
    const needle = query.trim().toLowerCase()
    if (needle === '') {
      filter.unregister(id)
      return
    }
    filter.register(id, (item) =>
      matches(item.label, needle) ||
      item.keywords.some((keyword) => matches(keyword, needle))
    )
    return () => filter.unregister(id)
    // `filter` identity changes on every registration; depending on it would
    // loop. The registry is a stable target held in a ref inside the pane.
  }, [query, id])

  return (
    <div
      data-slot='navigator-secondary-pane-search'
      className={cn('relative flex items-center', className)}
    >
      <MagnifyingGlassIcon
        weight='bold'
        aria-hidden='true'
        className='pointer-events-none absolute left-2 size-4 text-subtle'
      />
      <Input
        type='search'
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder={placeholder}
        aria-label={ariaLabel}
        className='pl-8'
      />
      {query === '' ? null : (
        <IconButton
          emphasis='subtler'
          size='sm'
          aria-label='Clear filter'
          onClick={() => setQuery('')}
          className='absolute right-1'
        >
          <XIcon weight='bold' className='size-4' />
        </IconButton>
      )}
    </div>
  )
}

NavigatorSecondaryPaneSearch.displayName = 'Navigator.SecondaryPane.Search'
```

- [ ] **Step 7: Attach and export**

In `Navigator/index.tsx`, mirror the `NavigatorPane.Header` pattern:

```ts
const NavigatorSecondaryPane =
  NavigatorSecondaryPaneBase as typeof NavigatorSecondaryPaneBase & {
    Search: typeof NavigatorSecondaryPaneSearch
  }
NavigatorSecondaryPane.Search = NavigatorSecondaryPaneSearch
```

Export `NavigatorSecondaryPaneSearchProps`, `NavigatorFilterContext`, and the `NavigatorFilterContextValue` / `NavigatorFilterPredicate` types — a consumer writing a second filter control needs all three.

- [ ] **Step 8: Run the suite**

```bash
pnpm --filter @oztix/roadie-components test -- Navigator --run
pnpm typecheck && pnpm lint
```

- [ ] **Step 9: Commit**

```bash
git add packages/components/src/components/Navigator/
git commit -m "feat(navigator): add filter registry and SecondaryPane.Search"
```

---

## Task 9: RSC canary and Navigator documentation

**Files:**

- Modify: `docs/src/app/debug/rsc-smoke/` (the `NavigatorCanary`)
- Modify: `docs/src/app/components/navigator/page.mdx`
- Test: manual, via the canary route

**Interfaces:**

- Consumes: every API from Tasks 1–8.
- Produces: nothing consumed by later tasks.

- [ ] **Step 1: Extend the canary**

Read the existing canary first:

```bash
ls docs/src/app/debug/rsc-smoke/
```

Add a case that declares a `presentation='pane'` `Navigator.Secondary` containing a `Navigator.Group` with two items, rendered from the same server-component path the existing cases use. The canary's job is to prove the identity walk fails loudly rather than silently — follow whatever assertion shape the existing cases use, adding `Group` to the set of types checked.

- [ ] **Step 2: Document the additions**

In `docs/src/app/components/navigator/page.mdx`, hand-edited (never Prettier), add a `## Secondary presentation` section after the existing secondary-nav content, containing:

The decision guidance, as `<Guideline>` / `<Guideline.Do>` / `<Guideline.Dont>`:

> **Rail** — a handful of flat sub-pages with short labels. Keeps the section's structure visible next to its siblings and costs no layout.
>
> **Pane** — the list is long enough to scroll independently, needs grouping, needs filtering, or its rows carry more than a label. Costs a column, so it suits sections a user dwells in rather than passes through.
>
> Rough dividing line: under ~10 flat items, rail. Grouped, filterable, or thumbnail-bearing, pane. A heuristic, not a rule.

A `tsx-live` example of a pane section with a `Group`, `leading` media and `SecondaryPane.Search`.

A presentation matrix table:

| Prop | rail | strip | pane |
| --- | --- | --- | --- |
| `icon` | ✓ | ✓ | — |
| `leading` | — | — | ✓ |
| `badge` | ✓ | ✓ | — |
| `keywords` | — | — | ✓ |
| `Group` label | ✓ | screen-reader only | ✓ sticky |

A `## Pane surfaces` section covering `emphasis`, stating plainly that a pane's `subtler` is **no surface at all**, unlike Card's.

A `## Mobile panes` section covering `hideOnMobile` and the two landing patterns as a pair — empty detail, and auto-select-first. For the second, say explicitly: render the first child's content at the landing URL, do not redirect. A desktop-only redirect changes the URL, so resizing across `md` strands the user on a child route, the back button collects a duplicate entry, and under `output: 'export'` there is no server to do it.

Note the `:has()` requirement (Baseline since Firefox 121).

A `## Custom filters` section with a worked second control — a category toggle registering its own predicate against `NavigatorItemMeta.group`:

````mdx
```tsx
function CategoryFilter({ category }: { category: string }) {
  const filter = use(NavigatorFilterContext)
  const id = useId()

  useEffect(() => {
    if (!filter) return
    if (category === 'All') {
      filter.unregister(id)
      return
    }
    filter.register(id, (item) => item.group === category)
    return () => filter.unregister(id)
  }, [category, id])

  return null
}
```
````

- [ ] **Step 3: Verify PropsDefinitions picks everything up**

```bash
pnpm --filter @oztix/roadie-components build
pnpm --filter docs build
```

Then visit `/components/navigator` and confirm the props table lists `emphasis`, `hideOnMobile`, `presentation`, `leading`, `keywords`, `children` on `Pane.Header`, and the new `Navigator.Group` / `Navigator.SecondaryPane` / `Navigator.SecondaryPane.Search` sections.

If a prop is missing, it is almost certainly typed as `VariantProps<typeof x>['key']` — inline the literal union and export a sibling type alias.

- [ ] **Step 4: Commit**

```bash
git add docs/src/app/components/navigator/page.mdx docs/src/app/debug/rsc-smoke/
git commit -m "docs(navigator): document secondary presentation, pane surfaces and filters"
```

---

## Task 10: Docs component manifest and skeleton extraction

**Files:**

- Create: `docs/src/lib/component-manifest.ts`
- Create: `docs/src/components/ComponentSkeleton.tsx`
- Modify: `docs/src/app/layout.tsx`
- Modify: `docs/src/app/components/page.tsx`

**Interfaces:**

- Consumes: nothing from earlier tasks.
- Produces:
  - `type ComponentSummary = { name: string; title: string; description: string; category: string }`
  - `type ComponentCategory = { name: string; components: ComponentSummary[] }`
  - `CATEGORY_ORDER: string[]`
  - `getComponentManifest(): Promise<ComponentSummary[]>`
  - `groupByCategory(components: ComponentSummary[]): ComponentCategory[]`
  - `ComponentSkeleton({ name })` and `ComponentThumbnail({ name })` from `docs/src/components/ComponentSkeleton.tsx`

Task 11 consumes all of these.

**Background.** The filesystem walk that parses each component's `export const metadata` exists twice — `docs/src/app/layout.tsx:99-148` and `docs/src/app/components/page.tsx:26-98` — with `categoryOrder` written out in both. The pane declaration needs this data on the client, so unifying it is directly in the way rather than opportunistic.

- [ ] **Step 1: Write the manifest**

Create `docs/src/lib/component-manifest.ts`:

```ts
import { readFile, readdir } from 'fs/promises'
import { join } from 'path'

export type ComponentSummary = {
  name: string
  title: string
  description: string
  category: string
}

export type ComponentCategory = {
  name: string
  components: ComponentSummary[]
}

export const CATEGORY_ORDER = [
  'Actions',
  'Forms',
  'Navigation',
  'Overlays',
  'Content',
  'Typography',
  'Layout'
]

const COMPONENTS_DIR = join(process.cwd(), 'src/app/components')

async function readMetadata(dir: string): Promise<ComponentSummary | null> {
  for (const file of ['page.mdx', 'page.tsx']) {
    try {
      const content = await readFile(join(COMPONENTS_DIR, dir, file), 'utf-8')
      const match = content.match(/export const metadata = ({[\s\S]*?})/m)
      const fallback = {
        name: dir,
        title: dir,
        description: '',
        category: 'Other'
      }
      if (!match) return fallback
      try {
        const parsed = new Function(`return ${match[1]}`)()
        if (parsed.hidden) return null
        return { ...fallback, ...parsed, name: dir }
      } catch {
        console.error(`Error parsing metadata for ${dir}`)
        return fallback
      }
    } catch {
      // Try the next filename.
    }
  }
  return null
}

/** Every visible component, sorted by category order then title. */
export async function getComponentManifest(): Promise<ComponentSummary[]> {
  const entries = await readdir(COMPONENTS_DIR, { withFileTypes: true })
  const components = await Promise.all(
    entries.filter((entry) => entry.isDirectory()).map((entry) => readMetadata(entry.name))
  )

  return components
    .filter((component): component is ComponentSummary => component !== null)
    .sort((a, b) => {
      const order =
        categoryRank(a.category) - categoryRank(b.category)
      return order !== 0 ? order : a.title.localeCompare(b.title)
    })
}

const categoryRank = (category: string) => {
  const index = CATEGORY_ORDER.indexOf(category)
  return index === -1 ? CATEGORY_ORDER.length : index
}

/** The same list, grouped — the shape the secondary pane declares from. */
export function groupByCategory(
  components: ComponentSummary[]
): ComponentCategory[] {
  const groups: ComponentCategory[] = []
  for (const component of components) {
    const name = component.category || 'Other'
    const existing = groups.find((group) => group.name === name)
    if (existing) existing.components.push(component)
    else groups.push({ name, components: [component] })
  }
  return groups
}
```

`getComponentManifest` already sorts by category rank, so `groupByCategory` preserves that order without re-sorting.

- [ ] **Step 2: Extract the skeletons**

Create `docs/src/components/ComponentSkeleton.tsx`. Move `Skel` and `ComponentSkeleton` **verbatim** from `docs/src/app/components/page.tsx:139-462` — every case, unchanged — and export `ComponentSkeleton`. Then add the thumbnail wrapper:

```tsx
/**
 * A component skeleton at list-row scale. The skeletons are authored at
 * roughly `w-40` for a card, so the wrapper scales rather than each of the
 * thirty-odd cases being resized.
 */
export function ComponentThumbnail({ name }: { name: string }) {
  return (
    <span className='grid h-12 w-16 place-content-center overflow-hidden rounded-md bg-subtle'>
      <span className='scale-[0.32]'>
        <ComponentSkeleton name={name} />
      </span>
    </span>
  )
}
```

`<span>`s, not `<div>`s — this renders inside `NavigatorItem`'s leading `<span>`, which is inside an `<a>`.

- [ ] **Step 3: Point the layout at the manifest**

In `docs/src/app/layout.tsx`, delete the inline `ComponentMetadata` type and the whole `entries` / `components` / `validComponents` block (lines 99-148), and replace with:

```ts
const validComponents = await getComponentManifest()
```

Delete the local `categoryOrder` array and the `componentsByCategory` reduce, replacing the sorted-categories loop's source with `groupByCategory(validComponents)`. The rest of that block — the `componentItems` array with its `label: true` markers and per-category overview lookups — stays for now; Task 11 replaces it.

Add the import:

```ts
import { getComponentManifest, groupByCategory } from '@/lib/component-manifest'
```

- [ ] **Step 4: Point the landing page at the shared skeleton**

In `docs/src/app/components/page.tsx`, delete the local `Skel` and `ComponentSkeleton` definitions and the duplicated FS walk, importing instead:

```ts
import { ComponentSkeleton } from '@/components/ComponentSkeleton'
import { getComponentManifest, groupByCategory } from '@/lib/component-manifest'
```

Keep the card grid rendering for now — Task 11 replaces the page body. This step is only about removing the duplication, so the page must render identically.

- [ ] **Step 5: Verify no visual change**

```bash
pnpm --filter docs build
```

Then with the dev server running, confirm `/components` still renders the card grid with every skeleton, and the rail's Components sub-nav is unchanged.

- [ ] **Step 6: Commit**

```bash
git add docs/src/lib/component-manifest.ts docs/src/components/ComponentSkeleton.tsx docs/src/app/layout.tsx docs/src/app/components/page.tsx
git commit -m "refactor(docs): extract the component manifest and skeletons"
```

---

## Task 11: Docs Components section becomes a pane

**Files:**

- Modify: `docs/src/components/Navigation.tsx`
- Modify: `docs/src/app/layout.tsx`
- Modify: `docs/src/app/components/page.tsx`

**Interfaces:**

- Consumes: every Navigator addition (Tasks 1–8); `ComponentCategory`, `groupByCategory`, `ComponentThumbnail` (Task 10).
- Produces: nothing consumed by later tasks.

- [ ] **Step 1: Pass grouped components to the shell**

In `docs/src/app/layout.tsx`, keep the Components entry in `navigationItems` — `FooterNav` reads `items` for prev/next and must keep working — but stop emitting the `label: true` pseudo-items, which `Navigator.Group` replaces. Then pass the grouped list separately:

```tsx
  const items = await getNavigationItems()
  const componentCategories = groupByCategory(await getComponentManifest())

  …
        <DocsNavigator items={items} componentCategories={componentCategories}>
          {children}
        </DocsNavigator>
```

- [ ] **Step 2: Declare the pane section**

In `docs/src/components/Navigation.tsx`, add to `NavigationProps`:

```ts
  componentCategories: ComponentCategory[]
```

In the section loop, special-case the Components section's children. Replace the existing `subItems.length > 0 ? <Navigator.Secondary …>` block for that one section:

```tsx
              {sectionPrefix === '/components' ? (
                <Navigator.Secondary
                  presentation='pane'
                  aria-label='Components'
                >
                  {componentCategories.map((category) => (
                    <Navigator.Group key={category.name} label={category.name}>
                      {category.components.map((component) => (
                        <Navigator.Item
                          key={component.name}
                          value={`/components/${component.name}`}
                          href={`/components/${component.name}`}
                          keywords={[component.name]}
                          leading={<ComponentThumbnail name={component.name} />}
                        >
                          {component.title}
                        </Navigator.Item>
                      ))}
                    </Navigator.Group>
                  ))}
                </Navigator.Secondary>
              ) : subItems.length > 0 ? (
                <Navigator.Secondary aria-label={`${section.title} pages`}>
                  {/* unchanged */}
                </Navigator.Secondary>
              ) : null}
```

- [ ] **Step 3: Mount the pane and rework the content panes**

Still in `Navigation.tsx`, replace the `Navigator.Content` body. `OnThisPage` can now be authored last, in its natural reading position — `hideOnMobile` keeps it out of the stack, so the `lg:order-2` / `lg:order-1` compensation goes away:

```tsx
      <Navigator.Content>
        {showAppearance ? (
          <Navigator.Pane role='detail'>
            <AppearancePane />
          </Navigator.Pane>
        ) : (
          <>
            <Navigator.SecondaryPane className='md:w-[18rem]'>
              <Navigator.SecondaryPane.Search placeholder='Filter components' />
            </Navigator.SecondaryPane>
            <Navigator.Pane
              role='detail'
              collapseNav
              hideOnMobile={pathname === '/components'}
              className='scroll-pt-6'
            >
              <Navigator.Pane.Header
                backHref={
                  pathname.startsWith('/components/') ? '/components' : undefined
                }
              />
              <div
                id='docs-content'
                className='mx-auto grid w-full max-w-[56rem] gap-0 px-6 py-6 md:px-10 md:py-12 lg:px-12 [&_:is(h1,h2,h3,h4)]:scroll-mt-6'
              >
                {children}
                <FooterNav items={items} />
              </div>
            </Navigator.Pane>
            {pathname !== '/' ? (
              <Navigator.Pane
                role='list'
                emphasis='subtler'
                hideOnMobile
                className='w-[14rem] max-2xl:hidden'
              >
                <div className='px-4 py-6'>
                  <OnThisPage />
                </div>
              </Navigator.Pane>
            ) : null}
          </>
        )}
      </Navigator.Content>
```

`Navigator.SecondaryPane` renders `null` outside `/components`, so no branch is needed around it.

The detail pane's `Navigator.Pane.Header` now takes `backHref` only on a component sub-page — that is what turns on the mobile Back caret and the desktop Close X. Everywhere else it keeps its original job of hosting the mobile section strip.

- [ ] **Step 4: Replace the landing page**

`docs/src/app/components/page.tsx` becomes:

```tsx
import { CubeIcon } from '@phosphor-icons/react/ssr'

import { EmptyState } from '@oztix/roadie-components/empty-state'

export const metadata = {
  title: 'Components',
  description:
    'Accessible React components built on Base UI, styled with intent and emphasis.'
}

export default function ComponentsPage() {
  return (
    <EmptyState>
      <EmptyState.IconTile>
        <CubeIcon weight='bold' />
      </EmptyState.IconTile>
      <EmptyState.Title>Select a component</EmptyState.Title>
      <EmptyState.Description>
        Browse the list, or filter it by name.
      </EmptyState.Description>
    </EmptyState>
  )
}
```

`EmptyState` attaches `Root`, `IconTile`, `Illustration`, `Title`, `Description` and `Actions`; `EmptyState.IconTile` forwards to `IconTile`, which takes a bare icon as children. The `./empty-state` subpath export exists in `packages/components/package.json`.

- [ ] **Step 5: Build and check**

```bash
pnpm --filter @oztix/roadie-components build
pnpm --filter docs build
pnpm typecheck && pnpm lint
```

- [ ] **Step 6: Commit**

```bash
git add docs/src/
git commit -m "feat(docs): browse components from a filterable secondary pane"
```

---

## Task 12: Browser verification and the solutions entry

**Files:**

- Create: `docs/solutions/<category>/navigator-secondary-pane.md`
- Modify: whatever Tasks 1–11 broke, with a regression test each

**Interfaces:**

- Consumes: everything.
- Produces: the record.

- [ ] **Step 1: Run the full gate**

```bash
pnpm test
pnpm typecheck
pnpm lint
pnpm --filter @oztix/roadie-components build
pnpm --filter docs build
```

All five must pass before touching a browser. If `pnpm typecheck` passes locally but CI disagrees:

```bash
find . -name "*.tsbuildinfo" -not -path "*/node_modules/*" -delete && pnpm typecheck
```

- [ ] **Step 2: Verify at ~390px**

With the docs dev server running on `http://localhost:9614`, use the chrome-devtools MCP. The window floors at 500px, so constrain the content or read computed widths rather than trusting the window size.

Confirm, at `/components`:

1. The list pane is the visible pane. No "Select a component" empty state.
2. Tapping a row navigates to that component's doc, which slides in over the list.
3. The doc pane header shows a **Back caret**.
4. Back returns to the list **with its scroll position intact** — the list pane stayed mounted off-canvas.
5. Scrolling the list collapses nothing (the list pane does not set `collapseNav`); scrolling a doc does collapse the tab bar.
6. Group headers pin below the filter field, not underneath it.
7. Typing in the filter narrows rows live; empty groups vanish with their headers; the clear button appears and works.
8. Filtering out the component you are currently on does **not** unmount the pane.

- [ ] **Step 3: Verify at ~1300px**

1. Three columns: rail, 18rem list pane, doc pane. No On-this-page.
2. The selected row is highlighted and carries `aria-current="page"`.
3. The doc pane header shows a **Close X**; clicking it returns to `/components` and the empty state.
4. The rail's Components item stays highlighted on `/components/button`.
5. `tsx-live` code previews are readable — this is the width that drove the `2xl` decision.

- [ ] **Step 4: Verify at ~1600px**

1. Four columns, with On-this-page transparent against the sunken frame — no card surface, border or shadow.
2. The doc pane still reads comfortably.

- [ ] **Step 5: Verify nothing else regressed**

The stacking change touches every Navigator consumer, so check the surfaces this work never looked at:

1. `/foundations/*`, `/tokens/*`, `/roadie-widgets/*` — rail secondary nav nests as before, mobile strip appears in the pane header, panes stack and pop.
2. `/` — no On-this-page pane, no secondary pane.
3. `/components/navigator` — the docs page's own embedded Navigator examples.
4. `/debug/rsc-smoke` — the canary reports the same as before, plus the new `Group` case.
5. Toggle Appearance — the appearance pane still replaces the content panes cleanly.

- [ ] **Step 6: Add regression tests for anything found**

Anything broken and reproducible in jsdom gets a test in `Navigator.test.tsx`. Behaviour that only exists in a real browser — sticky offsets, the `ResizeObserver` measurement, the `:has()` stack, overscroll — gets a note in the solutions doc instead. Do not fake it with a jsdom test that asserts nothing real.

- [ ] **Step 7: Write the solutions entry**

Pick the category by looking at what exists:

```bash
ls docs/solutions/
```

Write the entry with the standard YAML frontmatter (`module`, `tags`, `problem_type`), covering:

- **View-only filtering is mandatory.** Removing filtered children shrinks `secondaryDescendantValues`, which flips `isBranchActive` false, which drops the section from `activePaneSecondary` and unmounts the pane mid-keystroke. Items hide by returning `null`; the declaration stays.
- **Mobile stacking is participation, not position.** `:last-child` cannot express "ignore the hidden pane", and `display:none` does not hand back the top slot. `isTopPane` and the `:has()` selector implement one rule in two places and must stay in sync.
- **`Navigator.Group` is a named exception to the one-level walk.** Matched by identity like `Secondary` and `Item`; still fails silently in a server component.
- **The pane header's height is measured, not constant** — it varies with heading, children and the mobile strip — and `ResizeObserver` must be guarded because jsdom lacks it.
- **`emphasis='subtler'` on a pane means no surface**, unlike Card's.

- [ ] **Step 8: Final gate and commit**

```bash
pnpm test && pnpm typecheck && pnpm lint && pnpm --filter docs build
```

```bash
git add docs/solutions/ packages/components/src/components/Navigator/
git commit -m "docs(solutions): record the secondary-pane constraints"
```

---

## Self-review notes

**Spec coverage.** Every design-doc section maps to a task: `presentation` → 5; `Group` → 4; `leading`/`keywords` → 6; `SecondaryPane` → 7; filter registry + `Search` → 8; `Pane` `emphasis` → 1; `Pane.Header` `children` → 3; sticky offsets → 3 (the var) + 4 (the consumer); `hideOnMobile` and the stacking rule → 2; landing patterns → 9 (docs) + 11 (docs site); manifest and skeleton extraction → 10; widths → 11; documentation → 9; testing and risks → 12.

**Known ordering dependency.** Task 4 creates `collectItemMetas.ts` but its `collectItemMetas` function imports `NavigatorItem`, and `NavigatorItem` gains `keywords` only in Task 6. The read is `props.keywords ?? []` against a locally-declared type, so Task 4 typechecks on its own and needs no revision in Task 6.

**Deliberately deferred.** Filter state in the URL; filter controls beyond `Search`; a hook exposing the active section's first destination; pane presentation for Foundations or Widgets; changes to the skeleton illustrations.
