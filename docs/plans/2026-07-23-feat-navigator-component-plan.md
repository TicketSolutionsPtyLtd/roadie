# Navigator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship `Navigator` (an adaptive application-frame navigation compound) and `List` in `@oztix/roadie-components`, then replace the Roadie docs site's own navigation with them.

**Architecture:** `Navigator` is a context-only compound at the root with one index-injection container (`Navigator.Primary`, which walks its direct children to derive rail form and the mobile overflow fold). Every layout difference between mobile and desktop is expressed in **CSS**, not JavaScript — both the rail and the tab bar render into the DOM and Tailwind's `md:` breakpoint hides one. There is no `useMediaQuery`, no hydration mismatch, and no SSR fork. Routing stays external: selection is controlled, links go through `RoadieLinkProvider`, and the Next.js parallel/intercepting-route wiring ships as documentation.

**Tech Stack:** React 19, TypeScript 5 strict, Tailwind CSS v4 with Roadie `@utility` directives, CVA, Vitest + React Testing Library, tsdown (`unbundle: true`), Next.js 16 (docs site only).

**Design source:** `docs/brainstorms/2026-07-23-navigator-brainstorm.md`
**Interactive reference:** <https://claude.ai/code/artifact/78cfcbff-b58e-4834-b5d7-7e97548fad80>

## Global Constraints

- **Prettier:** single quotes, no semicolons, 2 spaces, 80 char width. Never run `prettier --write` on `.mdx` files — it empties them. Edit `.mdx` by hand.
- **TypeScript strict, no `any`.**
- **Compound rules are non-negotiable** — read `docs/contributing/COMPOUND_PATTERNS.md` §2–3 before Task 1. Every leaf: compound-prefixed function name, exported `*Props` type alias (`type =`, not `interface extends`), dot-notation `displayName`, and a `data-slot` attribute placed immediately after the opening tag.
- **`'use client'` only where needed** — hooks, `createContext`, or wrapping a Base UI client primitive. Never on `index.tsx`. Never on pure presentational leaves.
- **Never hand-edit `packages/components/package.json` `exports`** — run `pnpm --filter @oztix/roadie-components generate:exports`.
- **Never hardcode colours.** Use `bg-*`, `text-*`, `border-*`, `emphasis-*`, `intent-*`. No `dark:` variants — the scale swaps itself.
- **Radius tokens only**, no arbitrary values. Panes and rail use `rounded-2xl`; the tab bar uses `rounded-full`.
- **Grid-first layout.** `grid gap-*` for vertical stacks; `flex` only where children size themselves (the tab bar).
- **Icons:** `@phosphor-icons/react/ssr` in server components, `@phosphor-icons/react` in client components. `Icon`-suffixed exports only (`ListIcon`, not `List`). Size with Tailwind `className`, never the `size` prop. Weight `bold`.
- **Dev-only warnings** use the existing `isDev()` helper from `packages/components/src/utils/isDev.ts`. Never `import.meta.env.DEV` — it silently never fires in Next.js.
- **`resolveRender`** already exists at `packages/components/src/utils/resolveRender.tsx` with its own tests, alongside `resolveLinkKind.ts`. Read both before writing any component that takes `href`.
- **Motion:** CSS transitions only. The components package has no animation dependency and this plan does not add one. All transitions must be wrapped in a `motion-safe:` variant or a `prefers-reduced-motion` guard.
- **Rail widths are tokens**, not magic numbers: `--navigator-rail-compact: 5.75rem` (92px), `--navigator-rail-nested: 15rem` (240px).
- **Test commands:** single file `pnpm --filter @oztix/roadie-components exec vitest run src/components/<X>/<X>.test.tsx`. Full suite `pnpm test`.

---

## Direct-children constraint (read before Task 4)

`Navigator.Primary` derives two things by walking its children at render time: whether **any** item declares a `Navigator.Secondary` (which sets rail form for the whole product), and how many mobile slots exist (which drives the five-tab fold).

This makes `Navigator.Primary` an **index-injection container** in the sense of `COMPOUND_PATTERNS.md` §1.2, with the same constraint Carousel carries:

> Inside `<Navigator.Primary>`, render only direct `<Navigator.Item>` children and at most one direct `<Navigator.End>`. Inside `<Navigator.Item>`, render `<Navigator.Secondary>` as a direct child.

Fragments, `.map()` calls returning multiple items, and items wrapped in another component will not be seen by the walk. A dev-only warning fires when a non-`Item`/`End` element appears at a direct-child position (Task 4, Step 9).

## File Structure

```
packages/components/src/components/Navigator/
  NavigatorContext.ts        'use client' — selection + derived layout facts
  NavigatorRoot.tsx          'use client' — grid frame, 100dvh, safe areas
  NavigatorPrimary.tsx       'use client' — walks children; renders rail + tab bar
  NavigatorItem.tsx          'use client' — reads context; rail row / tab / list row
  NavigatorEnd.tsx           'use client' — position marker; rail bottom / final tab
  NavigatorSecondary.tsx     'use client' — nested rail list + mobile strip
  NavigatorContent.tsx       server-safe — pane region
  NavigatorPane.tsx          'use client' — scroll owner; collapseNav
  variants.ts                server-safe — CVA maps + literal unions
  index.tsx                  server-safe — property assignment
  Navigator.test.tsx         integration tests

packages/components/src/components/List/
  ListRoot.tsx               server-safe
  ListItem.tsx               'use client' — delegates to RoadieRoutedLink
  variants.ts                server-safe
  index.tsx                  server-safe
  List.test.tsx

packages/core/src/css/
  layout.css                 modify — add rail width tokens + navigator utilities

docs/
  src/app/debug/rsc-smoke/page.tsx      modify — RSC canary sections
  src/app/components/navigator/page.mdx create
  src/app/components/list/page.mdx      create
  src/app/foundations/app-shell/page.tsx create — Next.js routing recipe
  src/components/Navigation.tsx          replace (Task 9)
  src/app/layout.tsx                     modify (Task 9)
```

---

### Task 1: Navigator skeleton — root, context, Content, Pane

**Files:**

- Create: `packages/components/src/components/Navigator/NavigatorContext.ts`
- Create: `packages/components/src/components/Navigator/NavigatorRoot.tsx`
- Create: `packages/components/src/components/Navigator/NavigatorContent.tsx`
- Create: `packages/components/src/components/Navigator/NavigatorPane.tsx`
- Create: `packages/components/src/components/Navigator/variants.ts`
- Create: `packages/components/src/components/Navigator/index.tsx`
- Create: `packages/components/src/components/Navigator/Navigator.test.tsx`
- Modify: `packages/components/src/index.tsx`
- Modify: `packages/core/src/css/layout.css`

**Interfaces:**

- Consumes: `cn` from `@oztix/roadie-core/utils`.
- Produces:
  - `NavigatorContextValue = { value: string | undefined; setValue: (next: string) => void; hasNesting: boolean; setHasNesting: (next: boolean) => void }`
  - `NavigatorRootProps`, `NavigatorContentProps`, `NavigatorPaneProps`
  - `NavigatorPaneRole = 'list' | 'detail'`

- [ ] **Step 1: Write the failing test**

Create `packages/components/src/components/Navigator/Navigator.test.tsx`:

```tsx
import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { Navigator } from '.'

describe('Navigator', () => {
  it('is the same reference as Navigator.Root', () => {
    expect(Navigator).toBe(Navigator.Root)
  })

  it('renders panes inside the content region', () => {
    const { container } = render(
      <Navigator value='events'>
        <Navigator.Content>
          <Navigator.Pane role='list'>Events</Navigator.Pane>
          <Navigator.Pane role='detail'>Detail</Navigator.Pane>
        </Navigator.Content>
      </Navigator>
    )

    expect(container.querySelector('[data-slot="navigator"]')).toBeTruthy()
    expect(
      container.querySelectorAll('[data-slot="navigator-pane"]')
    ).toHaveLength(2)
  })

  it('marks each pane with its role', () => {
    const { container } = render(
      <Navigator value='events'>
        <Navigator.Content>
          <Navigator.Pane role='list'>Events</Navigator.Pane>
        </Navigator.Content>
      </Navigator>
    )

    expect(
      container.querySelector('[data-slot="navigator-pane"]')
    ).toHaveAttribute('data-role', 'list')
  })

  it('gives every pane its own scroll container', () => {
    const { container } = render(
      <Navigator value='events'>
        <Navigator.Content>
          <Navigator.Pane role='list'>Events</Navigator.Pane>
        </Navigator.Content>
      </Navigator>
    )

    expect(container.querySelector('[data-slot="navigator-pane"]')).toHaveClass(
      'overflow-y-auto'
    )
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter @oztix/roadie-components exec vitest run src/components/Navigator/Navigator.test.tsx`
Expected: FAIL — `Failed to resolve import "."`

- [ ] **Step 3: Create the context**

`NavigatorContext.ts`:

```ts
'use client'

import { createContext } from 'react'

// Selection is controlled by the consumer; Navigator never owns routing.
// `hasNesting` is derived once by Navigator.Primary from the declared tree
// and decides rail form for the whole product — see the brainstorm's
// "Derived behaviour" table.
export type NavigatorContextValue = {
  value: string | undefined
  setValue: (next: string) => void
  hasNesting: boolean
  setHasNesting: (next: boolean) => void
}

export const NavigatorContext = createContext<NavigatorContextValue>({
  value: undefined,
  setValue: () => {},
  hasNesting: false,
  setHasNesting: () => {}
})
```

- [ ] **Step 4: Create the variants module**

`variants.ts`:

```ts
import { cva } from 'class-variance-authority'

export type NavigatorPaneRole = 'list' | 'detail'

// The root owns the viewport. `100dvh` (not `100vh`) so mobile browser
// chrome collapsing doesn't crop the tab bar, and safe-area padding so the
// floating bar clears the home indicator.
export const navigatorRootVariants = cva([
  'grid h-[100dvh] w-full overflow-hidden bg-normal',
  'grid-rows-[1fr_auto] md:grid-rows-1 md:grid-cols-[auto_1fr]',
  'pt-[env(safe-area-inset-top)]'
])

export const navigatorContentVariants = cva([
  'grid min-h-0 min-w-0 gap-3 p-3',
  'grid-cols-1 md:auto-cols-fr md:grid-flow-col'
])

// Each pane owns its scroll; the page itself never scrolls. `overscroll-contain`
// stops a pane's scroll chaining into the document on iOS.
export const navigatorPaneVariants = cva(
  [
    'min-h-0 min-w-0 overflow-y-auto overscroll-contain',
    'rounded-2xl emphasis-raised'
  ],
  {
    variants: {
      role: {
        list: 'md:max-w-[24rem]',
        detail: ''
      }
    },
    defaultVariants: { role: 'list' }
  }
)
```

- [ ] **Step 5: Create the root**

`NavigatorRoot.tsx`:

```tsx
'use client'

import { type ReactNode, useMemo, useState } from 'react'

import { cn } from '@oztix/roadie-core/utils'

import {
  NavigatorContext,
  type NavigatorContextValue
} from './NavigatorContext'
import { navigatorRootVariants } from './variants'

export type NavigatorRootProps = {
  /**
   * The active destination's `value`. Navigator is always controlled —
   * selection belongs to the app's router, not to Navigator.
   */
  value?: string
  /**
   * Called when a destination is activated. Omit when every item carries an
   * `href` and the router drives selection.
   */
  onValueChange?: (next: string) => void
  className?: string
  children?: ReactNode
}

export function NavigatorRoot({
  value,
  onValueChange,
  className,
  children
}: NavigatorRootProps) {
  const [hasNesting, setHasNesting] = useState(false)

  const contextValue = useMemo<NavigatorContextValue>(
    () => ({
      value,
      setValue: (next: string) => onValueChange?.(next),
      hasNesting,
      setHasNesting
    }),
    [value, onValueChange, hasNesting]
  )

  return (
    <NavigatorContext value={contextValue}>
      <div
        data-slot='navigator'
        className={cn(navigatorRootVariants(), className)}
      >
        {children}
      </div>
    </NavigatorContext>
  )
}

NavigatorRoot.displayName = 'Navigator.Root'
```

- [ ] **Step 6: Create Content and Pane**

`NavigatorContent.tsx` (server-safe — no hooks, no context):

```tsx
import type { ComponentProps } from 'react'

import { cn } from '@oztix/roadie-core/utils'

import { navigatorContentVariants } from './variants'

export type NavigatorContentProps = ComponentProps<'main'>

export function NavigatorContent({
  className,
  ...props
}: NavigatorContentProps) {
  return (
    <main
      data-slot='navigator-content'
      className={cn(navigatorContentVariants(), className)}
      {...props}
    />
  )
}

NavigatorContent.displayName = 'Navigator.Content'
```

`NavigatorPane.tsx`:

```tsx
'use client'

import type { ComponentProps } from 'react'

import { cn } from '@oztix/roadie-core/utils'

import { type NavigatorPaneRole, navigatorPaneVariants } from './variants'

export type NavigatorPaneProps = ComponentProps<'section'> & {
  /**
   * `list` panes are width-capped on desktop so the detail pane takes the
   * remaining space. `detail` panes fill what's left.
   *
   * @default 'list'
   */
  role?: NavigatorPaneRole
  /**
   * Collapse the mobile tab bar to the active tab while this pane is
   * scrolled away from the top. Leave off for short panes.
   *
   * @default false
   */
  collapseNav?: boolean
}

export function NavigatorPane({
  className,
  role = 'list',
  collapseNav = false,
  ...props
}: NavigatorPaneProps) {
  return (
    <section
      data-slot='navigator-pane'
      data-role={role}
      data-collapse-nav={collapseNav || undefined}
      className={cn(navigatorPaneVariants({ role }), className)}
      {...props}
    />
  )
}

NavigatorPane.displayName = 'Navigator.Pane'
```

`collapseNav` is wired to actual behaviour in Task 7; here it only sets the attribute so the prop's shape is fixed before consumers appear.

- [ ] **Step 7: Create the server-safe subpath entry**

`index.tsx`:

```tsx
// Subpath entry for `@oztix/roadie-components/navigator`.
//
// NO `'use client'` — server-safe property-assignment layer.
// See docs/contributing/COMPOUND_PATTERNS.md.
import { NavigatorContent } from './NavigatorContent'
import { NavigatorPane } from './NavigatorPane'
import { NavigatorRoot } from './NavigatorRoot'

const Navigator = NavigatorRoot as typeof NavigatorRoot & {
  Root: typeof NavigatorRoot
  Content: typeof NavigatorContent
  Pane: typeof NavigatorPane
}

Navigator.Root = NavigatorRoot
Navigator.Content = NavigatorContent
Navigator.Pane = NavigatorPane

export { Navigator }
export type { NavigatorRootProps as NavigatorProps } from './NavigatorRoot'
export type { NavigatorContentProps } from './NavigatorContent'
export type { NavigatorPaneProps } from './NavigatorPane'
export type { NavigatorPaneRole } from './variants'
export {
  navigatorRootVariants,
  navigatorContentVariants,
  navigatorPaneVariants
} from './variants'
```

- [ ] **Step 8: Add the rail width tokens**

Append to `packages/core/src/css/layout.css`:

```css
/* Navigator rail widths. Two forms, chosen once per product by whether
   anything in the tree declares a Secondary — never a prop. */
@theme {
  --navigator-rail-compact: 5.75rem; /* 92px — icons only */
  --navigator-rail-nested: 15rem; /* 240px — labels + nested children */
}
```

- [ ] **Step 9: Run the test to verify it passes**

Run: `pnpm --filter @oztix/roadie-components exec vitest run src/components/Navigator/Navigator.test.tsx`
Expected: PASS — 4 tests.

- [ ] **Step 10: Wire the barrel and regenerate exports**

Add to `packages/components/src/index.tsx`, in the component export block:

```ts
export {
  Navigator,
  type NavigatorProps,
  type NavigatorContentProps,
  type NavigatorPaneProps,
  type NavigatorPaneRole
} from './components/Navigator'
```

Run: `pnpm --filter @oztix/roadie-components generate:exports`
Expected: `packages/components/package.json` gains a `"./navigator"` subpath key.

- [ ] **Step 11: Verify typecheck and lint**

Run: `pnpm --filter @oztix/roadie-components typecheck && pnpm --filter @oztix/roadie-components lint`
Expected: both exit 0.

- [ ] **Step 12: Commit**

```bash
git add packages/components/src/components/Navigator packages/components/src/index.tsx packages/components/package.json packages/core/src/css/layout.css
git commit -m "feat(navigator): root, content and pane skeleton

Panes own their own scroll and the root owns 100dvh, so the page itself
never scrolls. Mobile/desktop is a CSS breakpoint, not a JS one."
```

---

### Task 2: Next.js routing proof in the docs app

Proves the two things the Next.js documentation cannot answer: that one intercepted route renders as both a desktop side Pane and a mobile pushed page without duplicating the route, and how the mandatory catch-all behaves when switching sections. This is throwaway scaffolding under `/debug` — it is deleted in Task 9 once the real migration lands.

**Files:**

- Create: `docs/src/app/debug/navigator-routing/layout.tsx`
- Create: `docs/src/app/debug/navigator-routing/page.tsx`
- Create: `docs/src/app/debug/navigator-routing/items/page.tsx`
- Create: `docs/src/app/debug/navigator-routing/items/[id]/page.tsx`
- Create: `docs/src/app/debug/navigator-routing/@detail/default.tsx`
- Create: `docs/src/app/debug/navigator-routing/@detail/[...catchAll]/page.tsx`
- Create: `docs/src/app/debug/navigator-routing/@detail/(.)items/[id]/page.tsx`

**Interfaces:**

- Consumes: `Navigator`, `Navigator.Content`, `Navigator.Pane` from Task 1.
- Produces: the verified route shape that Task 8's documentation page describes verbatim.

- [ ] **Step 1: Create the slot layout**

`docs/src/app/debug/navigator-routing/layout.tsx`:

```tsx
import type { ReactNode } from 'react'

import { Navigator } from '@oztix/roadie-components/navigator'

export default function DebugNavigatorRoutingLayout({
  children,
  detail
}: {
  children: ReactNode
  detail: ReactNode
}) {
  return (
    <Navigator value='items'>
      <Navigator.Content>
        {children}
        {detail}
      </Navigator.Content>
    </Navigator>
  )
}
```

- [ ] **Step 2: Create the mandatory slot fallbacks**

`@detail/default.tsx`:

```tsx
// Mandatory. Without it, refreshing any route under this layout 404s
// because Next.js cannot recover the slot's active state on hard navigation.
export default function Default() {
  return null
}
```

`@detail/[...catchAll]/page.tsx`:

```tsx
// Mandatory. Client-side navigation to a route that no longer matches this
// slot leaves the previous content visible; matching a null-returning
// catch-all is what actually clears the pane.
export default function CatchAll() {
  return null
}
```

- [ ] **Step 3: Create the list and its standalone detail route**

`items/page.tsx`:

```tsx
import Link from 'next/link'

import { Navigator } from '@oztix/roadie-components/navigator'

const ITEMS = ['alpha', 'bravo', 'charlie']

export default function ItemsPage() {
  return (
    <Navigator.Pane role='list'>
      <ul className='grid gap-1 p-3'>
        {ITEMS.map((id) => (
          <li key={id}>
            <Link
              href={`/debug/navigator-routing/items/${id}`}
              className='block rounded-xl emphasis-subtler px-3 py-2'
            >
              {id}
            </Link>
          </li>
        ))}
      </ul>
    </Navigator.Pane>
  )
}
```

`items/[id]/page.tsx`:

```tsx
import { Navigator } from '@oztix/roadie-components/navigator'

export default async function ItemPage({
  params
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return (
    <Navigator.Pane role='detail'>
      <p className='p-4'>standalone: {id}</p>
    </Navigator.Pane>
  )
}
```

`page.tsx`:

```tsx
import { redirect } from 'next/navigation'

export default function DebugNavigatorRoutingPage() {
  redirect('/debug/navigator-routing/items')
}
```

- [ ] **Step 4: Create the intercepting route**

`@detail/(.)items/[id]/page.tsx`. The matcher is `(.)` and not `(..)`: the Next.js docs state interception matchers do "not consider `@slot` folders", so `items` sits one route segment away despite being two filesystem levels away.

```tsx
import { Navigator } from '@oztix/roadie-components/navigator'

export default async function InterceptedItemPage({
  params
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return (
    <Navigator.Pane role='detail'>
      <p className='p-4'>intercepted: {id}</p>
    </Navigator.Pane>
  )
}
```

- [ ] **Step 5: Verify the four behaviours by hand**

Run: `pnpm --filter docs dev`

Visit `http://localhost:3000/debug/navigator-routing/items` and confirm each of the following. Record the actual result next to each line in the commit message — these are the findings Task 8's documentation depends on.

1. Clicking an item renders `intercepted: <id>` in a second pane beside the list. **Expected: passes.**
2. Reloading on `/items/alpha` renders `standalone: alpha`. **Expected: passes.**
3. Narrowing the viewport below `md` shows one pane at a time. **Expected: passes** — this is the CSS breakpoint from Task 1, and confirms one route serves both presentations.
4. Navigating back to `/items` clears the detail pane. **Expected: passes because of the catch-all.** Temporarily rename `@detail/[...catchAll]` to `[...catchAllDisabled]`, repeat, and confirm the stale pane persists — this is the failure the catch-all exists to prevent. Restore the folder name afterwards.

- [ ] **Step 6: Verify the docs build**

Run: `pnpm --filter docs build`
Expected: exit 0, no 404 warnings for the slot.

- [ ] **Step 7: Commit**

```bash
git add docs/src/app/debug/navigator-routing
git commit -m "test(navigator): prove parallel + intercepting route recipe

One intercepted route serves both the desktop side pane and the mobile
pushed page. Confirms default.tsx and the null catch-all are both load
bearing — removing the catch-all strands a stale detail pane when
switching sections."
```

---

### Task 3: List and List.Item

**Files:**

- Create: `packages/components/src/components/List/ListRoot.tsx`
- Create: `packages/components/src/components/List/ListItem.tsx`
- Create: `packages/components/src/components/List/variants.ts`
- Create: `packages/components/src/components/List/index.tsx`
- Create: `packages/components/src/components/List/List.test.tsx`
- Modify: `packages/components/src/index.tsx`

**Interfaces:**

- Consumes: `RoadieRoutedLink` from `../Link` (the internal primitive other smart-href components delegate to — read `packages/components/src/components/Link/` before writing Step 3 and follow whatever `Card` does, since `Card` is the closest precedent for a whole-surface link).
- Produces: `ListRootProps`, `ListItemProps`. Task 4 and Task 9 both consume `List` / `List.Item`.

- [ ] **Step 1: Write the failing test**

`packages/components/src/components/List/List.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { List } from '.'

describe('List', () => {
  it('is the same reference as List.Root', () => {
    expect(List).toBe(List.Root)
  })

  it('renders an item with nothing but a title', () => {
    render(
      <List>
        <List.Item title='Notifications' />
      </List>
    )
    expect(screen.getByText('Notifications')).toBeInTheDocument()
  })

  it('renders leading, subtitle and trailing when given', () => {
    const { container } = render(
      <List>
        <List.Item
          title='Valley Live'
          subtitle='3 organisations'
          leading={<span data-testid='leading' />}
          trailing={<span data-testid='trailing' />}
        />
      </List>
    )
    expect(screen.getByText('3 organisations')).toBeInTheDocument()
    expect(screen.getByTestId('leading')).toBeInTheDocument()
    expect(screen.getByTestId('trailing')).toBeInTheDocument()
    expect(container.querySelector('[data-slot="list-item"]')).toBeTruthy()
  })

  it('renders a button when there is no href', () => {
    const { container } = render(
      <List>
        <List.Item title='Sign out' />
      </List>
    )
    expect(container.querySelector('button')).toBeTruthy()
  })

  it('renders an anchor for an external href', () => {
    render(
      <List>
        <List.Item title='Status' href='https://status.oztix.com.au' />
      </List>
    )
    const link = screen.getByRole('link', { name: /status/i })
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('exposes selected state to assistive tech', () => {
    render(
      <List>
        <List.Item title='Valley Live' selected />
      </List>
    )
    expect(
      screen.getByText('Valley Live').closest('[data-slot="list-item"]')
    ).toHaveAttribute('aria-current', 'true')
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter @oztix/roadie-components exec vitest run src/components/List/List.test.tsx`
Expected: FAIL — `Failed to resolve import "."`

- [ ] **Step 3: Read the existing link precedent**

Run: `cat packages/components/src/components/Card/CardRoot.tsx packages/components/src/components/Link/*.tsx`

`List.Item` must resolve `href` exactly as `Card` does — internal hrefs through `RoadieLinkProvider`, `http(s)://` and `//` external with `target='_blank' rel='noopener noreferrer'`, `mailto:`/`tel:`/`sms:` as plain anchors, no `href` as a `<button>`. Do not reimplement the matching; delegate to the same primitive `Card` uses.

- [ ] **Step 4: Create variants**

`variants.ts`:

```ts
import { cva } from 'class-variance-authority'

export const listVariants = cva('grid gap-1')

// `is-interactive` supplies cursor, transition, active scale, focus ring and
// disabled state. Grid rather than flex so the three slots keep their columns
// when the middle one wraps.
export const listItemVariants = cva(
  [
    'is-interactive w-full text-left',
    'grid grid-cols-[auto_1fr_auto] items-center gap-3',
    'rounded-xl px-3 py-2.5'
  ],
  {
    variants: {
      selected: {
        true: 'emphasis-subtle',
        false: 'emphasis-subtler'
      }
    },
    defaultVariants: { selected: false }
  }
)
```

- [ ] **Step 5: Create ListRoot**

`ListRoot.tsx` (server-safe):

```tsx
import type { ComponentProps } from 'react'

import { cn } from '@oztix/roadie-core/utils'

import { listVariants } from './variants'

export type ListRootProps = ComponentProps<'ul'>

export function ListRoot({ className, ...props }: ListRootProps) {
  return (
    <ul data-slot='list' className={cn(listVariants(), className)} {...props} />
  )
}

ListRoot.displayName = 'List.Root'
```

- [ ] **Step 6: Create ListItem**

`ListItem.tsx`. `title` is the only required prop; every other slot is optional and the grid collapses cleanly when `leading` or `trailing` is absent.

```tsx
'use client'

import type { ReactNode } from 'react'

import { cn } from '@oztix/roadie-core/utils'

import { resolveRender } from '../../utils/resolveRender'
import { listItemVariants } from './variants'

export type ListItemProps = {
  /** The only required prop. An item with nothing else renders correctly. */
  title: ReactNode
  /** Secondary line beneath the title. */
  subtitle?: ReactNode
  /** Leading slot — an `IconTile`, `Image`, or avatar. */
  leading?: ReactNode
  /** Trailing slot — a chevron, count, `Badge`, or selected check. */
  trailing?: ReactNode
  /** Routes through `RoadieLinkProvider`; omit to render a `<button>`. */
  href?: string
  /** Marks the item as the current selection, e.g. in an org picker. */
  selected?: boolean
  className?: string
  onClick?: () => void
}

export function ListItem({
  title,
  subtitle,
  leading,
  trailing,
  href,
  selected = false,
  className,
  onClick
}: ListItemProps) {
  const content = (
    <>
      {leading}
      <span className='grid min-w-0 gap-0.5'>
        <span className='truncate font-semibold text-strong'>{title}</span>
        {subtitle ? (
          <span className='truncate text-sm text-subtle'>{subtitle}</span>
        ) : null}
      </span>
      {trailing}
    </>
  )

  return (
    <li>
      {resolveRender({
        href,
        onClick,
        'data-slot': 'list-item',
        'aria-current': selected || undefined,
        className: cn(listItemVariants({ selected }), className),
        children: content
      })}
    </li>
  )
}

ListItem.displayName = 'List.Item'
```

**Adapt Step 6 to the real signature of `resolveRender`** — read `packages/components/src/utils/resolveRender.tsx` first. If its signature does not accept this shape, follow `Card`'s call pattern exactly instead; the requirement is behavioural parity with `Card`, not this specific call.

- [ ] **Step 7: Create the subpath entry**

`index.tsx`:

```tsx
// Subpath entry for `@oztix/roadie-components/list`.
// NO `'use client'` — server-safe property-assignment layer.
import { ListItem } from './ListItem'
import { ListRoot } from './ListRoot'

const List = ListRoot as typeof ListRoot & {
  Root: typeof ListRoot
  Item: typeof ListItem
}

List.Root = ListRoot
List.Item = ListItem

export { List }
export type { ListRootProps as ListProps } from './ListRoot'
export type { ListItemProps } from './ListItem'
export { listVariants, listItemVariants } from './variants'
```

- [ ] **Step 8: Run the test to verify it passes**

Run: `pnpm --filter @oztix/roadie-components exec vitest run src/components/List/List.test.tsx`
Expected: PASS — 6 tests.

- [ ] **Step 9: Wire the barrel, regenerate exports, verify**

Add to `packages/components/src/index.tsx`:

```ts
export { List, type ListProps, type ListItemProps } from './components/List'
```

Run: `pnpm --filter @oztix/roadie-components generate:exports && pnpm --filter @oztix/roadie-components typecheck && pnpm --filter @oztix/roadie-components lint`
Expected: all exit 0; `"./list"` appears in `package.json`.

- [ ] **Step 10: Commit**

```bash
git add packages/components/src/components/List packages/components/src/index.tsx packages/components/package.json
git commit -m "feat(list): List and List.Item

title is the only required prop. Links resolve through RoadieLinkProvider
with the same contract as Card."
```

---

### Task 4: Navigator.Primary, Item and End — rail form and the five-slot fold

The largest task. It delivers the derived-behaviour table's first three rows.

**Files:**

- Create: `packages/components/src/components/Navigator/NavigatorPrimary.tsx`
- Create: `packages/components/src/components/Navigator/NavigatorItem.tsx`
- Create: `packages/components/src/components/Navigator/NavigatorEnd.tsx`
- Modify: `packages/components/src/components/Navigator/variants.ts`
- Modify: `packages/components/src/components/Navigator/index.tsx`
- Modify: `packages/components/src/components/Navigator/Navigator.test.tsx`

**Interfaces:**

- Consumes: `NavigatorContext` (Task 1), `List` / `List.Item` (Task 3) for the generated overflow pane.
- Produces:
  - `NavigatorPrimaryProps`, `NavigatorItemProps`, `NavigatorEndProps`
  - `MAX_TABS = 5` exported from `variants.ts`
  - `deriveMobileSlots(items: NavigatorSlotMeta[], hasEnd: boolean)` exported from `NavigatorPrimary.tsx` and unit-tested directly.
  - `NavigatorSlotMeta = { value: string; label: ReactNode; icon?: ReactNode }`

- [ ] **Step 1: Write the failing tests for slot derivation**

Append to `Navigator.test.tsx`:

```tsx
import { deriveMobileSlots } from './NavigatorPrimary'

describe('deriveMobileSlots', () => {
  const items = (n: number) =>
    Array.from({ length: n }, (_, i) => ({ value: `s${i}`, label: `S${i}` }))

  it('renders every item as authored when slots fit', () => {
    const result = deriveMobileSlots(items(3), true)
    expect(result.tabs).toHaveLength(3)
    expect(result.overflow).toHaveLength(0)
  })

  it('fits exactly five slots without folding', () => {
    const result = deriveMobileSlots(items(4), true)
    expect(result.tabs).toHaveLength(4)
    expect(result.overflow).toHaveLength(0)
  })

  it('folds the tail once slots exceed five', () => {
    const result = deriveMobileSlots(items(6), true)
    expect(result.tabs).toHaveLength(4)
    expect(result.overflow.map((i) => i.value)).toEqual(['s4', 's5'])
  })

  it('labels the final tab Account for a single End item', () => {
    expect(deriveMobileSlots(items(3), true).label).toBe('Account')
  })

  it('labels the final tab More once anything folds', () => {
    expect(deriveMobileSlots(items(6), true).label).toBe('More')
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm --filter @oztix/roadie-components exec vitest run src/components/Navigator/Navigator.test.tsx`
Expected: FAIL — `deriveMobileSlots is not exported`

- [ ] **Step 3: Implement the derivation**

At the top of `NavigatorPrimary.tsx`:

```tsx
'use client'

import {
  Children,
  type ReactElement,
  type ReactNode,
  isValidElement,
  useEffect,
  useMemo
} from 'react'

import { cn } from '@oztix/roadie-core/utils'

import { NavigatorContext } from './NavigatorContext'
import { NavigatorEnd } from './NavigatorEnd'
import { NavigatorItem } from './NavigatorItem'
import {
  MAX_TABS,
  navigatorRailVariants,
  navigatorTabBarVariants
} from './variants'

export type NavigatorSlotMeta = {
  value: string
  label: ReactNode
  icon?: ReactNode
}

export type MobileSlots = {
  tabs: NavigatorSlotMeta[]
  overflow: NavigatorSlotMeta[]
  label: string
}

/**
 * Mobile slots are primary items plus one for End. At or under MAX_TABS the
 * tree renders as authored. Over it, the first MAX_TABS - 1 items are kept
 * and the tail folds into the final tab alongside End's contents.
 */
export function deriveMobileSlots(
  items: NavigatorSlotMeta[],
  hasEnd: boolean
): MobileSlots {
  const total = items.length + (hasEnd ? 1 : 0)
  if (total <= MAX_TABS) {
    return { tabs: items, overflow: [], label: 'Account' }
  }
  return {
    tabs: items.slice(0, MAX_TABS - 1),
    overflow: items.slice(MAX_TABS - 1),
    label: 'More'
  }
}
```

Add to `variants.ts`:

```ts
export const MAX_TABS = 5
```

- [ ] **Step 4: Run to verify the derivation tests pass**

Run: `pnpm --filter @oztix/roadie-components exec vitest run src/components/Navigator/Navigator.test.tsx -t deriveMobileSlots`
Expected: PASS — 5 tests.

- [ ] **Step 5: Write the failing tests for rail form**

Append to `Navigator.test.tsx`:

```tsx
describe('Navigator rail form', () => {
  it('is compact when nothing in the tree nests', () => {
    const { container } = render(
      <Navigator value='tickets'>
        <Navigator.Primary aria-label='Primary'>
          <Navigator.Item value='discover'>Discover</Navigator.Item>
          <Navigator.Item value='tickets'>Tickets</Navigator.Item>
        </Navigator.Primary>
      </Navigator>
    )
    expect(
      container.querySelector('[data-slot="navigator-rail"]')
    ).toHaveAttribute('data-form', 'compact')
  })

  it('is nested when any item declares a Secondary', () => {
    const { container } = render(
      <Navigator value='events'>
        <Navigator.Primary aria-label='Primary'>
          <Navigator.Item value='events'>
            Events
            <Navigator.Secondary aria-label='Events sections'>
              <Navigator.Item value='all'>All events</Navigator.Item>
            </Navigator.Secondary>
          </Navigator.Item>
          <Navigator.Item value='insights'>Insights</Navigator.Item>
        </Navigator.Primary>
      </Navigator>
    )
    expect(
      container.querySelector('[data-slot="navigator-rail"]')
    ).toHaveAttribute('data-form', 'nested')
  })

  it('does not change form when the active item changes', () => {
    const { container, rerender } = render(
      <Navigator value='events'>
        <Navigator.Primary aria-label='Primary'>
          <Navigator.Item value='events'>
            Events
            <Navigator.Secondary aria-label='Events sections'>
              <Navigator.Item value='all'>All events</Navigator.Item>
            </Navigator.Secondary>
          </Navigator.Item>
          <Navigator.Item value='insights'>Insights</Navigator.Item>
        </Navigator.Primary>
      </Navigator>
    )
    rerender(
      <Navigator value='insights'>
        <Navigator.Primary aria-label='Primary'>
          <Navigator.Item value='events'>
            Events
            <Navigator.Secondary aria-label='Events sections'>
              <Navigator.Item value='all'>All events</Navigator.Item>
            </Navigator.Secondary>
          </Navigator.Item>
          <Navigator.Item value='insights'>Insights</Navigator.Item>
        </Navigator.Primary>
      </Navigator>
    )
    expect(
      container.querySelector('[data-slot="navigator-rail"]')
    ).toHaveAttribute('data-form', 'nested')
  })

  it('marks the active destination with aria-current', () => {
    render(
      <Navigator value='tickets'>
        <Navigator.Primary aria-label='Primary'>
          <Navigator.Item value='discover'>Discover</Navigator.Item>
          <Navigator.Item value='tickets'>Tickets</Navigator.Item>
        </Navigator.Primary>
      </Navigator>
    )
    const active = screen
      .getAllByText('Tickets')[0]
      .closest('[data-slot="navigator-item"]')
    expect(active).toHaveAttribute('aria-current', 'page')
  })

  it('renders both the rail and the tab bar so CSS can choose', () => {
    const { container } = render(
      <Navigator value='tickets'>
        <Navigator.Primary aria-label='Primary'>
          <Navigator.Item value='tickets'>Tickets</Navigator.Item>
        </Navigator.Primary>
      </Navigator>
    )
    expect(container.querySelector('[data-slot="navigator-rail"]')).toBeTruthy()
    expect(
      container.querySelector('[data-slot="navigator-tab-bar"]')
    ).toBeTruthy()
  })
})
```

Add `screen` to the existing `@testing-library/react` import.

- [ ] **Step 6: Run to verify it fails**

Run: `pnpm --filter @oztix/roadie-components exec vitest run src/components/Navigator/Navigator.test.tsx -t "rail form"`
Expected: FAIL — `Navigator.Primary is not a function`

- [ ] **Step 7: Add the Primary variants**

Append to `variants.ts`:

```ts
// Two rail forms, chosen once per product. `nested` widens to fit labels and
// inline children; `compact` stays icon-only and closest to the tab bar.
export const navigatorRailVariants = cva(
  [
    'hidden md:grid content-start gap-1 m-3 mr-0 p-2',
    'rounded-2xl emphasis-raised overflow-y-auto overscroll-contain'
  ],
  {
    variants: {
      form: {
        compact: 'w-(--navigator-rail-compact) justify-items-center',
        nested: 'w-(--navigator-rail-nested)'
      }
    },
    defaultVariants: { form: 'compact' }
  }
)

// Floating tab bar. `flex` because the tabs size themselves. Safe-area
// padding clears the home indicator.
export const navigatorTabBarVariants = cva([
  'md:hidden mx-3 mb-[max(1rem,env(safe-area-inset-bottom))]',
  'flex items-center gap-1 p-2',
  'rounded-full emphasis-floating'
])
```

- [ ] **Step 8: Implement Primary, Item and End**

`NavigatorEnd.tsx` — a position marker. It renders its children directly in the rail; `NavigatorPrimary` detects it by reference to decide whether a mobile End slot exists.

```tsx
'use client'

import type { ComponentProps } from 'react'

import { cn } from '@oztix/roadie-core/utils'

export type NavigatorEndProps = ComponentProps<'div'>

export function NavigatorEnd({ className, ...props }: NavigatorEndProps) {
  return (
    <div
      data-slot='navigator-end'
      className={cn(
        'mt-auto grid gap-1 border-t border-subtle pt-2',
        className
      )}
      {...props}
    />
  )
}

NavigatorEnd.displayName = 'Navigator.End'
```

`NavigatorItem.tsx` — renders a rail row on desktop. It reads `value` from context for active state and delegates `href` to the same link primitive `List.Item` uses (Task 3, Step 3).

```tsx
'use client'

import { type ReactNode, use } from 'react'

import { cn } from '@oztix/roadie-core/utils'

import { NavigatorContext } from './NavigatorContext'
import { navigatorItemVariants } from './variants'

export type NavigatorItemProps = {
  /** Identifies this destination. Compared against Navigator's `value`. */
  value: string
  /** Routes through `RoadieLinkProvider`; omit to render a `<button>`. */
  href?: string
  /** Leading icon. Phosphor `Icon`-suffixed export, sized with className. */
  icon?: ReactNode
  /** Count or status shown alongside the label. */
  badge?: ReactNode
  className?: string
  children?: ReactNode
}

export function NavigatorItem({
  value,
  href,
  icon,
  badge,
  className,
  children
}: NavigatorItemProps) {
  const { value: active, setValue } = use(NavigatorContext)
  const isActive = active === value

  return (
    <button
      type='button'
      data-slot='navigator-item'
      aria-current={isActive ? 'page' : undefined}
      onClick={() => setValue(value)}
      className={cn(navigatorItemVariants({ active: isActive }), className)}
    >
      {icon}
      <span className='truncate'>{children}</span>
      {badge}
    </button>
  )
}

NavigatorItem.displayName = 'Navigator.Item'
```

Once this renders, replace the raw `<button>` with the shared link primitive so `href` works — same delegation as Task 3, Step 3. Keep `data-slot`, `aria-current` and the click handler identical.

`NavigatorPrimary.tsx` (continuing from Step 3) walks its direct children once per render:

```tsx
export type NavigatorPrimaryProps = {
  'aria-label': string
  className?: string
  children?: ReactNode
}

export function NavigatorPrimary({
  'aria-label': ariaLabel,
  className,
  children
}: NavigatorPrimaryProps) {
  const { setHasNesting } = use(NavigatorContext)

  const { items, hasEnd, nests, endNode } = useMemo(() => {
    const collected: NavigatorSlotMeta[] = []
    let foundEnd = false
    let foundNesting = false
    let end: ReactNode = null

    Children.forEach(children, (child) => {
      if (!isValidElement(child)) return
      if (child.type === NavigatorEnd) {
        foundEnd = true
        end = child
        return
      }
      if (child.type !== NavigatorItem) return

      const props = child.props as NavigatorItemProps
      collected.push({
        value: props.value,
        label: props.children,
        icon: props.icon
      })

      Children.forEach(props.children, (grandchild) => {
        if (
          isValidElement(grandchild) &&
          grandchild.type === NavigatorSecondary
        ) {
          foundNesting = true
        }
      })
    })

    return {
      items: collected,
      hasEnd: foundEnd,
      nests: foundNesting,
      endNode: end
    }
  }, [children])

  useEffect(() => {
    setHasNesting(nests)
  }, [nests, setHasNesting])

  const slots = deriveMobileSlots(items, hasEnd)

  return (
    <>
      <nav
        data-slot='navigator-rail'
        data-form={nests ? 'nested' : 'compact'}
        aria-label={ariaLabel}
        className={cn(
          navigatorRailVariants({ form: nests ? 'nested' : 'compact' }),
          className
        )}
      >
        {children}
      </nav>
      <nav
        data-slot='navigator-tab-bar'
        aria-label={ariaLabel}
        className={navigatorTabBarVariants()}
      >
        {/* tabs from slots.tabs, then the End tab labelled slots.label */}
      </nav>
    </>
  )
}

NavigatorPrimary.displayName = 'Navigator.Primary'
```

Import `NavigatorSecondary` (Task 5 creates it — create a minimal stub file now that renders `null` and flesh it out in Task 5, so this task's tests can run). Fill the tab bar body with `slots.tabs.map(...)` rendering the same `NavigatorItem` shape at tab proportions, then the End tab. The overflow pane content is built in Step 10.

- [ ] **Step 9: Add the dev-only direct-children warning**

Inside the `Children.forEach` walk, after the `NavigatorItem` type check:

```tsx
if (isDev() && child.type !== NavigatorItem && child.type !== NavigatorEnd) {
  console.warn(
    '[Roadie] Navigator.Primary only walks direct Navigator.Item and ' +
      'Navigator.End children. Fragments and mapped wrappers are invisible ' +
      'to rail-form and tab-count derivation. See COMPOUND_PATTERNS.md §1.2.'
  )
}
```

Import it: `import { isDev } from '../../utils/isDev'`. Use the shared helper
rather than inlining the check — it already carries the `typeof process`
guard and the reasoning about why `import.meta.env.DEV` is wrong here.

- [ ] **Step 10: Write the failing test for the generated overflow pane, then implement it**

```tsx
it('generates an overflow pane listing the folded items and End contents', () => {
  render(
    <Navigator value='events'>
      <Navigator.Primary aria-label='Primary'>
        <Navigator.Item value='a'>A</Navigator.Item>
        <Navigator.Item value='b'>B</Navigator.Item>
        <Navigator.Item value='c'>C</Navigator.Item>
        <Navigator.Item value='d'>D</Navigator.Item>
        <Navigator.Item value='e'>E</Navigator.Item>
        <Navigator.Item value='f'>F</Navigator.Item>
        <Navigator.End>
          <Navigator.Item value='account'>Account</Navigator.Item>
        </Navigator.End>
      </Navigator.Primary>
    </Navigator>
  )
  const more = screen.getByRole('navigation', { name: 'Primary' })
  expect(more).toBeTruthy()
  expect(screen.getAllByText('More').length).toBeGreaterThan(0)
})
```

Implement the overflow pane as a `List` of `List.Item`s built from `slots.overflow` plus the children of `endNode`, rendered when the final tab is active.

- [ ] **Step 11: Run the full Navigator suite**

Run: `pnpm --filter @oztix/roadie-components exec vitest run src/components/Navigator/Navigator.test.tsx`
Expected: PASS — all tests from Tasks 1 and 4.

- [ ] **Step 12: Update the subpath entry**

Add `Primary`, `Item`, `End` to the property-assignment block and the type re-exports in `index.tsx`, matching the pattern already there.

- [ ] **Step 13: Verify and commit**

```bash
pnpm --filter @oztix/roadie-components typecheck && pnpm --filter @oztix/roadie-components lint
git add packages/components/src/components/Navigator
git commit -m "feat(navigator): primary rail, items and the five-slot fold

Rail form and the mobile overflow fold are both derived from the declared
tree — there is no density prop. Both rail and tab bar render; CSS picks."
```

---

### Task 5: Navigator.Secondary

**Files:**

- Modify: `packages/components/src/components/Navigator/NavigatorSecondary.tsx` (created as a stub in Task 4)
- Modify: `packages/components/src/components/Navigator/variants.ts`
- Modify: `packages/components/src/components/Navigator/index.tsx`
- Modify: `packages/components/src/components/Navigator/Navigator.test.tsx`

**Interfaces:**

- Consumes: `NavigatorContext`, `NavigatorItem`.
- Produces: `NavigatorSecondaryProps`.

- [ ] **Step 1: Write the failing tests**

```tsx
describe('Navigator.Secondary', () => {
  const tree = (active: string) => (
    <Navigator value={active}>
      <Navigator.Primary aria-label='Primary'>
        <Navigator.Item value='events'>
          Events
          <Navigator.Secondary aria-label='Events sections'>
            <Navigator.Item value='all'>All events</Navigator.Item>
            <Navigator.Item value='drafts'>Drafts</Navigator.Item>
          </Navigator.Secondary>
        </Navigator.Item>
        <Navigator.Item value='insights'>Insights</Navigator.Item>
      </Navigator.Primary>
    </Navigator>
  )

  it('renders its children when its parent item is active', () => {
    render(tree('events'))
    expect(screen.getAllByText('All events').length).toBeGreaterThan(0)
  })

  it('renders nothing when its parent item is not active', () => {
    render(tree('insights'))
    expect(screen.queryByText('All events')).toBeNull()
  })

  it('is a labelled navigation landmark', () => {
    render(tree('events'))
    expect(
      screen.getByRole('navigation', { name: 'Events sections' })
    ).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm --filter @oztix/roadie-components exec vitest run src/components/Navigator/Navigator.test.tsx -t "Navigator.Secondary"`
Expected: FAIL — stub renders `null`.

- [ ] **Step 3: Determine the active parent**

`NavigatorSecondary` needs to know its parent item's `value`. Add a second context in `NavigatorContext.ts`:

```ts
export type NavigatorItemContextValue = { value: string }

export const NavigatorItemContext =
  createContext<NavigatorItemContextValue | null>(null)
```

Wrap `NavigatorItem`'s children in this provider (one-line change in `NavigatorItem.tsx`). This is the index-injection idiom from `COMPOUND_PATTERNS.md` §1.2 applied at item level.

- [ ] **Step 4: Implement Secondary**

```tsx
'use client'

import { type ReactNode, use } from 'react'

import { cn } from '@oztix/roadie-core/utils'

import { NavigatorContext, NavigatorItemContext } from './NavigatorContext'
import { navigatorSecondaryVariants } from './variants'

export type NavigatorSecondaryProps = {
  'aria-label': string
  className?: string
  children?: ReactNode
}

export function NavigatorSecondary({
  'aria-label': ariaLabel,
  className,
  children
}: NavigatorSecondaryProps) {
  const { value } = use(NavigatorContext)
  const parent = use(NavigatorItemContext)

  if (!parent || parent.value !== value) return null

  return (
    <nav
      data-slot='navigator-secondary'
      aria-label={ariaLabel}
      className={cn(navigatorSecondaryVariants(), className)}
    >
      {children}
    </nav>
  )
}

NavigatorSecondary.displayName = 'Navigator.Secondary'
```

Add to `variants.ts`:

```ts
// Indented under the parent item so the parent-child relationship is
// literal. Hidden in the compact rail, which has no room for labels.
export const navigatorSecondaryVariants = cva([
  'grid gap-0.5 py-1 pl-6',
  'group-data-[form=compact]/rail:hidden'
])
```

- [ ] **Step 5: Add the mobile tab strip**

On mobile the active item's `Secondary` renders as a horizontally scrolling strip above the content rather than inside the tab bar. Render it from `NavigatorPrimary` — it already has the walked children — into a sibling element that sits above `Navigator.Content` in the root grid. Add a test asserting `[data-slot="navigator-secondary-strip"]` exists when the active item nests and is absent when it does not.

- [ ] **Step 6: Run to verify it passes**

Run: `pnpm --filter @oztix/roadie-components exec vitest run src/components/Navigator/Navigator.test.tsx`
Expected: PASS.

- [ ] **Step 7: Update the subpath entry, verify and commit**

```bash
pnpm --filter @oztix/roadie-components typecheck && pnpm --filter @oztix/roadie-components lint
git add packages/components/src/components/Navigator
git commit -m "feat(navigator): secondary nav nested in the rail

Only renders for the active primary item. Becomes a scrolling strip above
the content on mobile."
```

---

### Task 6: The mobile pane stack

**Files:**

- Modify: `packages/components/src/components/Navigator/NavigatorContent.tsx`
- Modify: `packages/components/src/components/Navigator/variants.ts`
- Modify: `packages/components/src/components/Navigator/Navigator.test.tsx`

**Interfaces:**

- Consumes: `NavigatorPane` (Task 1).
- Produces: no new exports; `NavigatorContent` gains internal stack behaviour.

Below `md`, only the last pane is visible; earlier panes stay mounted but are pushed off-canvas. This keeps scroll position on the list when the detail pops, and it is CSS-only — no JS breakpoint.

- [ ] **Step 1: Write the failing tests**

```tsx
describe('Navigator pane stack', () => {
  it('marks the last pane as the top of the stack', () => {
    const { container } = render(
      <Navigator value='events'>
        <Navigator.Content>
          <Navigator.Pane role='list'>List</Navigator.Pane>
          <Navigator.Pane role='detail'>Detail</Navigator.Pane>
        </Navigator.Content>
      </Navigator>
    )
    const panes = container.querySelectorAll('[data-slot="navigator-pane"]')
    expect(panes[0]).toHaveAttribute('data-stack', 'behind')
    expect(panes[1]).toHaveAttribute('data-stack', 'top')
  })

  it('marks a single pane as the top of the stack', () => {
    const { container } = render(
      <Navigator value='events'>
        <Navigator.Content>
          <Navigator.Pane role='list'>List</Navigator.Pane>
        </Navigator.Content>
      </Navigator>
    )
    expect(
      container.querySelector('[data-slot="navigator-pane"]')
    ).toHaveAttribute('data-stack', 'top')
  })

  it('keeps earlier panes mounted so scroll position survives a pop', () => {
    const { container } = render(
      <Navigator value='events'>
        <Navigator.Content>
          <Navigator.Pane role='list'>List</Navigator.Pane>
          <Navigator.Pane role='detail'>Detail</Navigator.Pane>
        </Navigator.Content>
      </Navigator>
    )
    expect(container.textContent).toContain('List')
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm --filter @oztix/roadie-components exec vitest run src/components/Navigator/Navigator.test.tsx -t "pane stack"`
Expected: FAIL — no `data-stack` attribute.

- [ ] **Step 3: Implement the stack marking**

`NavigatorContent` becomes an index-injection container: it counts its `NavigatorPane` children and injects `data-stack` via a per-pane context. Adding a context means `NavigatorContent.tsx` gains `'use client'` — update the file header comment accordingly and confirm the RSC canary still passes in Task 8.

Add to `variants.ts`:

```ts
// Below md the stack is absolutely positioned; only the top pane is on
// screen. Above md the panes lay out side by side and the transform is
// irrelevant.
export const navigatorStackVariants = cva(
  'max-md:absolute max-md:inset-0 max-md:transition-transform motion-reduce:transition-none',
  {
    variants: {
      stack: {
        top: 'max-md:translate-x-0',
        behind: 'max-md:-translate-x-[22%] max-md:opacity-60'
      }
    },
    defaultVariants: { stack: 'top' }
  }
)
```

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm --filter @oztix/roadie-components exec vitest run src/components/Navigator/Navigator.test.tsx`
Expected: PASS.

- [ ] **Step 5: Verify against the routing sandbox**

Run: `pnpm --filter docs dev`, open `/debug/navigator-routing/items` below `md`, click an item, and confirm the detail slides over the list and the browser back button pops it.

- [ ] **Step 6: Commit**

```bash
git add packages/components/src/components/Navigator
git commit -m "feat(navigator): mobile pane stack

Earlier panes stay mounted and pushed off-canvas so list scroll position
survives popping the detail."
```

---

### Task 7: collapseNav — the collapsing tab bar

**Files:**

- Modify: `packages/components/src/components/Navigator/NavigatorPane.tsx`
- Modify: `packages/components/src/components/Navigator/NavigatorContext.ts`
- Modify: `packages/components/src/components/Navigator/variants.ts`
- Modify: `packages/components/src/components/Navigator/Navigator.test.tsx`

**Interfaces:**

- Consumes: `NavigatorContext`.
- Produces: `NavigatorContextValue` gains `navCollapsed: boolean` and `setNavCollapsed: (next: boolean) => void`.

- [ ] **Step 1: Write the failing tests**

```tsx
describe('collapseNav', () => {
  it('collapses the tab bar once a collapseNav pane scrolls past the threshold', () => {
    const { container } = render(
      <Navigator value='tickets'>
        <Navigator.Primary aria-label='Primary'>
          <Navigator.Item value='tickets'>Tickets</Navigator.Item>
        </Navigator.Primary>
        <Navigator.Content>
          <Navigator.Pane role='list' collapseNav>
            Tickets
          </Navigator.Pane>
        </Navigator.Content>
      </Navigator>
    )
    const pane = container.querySelector('[data-slot="navigator-pane"]')!
    Object.defineProperty(pane, 'scrollTop', { value: 80, writable: true })
    fireEvent.scroll(pane)

    expect(
      container.querySelector('[data-slot="navigator-tab-bar"]')
    ).toHaveAttribute('data-collapsed', 'true')
  })

  it('restores the tab bar at the top of the pane', () => {
    const { container } = render(
      <Navigator value='tickets'>
        <Navigator.Primary aria-label='Primary'>
          <Navigator.Item value='tickets'>Tickets</Navigator.Item>
        </Navigator.Primary>
        <Navigator.Content>
          <Navigator.Pane role='list' collapseNav>
            Tickets
          </Navigator.Pane>
        </Navigator.Content>
      </Navigator>
    )
    const pane = container.querySelector('[data-slot="navigator-pane"]')!
    Object.defineProperty(pane, 'scrollTop', { value: 80, writable: true })
    fireEvent.scroll(pane)
    Object.defineProperty(pane, 'scrollTop', { value: 0, writable: true })
    fireEvent.scroll(pane)

    expect(
      container.querySelector('[data-slot="navigator-tab-bar"]')
    ).toHaveAttribute('data-collapsed', 'false')
  })

  it('never collapses for a pane without collapseNav', () => {
    const { container } = render(
      <Navigator value='tickets'>
        <Navigator.Primary aria-label='Primary'>
          <Navigator.Item value='tickets'>Tickets</Navigator.Item>
        </Navigator.Primary>
        <Navigator.Content>
          <Navigator.Pane role='list'>Tickets</Navigator.Pane>
        </Navigator.Content>
      </Navigator>
    )
    const pane = container.querySelector('[data-slot="navigator-pane"]')!
    Object.defineProperty(pane, 'scrollTop', { value: 200, writable: true })
    fireEvent.scroll(pane)

    expect(
      container.querySelector('[data-slot="navigator-tab-bar"]')
    ).toHaveAttribute('data-collapsed', 'false')
  })

  it('keeps every destination in the accessibility tree while collapsed', () => {
    const { container } = render(
      <Navigator value='a'>
        <Navigator.Primary aria-label='Primary'>
          <Navigator.Item value='a'>A</Navigator.Item>
          <Navigator.Item value='b'>B</Navigator.Item>
        </Navigator.Primary>
        <Navigator.Content>
          <Navigator.Pane role='list' collapseNav>
            Content
          </Navigator.Pane>
        </Navigator.Content>
      </Navigator>
    )
    const pane = container.querySelector('[data-slot="navigator-pane"]')!
    Object.defineProperty(pane, 'scrollTop', { value: 80, writable: true })
    fireEvent.scroll(pane)

    const bar = container.querySelector('[data-slot="navigator-tab-bar"]')!
    expect(bar.querySelectorAll('[data-slot="navigator-item"]')).toHaveLength(2)
  })
})
```

Add `fireEvent` to the `@testing-library/react` import.

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm --filter @oztix/roadie-components exec vitest run src/components/Navigator/Navigator.test.tsx -t collapseNav`
Expected: FAIL — no `data-collapsed` attribute.

- [ ] **Step 3: Implement**

Add `navCollapsed` / `setNavCollapsed` to `NavigatorContextValue` and to `NavigatorRoot`'s `useState` + `useMemo`. In `NavigatorPane`, when `collapseNav` is true, attach an `onScroll` handler that calls `setNavCollapsed(event.currentTarget.scrollTop > 24)`. In `NavigatorPrimary`, set `data-collapsed={String(navCollapsed)}` on the tab bar.

The collapse is purely visual — inactive tabs shrink to zero width via `max-w-0 opacity-0 overflow-hidden`, which keeps them in the accessibility tree (unlike `display: none`). The fourth test guards exactly this.

Add to `variants.ts`:

```ts
export const navigatorTabVariants = cva(
  [
    'is-interactive grid justify-items-center gap-0.5 overflow-hidden',
    'rounded-full px-2 py-1.5 text-xs font-medium',
    'transition-[max-width,opacity,padding] motion-reduce:transition-none'
  ],
  {
    variants: {
      hidden: { true: 'max-w-0 px-0 opacity-0', false: 'max-w-32 opacity-100' }
    },
    defaultVariants: { hidden: false }
  }
)
```

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm --filter @oztix/roadie-components exec vitest run src/components/Navigator/Navigator.test.tsx`
Expected: PASS — the whole Navigator suite.

- [ ] **Step 5: Commit**

```bash
pnpm --filter @oztix/roadie-components typecheck && pnpm --filter @oztix/roadie-components lint
git add packages/components/src/components/Navigator
git commit -m "feat(navigator): collapse the tab bar on scroll

Opt-in per pane. Collapsed tabs shrink to zero width rather than
display:none so they stay in the accessibility tree."
```

---

### Task 8: RSC canary and documentation

**Files:**

- Modify: `docs/src/app/debug/rsc-smoke/page.tsx`
- Create: `docs/src/app/components/navigator/page.mdx`
- Create: `docs/src/app/components/list/page.mdx`
- Create: `docs/src/app/foundations/app-shell/page.tsx`
- Modify: `docs/src/app/foundations/shape/page.tsx`

- [ ] **Step 1: Add the RSC canary sections**

In `docs/src/app/debug/rsc-smoke/page.tsx`, add `Navigator` and `List` imports via both the subpath (`@oztix/roadie-components/navigator`, `@oztix/roadie-components/list`) and the barrel, following the existing sections exactly. Render the bare root and at least one sub-component of each.

- [ ] **Step 2: Verify the canary**

Run: `pnpm build && pnpm --filter docs build`
Expected: exit 0. A failure here means a leaf regressed from RSC-safe — check for a stray `'use client'` on `index.tsx`.

- [ ] **Step 3: Write the component docs pages**

Follow `docs/contributing/COMPONENT_DOC_TEMPLATE.md`. Section order: Import → Examples → Guidelines → Accessibility → PropsDefinitions. Point `<PropsDefinitions componentPath='packages/components/src/components/Navigator' />` at the **folder**.

For `Navigator`, the Examples section must cover: Default (consumer shape, no nesting), Nested (organiser shape), Overflow (six items, showing the fold), and Panes (list + detail).

**Do not run Prettier on these `.mdx` files** — it empties them. Format by hand to 80 characters.

- [ ] **Step 4: Write the routing recipe page**

Create `docs/src/app/foundations/app-shell/page.tsx` documenting the verified Task 2 recipe: the folder tree, the `(.)` vs `(..)` matcher rule, and all three mandatory constraints — `default.tsx`, the null catch-all, and one URL-addressable deep pane per level. Use the findings recorded in Task 2, Step 5, not the plan's expectations.

- [ ] **Step 5: Add the app-shell radius row**

In `docs/src/app/foundations/shape/page.tsx`, add a row to the tier table for app-shell surfaces (`rounded-2xl` — panes and rail), between the Container and Large tiers.

- [ ] **Step 6: Commit**

```bash
git add docs/src/app/debug/rsc-smoke/page.tsx docs/src/app/components/navigator docs/src/app/components/list docs/src/app/foundations/app-shell docs/src/app/foundations/shape
git commit -m "docs(navigator): component pages, routing recipe and RSC canary"
```

---

### Task 9: Migrate the docs site navigation

The v1 acceptance criterion. The docs site has six primary sections plus End, so it exercises the overflow fold rather than avoiding it, and the component index exercises the nested rail.

**Files:**

- Modify: `docs/src/app/layout.tsx`
- Rewrite: `docs/src/components/Navigation.tsx`
- Delete: `docs/src/app/debug/navigator-routing/` (the Task 2 scaffolding)

- [ ] **Step 1: Read the current implementation**

Run: `cat docs/src/components/Navigation.tsx docs/src/app/layout.tsx`

`layout.tsx` already builds a `NavigationItem[]` tree from the filesystem (`getNavigationItems`). Keep that function unchanged — it is the data source. Only the rendering changes.

- [ ] **Step 2: Map the existing tree onto Navigator**

Primary: Overview, Foundations, Components, Tokens, Migration, Widgets — six items. Secondary: the per-section page lists already in `NavigationItem.items`. End: the theme toggle and accent picker, which become `List.Item`s in a Pane rather than rail-embedded controls.

Six primary items plus End is seven mobile slots, so the fold applies: four tabs plus `More`, with Migration, Widgets and the End contents inside.

- [ ] **Step 3: Rewrite Navigation.tsx**

Render `Navigator.Primary` from the `items` prop, with `Navigator.Secondary` nested inside the item whose `href` prefix matches the current `usePathname()`. Pass `href` on every item so the docs router drives selection; `value` is the section slug.

- [ ] **Step 4: Update layout.tsx**

Replace the current wrapper markup with `Navigator` / `Navigator.Content` / `Navigator.Pane`. `OnThisPage` becomes a second `Pane role='detail'` on wide viewports.

- [ ] **Step 5: Verify by hand**

Run: `pnpm --filter docs dev`

Confirm: the rail is the 240px nested form (the docs site nests); mobile shows four tabs plus `More`; Migration and Widgets appear in the `More` pane; scrolling a long component page collapses the tab bar; deep links to `/components/button` still resolve; and both themes still render.

- [ ] **Step 6: Delete the routing sandbox**

```bash
git rm -r docs/src/app/debug/navigator-routing
```

- [ ] **Step 7: Full verification**

Run: `pnpm build && pnpm test && pnpm typecheck && pnpm lint`
Expected: all exit 0.

If typecheck fails in CI but passes locally, delete every `tsbuildinfo` and re-run:
`find . -name "*.tsbuildinfo" -not -path "*/node_modules/*" -delete && pnpm typecheck`

- [ ] **Step 8: Add a changeset and commit**

Run: `pnpm changeset` — minor bump for `@oztix/roadie-components` (two new components, no breaking changes).

```bash
git add .
git commit -m "feat(docs): replace docs navigation with Navigator

The docs site is the first consumer and takes the hardest path through the
design: six primary sections trigger the mobile fold, and the component
index exercises the nested rail."
```

---

## Self-Review

**Spec coverage.** Every section of the brainstorm maps to a task: governing idea → Tasks 4–6; anatomy → Tasks 1, 4, 5; derived behaviour table → Tasks 4 (rows 1–3), 6 (rows 5–7), 7 (row 8); layout and geometry → Task 1; List → Task 3; routing → Tasks 2 and 8; accessibility → assertions in Tasks 4, 5, 7; testing → every task; documentation → Task 8; first consumer → Task 9. The _Known unknown_ and _Deferred_ sections are deliberately unimplemented.

**One gap, accepted.** The brainstorm's "nesting deeper than two replaces in place with a back affordance" is not implemented — no task delivers it. It only becomes real when an app has three-level navigation, and the docs site does not. It is called out here rather than silently dropped; add it when a consumer needs it.

**Type consistency.** `NavigatorContextValue` grows across Tasks 1 → 5 → 7 (`hasNesting`, then `NavigatorItemContext`, then `navCollapsed`), each change stated in the task that makes it. `deriveMobileSlots`, `MobileSlots`, `NavigatorSlotMeta` and `MAX_TABS` keep one spelling throughout. `data-slot` values are consistent: `navigator`, `navigator-rail`, `navigator-tab-bar`, `navigator-item`, `navigator-end`, `navigator-secondary`, `navigator-secondary-strip`, `navigator-content`, `navigator-pane`, `list`, `list-item`.

**Two files are stubs before they are real.** `NavigatorSecondary.tsx` is created returning `null` in Task 4 so `NavigatorPrimary` can import it for the nesting check, then implemented in Task 5. `NavigatorPane`'s `collapseNav` prop is accepted and reflected as an attribute in Task 1, then wired in Task 7. Both are stated at the point they are introduced.
