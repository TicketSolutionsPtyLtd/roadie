# ScrollArea component + Navigator.Pane adoption — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a public Roadie `ScrollArea` component wrapping Base UI's ScrollArea, and adopt it in `Navigator.Pane` so panes get a consistent, cross-platform custom scrollbar without losing the sticky pane header, the mobile pane stack, `collapseNav`, or the tap-to-scroll-to-top affordance.

**Architecture:** `ScrollArea` is a standard Roadie Base UI compound — per-file client leaves (`Root`, `Viewport`, `Scrollbar`, `Thumb`, `Content`, `Corner`), a `variants.ts` CVA module, and a server-safe `index.tsx` property-assignment layer. `Navigator.Pane` then renders `ScrollArea` with `render={<section />}` so the pane keeps being the same `<section data-slot="navigator-pane">` element the pane-stack CSS and the `nextElementSibling` sync already depend on; the scroll container moves inward to `ScrollArea.Viewport`, and the pane's two scroll consumers (the `collapseNav` sync and `activePaneScroller`) re-point at a new `viewportRef`.

**Tech Stack:** React 19, `@base-ui/react@1.3.0` (`@base-ui/react/scroll-area`), Tailwind CSS v4 + Roadie utilities, CVA, Vitest + React Testing Library, tsdown (unbundle mode), Next.js 16 MDX docs.

## Global Constraints

- Base UI import must be the per-component subpath: `import { ScrollArea as ScrollAreaPrimitive } from '@base-ui/react/scroll-area'`. Never the package root.
- Every file importing `@base-ui/react/*` or using React client hooks starts with `'use client'`. `index.tsx` must **never** carry `'use client'` — it is the server-safe property-assignment layer.
- Every rendered DOM element carries a `data-slot`, kebab-case from its dot-path: `scroll-area`, `scroll-area-viewport`, `scroll-area-scrollbar`, `scroll-area-thumb`, `scroll-area-content`, `scroll-area-corner`. `data-slot` goes immediately after the opening tag, before `className` and `...props`.
- Prop types for Base UI parts use the type-alias intersection form: `type XProps = ScrollAreaPrimitive.Part.Props & RefAttributes<HTMLDivElement> & VariantProps<typeof xVariants>`. Never `interface extends` on a Base UI part, and never `ComponentProps<typeof X>` (the `check:dts` guard fails the build).
- Function names are compound-prefixed (`ScrollAreaRoot`, not `Root`); `displayName` is dot-notation (`'ScrollArea.Root'`).
- No `as` / `asChild` / `ElementType` API — polymorphism is Base UI's `render` prop only.
- Never hardcode colours. Use Roadie semantic utilities and `var(--intent-*)` custom properties.
- Prettier: single quotes, no semicolons, 2 spaces, 80 cols. Never run `prettier --write` on `.mdx` files — it empties them. Edit MDX by hand.
- Comments are minimal: only quirks, edge cases, workarounds, and *why*. Never restate what the code says.
- Roadie's public API surface must stay RSC-safe: the compound must render from a server component via both the subpath and the root barrel.

---

## Background an implementer needs

**What Base UI's ScrollArea does.** `ScrollArea.Root` renders a `<div>` with inline `position: relative` and injects a hoisted `<style precedence>` element that hides native scrollbars. `ScrollArea.Viewport` renders the actual scroll container with inline `style={{ overflow: 'scroll' }}` and the scrollbar-hiding class. `ScrollArea.Scrollbar` + `ScrollArea.Thumb` draw the custom bar; the Thumb is positioned by Base UI via `transform: translate3d(...)` written directly on the element.

**Two consequences that drive this plan:**

1. **The viewport's `overflow` is an inline style.** A Tailwind class such as `overflow-x-hidden` cannot beat it. Base UI merges consumer props *after* its own defaults, so a consumer `style` prop **does** win. Anywhere Roadie needs to clamp an axis, it must go through `style`, not `className`.
2. **The scroll container is no longer the outer element.** Anything reading `scrollTop`, calling `scrollTo`, or listening for `scroll` must target the viewport.

**Verify the Base UI surface yourself before coding** (paths under `node_modules/.pnpm/@base-ui+react@1.3.0_*/node_modules/@base-ui/react/esm/scroll-area/`):

- `index.parts.d.ts` — the six exported parts.
- `root/ScrollAreaRootProps` — only extra prop is `overflowEdgeThreshold`.
- `scrollbar/ScrollAreaScrollbar.d.ts` — `orientation?: 'vertical' | 'horizontal'`, `keepMounted?: boolean`.
- Data attributes available for styling: `data-scrolling`, `data-hovering`, `data-has-overflow-x`, `data-has-overflow-y`, `data-overflow-y-start`, `data-overflow-y-end`, `data-orientation`.

**Why `Navigator.Pane` is the only adopter in this pass.** It is the surface the brainstorm named and the only one carrying real risk (sticky header, off-canvas stack, scroll listener, imperative scroll). The other Navigator scroll owners — the More overflow pane, the desktop rail, the secondary strip — are deliberately deferred; see "Follow-up (out of scope)" at the end.

---

### Task 1: The `ScrollArea` compound

**Files:**

- Create: `packages/components/src/components/ScrollArea/variants.ts`
- Create: `packages/components/src/components/ScrollArea/ScrollAreaRoot.tsx`
- Create: `packages/components/src/components/ScrollArea/ScrollAreaViewport.tsx`
- Create: `packages/components/src/components/ScrollArea/ScrollAreaContent.tsx`
- Create: `packages/components/src/components/ScrollArea/ScrollAreaScrollbar.tsx`
- Create: `packages/components/src/components/ScrollArea/ScrollAreaThumb.tsx`
- Create: `packages/components/src/components/ScrollArea/ScrollAreaCorner.tsx`
- Create: `packages/components/src/components/ScrollArea/index.tsx`
- Test: `packages/components/src/components/ScrollArea/ScrollArea.test.tsx`
- Modify: `packages/components/src/index.tsx` (barrel re-export)

**Interfaces:**

- Consumes: nothing from earlier tasks.
- Produces:
  - `ScrollArea` — the root function, with `.Root`, `.Viewport`, `.Content`, `.Scrollbar`, `.Thumb`, `.Corner` attached.
  - `ScrollAreaProps`, `ScrollAreaViewportProps`, `ScrollAreaContentProps`, `ScrollAreaScrollbarProps`, `ScrollAreaThumbProps`, `ScrollAreaCornerProps`.
  - `scrollAreaRootVariants`, `scrollAreaViewportVariants`, `scrollAreaScrollbarVariants`, `scrollAreaThumbVariants`, `scrollAreaCornerVariants`.
  - `type ScrollAreaScrollbarOrientation = 'vertical' | 'horizontal'`.
  - DOM contract later tasks rely on: `data-slot="scroll-area"` on the root, `data-slot="scroll-area-viewport"` on the scroll container.

---

- [ ] **Step 1: Write the failing test**

Create `packages/components/src/components/ScrollArea/ScrollArea.test.tsx`:

```tsx
import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { ScrollArea } from '.'

const tree = (
  <ScrollArea>
    <ScrollArea.Viewport>
      <p>Scrollable content</p>
    </ScrollArea.Viewport>
    <ScrollArea.Scrollbar>
      <ScrollArea.Thumb />
    </ScrollArea.Scrollbar>
  </ScrollArea>
)

describe('ScrollArea', () => {
  it('renders the root, viewport, scrollbar and thumb slots', () => {
    const { container } = render(tree)

    expect(container.querySelector('[data-slot="scroll-area"]')).toBeTruthy()
    expect(
      container.querySelector('[data-slot="scroll-area-viewport"]')
    ).toBeTruthy()
    expect(
      container.querySelector('[data-slot="scroll-area-scrollbar"]')
    ).toBeTruthy()
    expect(
      container.querySelector('[data-slot="scroll-area-thumb"]')
    ).toBeTruthy()
  })

  it('renders children inside the viewport', () => {
    const { container, getByText } = render(tree)
    const viewport = container.querySelector('[data-slot="scroll-area-viewport"]')!

    expect(viewport).toContainElement(getByText('Scrollable content'))
  })

  it('defaults the scrollbar to the vertical orientation', () => {
    const { container } = render(tree)

    expect(
      container.querySelector('[data-slot="scroll-area-scrollbar"]')
    ).toHaveAttribute('data-orientation', 'vertical')
  })

  it('renders a horizontal scrollbar when asked', () => {
    const { container } = render(
      <ScrollArea>
        <ScrollArea.Viewport>
          <p>Wide</p>
        </ScrollArea.Viewport>
        <ScrollArea.Scrollbar orientation='horizontal' keepMounted>
          <ScrollArea.Thumb />
        </ScrollArea.Scrollbar>
      </ScrollArea>
    )

    expect(
      container.querySelector('[data-slot="scroll-area-scrollbar"]')
    ).toHaveAttribute('data-orientation', 'horizontal')
  })

  it('swaps the root element via render', () => {
    const { container } = render(
      <ScrollArea render={<section />}>
        <ScrollArea.Viewport>
          <p>Content</p>
        </ScrollArea.Viewport>
      </ScrollArea>
    )
    const root = container.querySelector('[data-slot="scroll-area"]')!

    expect(root.tagName).toBe('SECTION')
  })

  it('lets a consumer override the viewport overflow through style', () => {
    const { container } = render(
      <ScrollArea>
        <ScrollArea.Viewport style={{ overflowX: 'clip' }}>
          <p>Content</p>
        </ScrollArea.Viewport>
      </ScrollArea>
    )
    const viewport = container.querySelector<HTMLElement>(
      '[data-slot="scroll-area-viewport"]'
    )!

    expect(viewport.style.overflowX).toBe('clip')
  })

  it('merges consumer classes onto every part', () => {
    const { container } = render(
      <ScrollArea className='custom-root'>
        <ScrollArea.Viewport className='custom-viewport'>
          <p>Content</p>
        </ScrollArea.Viewport>
        <ScrollArea.Scrollbar className='custom-bar'>
          <ScrollArea.Thumb className='custom-thumb' />
        </ScrollArea.Scrollbar>
      </ScrollArea>
    )

    expect(container.querySelector('[data-slot="scroll-area"]')).toHaveClass(
      'custom-root'
    )
    expect(
      container.querySelector('[data-slot="scroll-area-viewport"]')
    ).toHaveClass('custom-viewport')
    expect(
      container.querySelector('[data-slot="scroll-area-scrollbar"]')
    ).toHaveClass('custom-bar')
    expect(
      container.querySelector('[data-slot="scroll-area-thumb"]')
    ).toHaveClass('custom-thumb')
  })

  it('stands the scrollbar down on coarse pointers', () => {
    const { container } = render(tree)

    expect(
      container.querySelector('[data-slot="scroll-area-scrollbar"]')
    ).toHaveClass('pointer-coarse:hidden')
  })

  it('exposes dot-notation display names', () => {
    expect(ScrollArea.displayName).toBe('ScrollArea.Root')
    expect(ScrollArea.Viewport.displayName).toBe('ScrollArea.Viewport')
    expect(ScrollArea.Scrollbar.displayName).toBe('ScrollArea.Scrollbar')
    expect(ScrollArea.Thumb.displayName).toBe('ScrollArea.Thumb')
    expect(ScrollArea.Content.displayName).toBe('ScrollArea.Content')
    expect(ScrollArea.Corner.displayName).toBe('ScrollArea.Corner')
  })

  it('aliases Root to the bare root', () => {
    expect(ScrollArea.Root).toBe(ScrollArea)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter @oztix/roadie-components test -- ScrollArea`
Expected: FAIL — `Failed to resolve import "." from "src/components/ScrollArea/ScrollArea.test.tsx"`.

- [ ] **Step 3: Write `variants.ts`**

Create `packages/components/src/components/ScrollArea/variants.ts`:

```ts
import { cva } from 'class-variance-authority'

// `relative` matches the inline style Base UI already sets on Root, so the
// scrollbars (absolutely positioned) anchor to the box. `min-h-0 min-w-0` keeps
// the area shrinkable inside a flex/grid parent — without it the content's
// intrinsic size wins and nothing ever scrolls.
export const scrollAreaRootVariants = cva('relative min-h-0 min-w-0')

// Base UI sets `overflow: scroll` inline here and hides the native bar. An
// `overflow-*` Tailwind class cannot beat that — clamp an axis with the `style`
// prop instead. `overscroll-contain` stops a scroll gesture chaining into the
// page on iOS.
export const scrollAreaViewportVariants = cva([
  'size-full overscroll-contain',
  'focus-visible:outline-2 focus-visible:-outline-offset-2',
  'focus-visible:outline-[var(--intent-border-strong)]'
])

export const scrollAreaContentVariants = cva('min-w-0')

export type ScrollAreaScrollbarOrientation = 'vertical' | 'horizontal'

// Idle-hidden, revealed on hover or while scrolling — the macOS overlay
// behaviour, made consistent on Windows and Linux where the native bar is
// always-on and unstyled.
//
// Hidden on coarse pointers. Base UI's scrollbar-hiding CSS suppresses the
// platform's own transient overlay bar, and this thumb is sized for hover
// targeting — it never appears in response to a touch-scroll. Standing down
// on touch hands the affordance back to iOS/Android.
export const scrollAreaScrollbarVariants = cva(
  [
    'flex touch-none p-0.5 select-none pointer-coarse:hidden',
    'opacity-0 data-[hovering]:opacity-100 data-[scrolling]:opacity-100',
    'motion-safe:transition-opacity motion-safe:duration-moderate motion-safe:ease-enter',
    'motion-reduce:transition-none'
  ],
  {
    variants: {
      orientation: {
        vertical: 'w-2.5 justify-center',
        horizontal: 'h-2.5 flex-col items-center'
      }
    },
    defaultVariants: { orientation: 'vertical' }
  }
)

// Base UI writes the thumb's offset as an inline `transform`, so this only
// carries appearance.
export const scrollAreaThumbVariants = cva([
  'flex-1 rounded-full bg-[var(--intent-border-strong)]',
  'motion-safe:transition-colors motion-safe:duration-moderate motion-safe:ease-enter',
  'hover:bg-[var(--intent-bg-inverted)]'
])

export const scrollAreaCornerVariants = cva('bg-transparent')
```

- [ ] **Step 4: Write the leaves**

Create `packages/components/src/components/ScrollArea/ScrollAreaRoot.tsx`:

```tsx
'use client'

import type { RefAttributes } from 'react'

import { ScrollArea as ScrollAreaPrimitive } from '@base-ui/react/scroll-area'

import { cn } from '@oztix/roadie-core/utils'

import { scrollAreaRootVariants } from './variants'

export type ScrollAreaRootProps = ScrollAreaPrimitive.Root.Props &
  RefAttributes<HTMLDivElement>

export function ScrollAreaRoot({ className, ...props }: ScrollAreaRootProps) {
  return (
    <ScrollAreaPrimitive.Root
      data-slot='scroll-area'
      className={cn(scrollAreaRootVariants({ className }))}
      {...props}
    />
  )
}

ScrollAreaRoot.displayName = 'ScrollArea.Root'
```

Create `packages/components/src/components/ScrollArea/ScrollAreaViewport.tsx`:

```tsx
'use client'

import type { RefAttributes } from 'react'

import { ScrollArea as ScrollAreaPrimitive } from '@base-ui/react/scroll-area'

import { cn } from '@oztix/roadie-core/utils'

import { scrollAreaViewportVariants } from './variants'

export type ScrollAreaViewportProps = ScrollAreaPrimitive.Viewport.Props &
  RefAttributes<HTMLDivElement>

/**
 * The scroll container. Read `scrollTop` / call `scrollTo` / listen for
 * `scroll` on **this** element, not on the root.
 */
export function ScrollAreaViewport({
  className,
  ...props
}: ScrollAreaViewportProps) {
  return (
    <ScrollAreaPrimitive.Viewport
      data-slot='scroll-area-viewport'
      className={cn(scrollAreaViewportVariants({ className }))}
      {...props}
    />
  )
}

ScrollAreaViewport.displayName = 'ScrollArea.Viewport'
```

Create `packages/components/src/components/ScrollArea/ScrollAreaContent.tsx`:

```tsx
'use client'

import type { RefAttributes } from 'react'

import { ScrollArea as ScrollAreaPrimitive } from '@base-ui/react/scroll-area'

import { cn } from '@oztix/roadie-core/utils'

import { scrollAreaContentVariants } from './variants'

export type ScrollAreaContentProps = ScrollAreaPrimitive.Content.Props &
  RefAttributes<HTMLDivElement>

/**
 * Optional wrapper that sizes to its content (`min-width: fit-content`) so a
 * horizontally scrolling area measures correctly. Omit it for vertical-only
 * areas — it adds a box that `position: sticky` children would have to escape.
 */
export function ScrollAreaContent({
  className,
  ...props
}: ScrollAreaContentProps) {
  return (
    <ScrollAreaPrimitive.Content
      data-slot='scroll-area-content'
      className={cn(scrollAreaContentVariants({ className }))}
      {...props}
    />
  )
}

ScrollAreaContent.displayName = 'ScrollArea.Content'
```

Create `packages/components/src/components/ScrollArea/ScrollAreaScrollbar.tsx`:

```tsx
'use client'

import type { RefAttributes } from 'react'

import { ScrollArea as ScrollAreaPrimitive } from '@base-ui/react/scroll-area'

import { cn } from '@oztix/roadie-core/utils'

import { scrollAreaScrollbarVariants } from './variants'

export type ScrollAreaScrollbarProps = ScrollAreaPrimitive.Scrollbar.Props &
  RefAttributes<HTMLDivElement>

export function ScrollAreaScrollbar({
  className,
  orientation = 'vertical',
  ...props
}: ScrollAreaScrollbarProps) {
  return (
    <ScrollAreaPrimitive.Scrollbar
      data-slot='scroll-area-scrollbar'
      orientation={orientation}
      className={cn(scrollAreaScrollbarVariants({ orientation, className }))}
      {...props}
    />
  )
}

ScrollAreaScrollbar.displayName = 'ScrollArea.Scrollbar'
```

Create `packages/components/src/components/ScrollArea/ScrollAreaThumb.tsx`:

```tsx
'use client'

import type { RefAttributes } from 'react'

import { ScrollArea as ScrollAreaPrimitive } from '@base-ui/react/scroll-area'

import { cn } from '@oztix/roadie-core/utils'

import { scrollAreaThumbVariants } from './variants'

export type ScrollAreaThumbProps = ScrollAreaPrimitive.Thumb.Props &
  RefAttributes<HTMLDivElement>

export function ScrollAreaThumb({ className, ...props }: ScrollAreaThumbProps) {
  return (
    <ScrollAreaPrimitive.Thumb
      data-slot='scroll-area-thumb'
      className={cn(scrollAreaThumbVariants({ className }))}
      {...props}
    />
  )
}

ScrollAreaThumb.displayName = 'ScrollArea.Thumb'
```

Create `packages/components/src/components/ScrollArea/ScrollAreaCorner.tsx`:

```tsx
'use client'

import type { RefAttributes } from 'react'

import { ScrollArea as ScrollAreaPrimitive } from '@base-ui/react/scroll-area'

import { cn } from '@oztix/roadie-core/utils'

import { scrollAreaCornerVariants } from './variants'

export type ScrollAreaCornerProps = ScrollAreaPrimitive.Corner.Props &
  RefAttributes<HTMLDivElement>

export function ScrollAreaCorner({
  className,
  ...props
}: ScrollAreaCornerProps) {
  return (
    <ScrollAreaPrimitive.Corner
      data-slot='scroll-area-corner'
      className={cn(scrollAreaCornerVariants({ className }))}
      {...props}
    />
  )
}

ScrollAreaCorner.displayName = 'ScrollArea.Corner'
```

- [ ] **Step 5: Write the server-safe `index.tsx`**

Create `packages/components/src/components/ScrollArea/index.tsx`:

```tsx
// Subpath entry for `@oztix/roadie-components/scroll-area`.
//
// NO `'use client'` — server-safe property-assignment layer.
// See docs/contributing/COMPOUND_PATTERNS.md.
import { ScrollAreaContent } from './ScrollAreaContent'
import { ScrollAreaCorner } from './ScrollAreaCorner'
import { ScrollAreaRoot } from './ScrollAreaRoot'
import { ScrollAreaScrollbar } from './ScrollAreaScrollbar'
import { ScrollAreaThumb } from './ScrollAreaThumb'
import { ScrollAreaViewport } from './ScrollAreaViewport'

const ScrollArea = ScrollAreaRoot as typeof ScrollAreaRoot & {
  Root: typeof ScrollAreaRoot
  Viewport: typeof ScrollAreaViewport
  Content: typeof ScrollAreaContent
  Scrollbar: typeof ScrollAreaScrollbar
  Thumb: typeof ScrollAreaThumb
  Corner: typeof ScrollAreaCorner
}

ScrollArea.Root = ScrollAreaRoot
ScrollArea.Viewport = ScrollAreaViewport
ScrollArea.Content = ScrollAreaContent
ScrollArea.Scrollbar = ScrollAreaScrollbar
ScrollArea.Thumb = ScrollAreaThumb
ScrollArea.Corner = ScrollAreaCorner

export { ScrollArea }
export type { ScrollAreaRootProps as ScrollAreaProps } from './ScrollAreaRoot'
export type { ScrollAreaViewportProps } from './ScrollAreaViewport'
export type { ScrollAreaContentProps } from './ScrollAreaContent'
export type { ScrollAreaScrollbarProps } from './ScrollAreaScrollbar'
export type { ScrollAreaThumbProps } from './ScrollAreaThumb'
export type { ScrollAreaCornerProps } from './ScrollAreaCorner'
export type { ScrollAreaScrollbarOrientation } from './variants'
export {
  scrollAreaRootVariants,
  scrollAreaViewportVariants,
  scrollAreaContentVariants,
  scrollAreaScrollbarVariants,
  scrollAreaThumbVariants,
  scrollAreaCornerVariants
} from './variants'
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `pnpm --filter @oztix/roadie-components test -- ScrollArea`
Expected: PASS — 9 tests.

If `it('lets a consumer override the viewport overflow through style')` fails, Base UI is *not* letting the consumer `style` win. Do not work around it in the leaf — stop and re-read `esm/scroll-area/viewport/ScrollAreaViewport.js` around the `style: { overflow: 'scroll' }` default, then adjust Task 4's approach (the pane's horizontal clamp depends on this).

- [ ] **Step 7: Add the barrel re-export**

In `packages/components/src/index.tsx`, add after the `Separator` export block:

```tsx
export {
  ScrollArea,
  scrollAreaRootVariants,
  scrollAreaViewportVariants,
  scrollAreaContentVariants,
  scrollAreaScrollbarVariants,
  scrollAreaThumbVariants,
  scrollAreaCornerVariants,
  type ScrollAreaProps,
  type ScrollAreaViewportProps,
  type ScrollAreaContentProps,
  type ScrollAreaScrollbarProps,
  type ScrollAreaThumbProps,
  type ScrollAreaCornerProps,
  type ScrollAreaScrollbarOrientation
} from './components/ScrollArea'
```

- [ ] **Step 8: Regenerate the subpath exports and verify the build**

Run:

```bash
pnpm --filter @oztix/roadie-components generate:exports
pnpm --filter @oztix/roadie-components build
```

Expected: build succeeds, `check:dts` and `check:exports` pass. Then confirm the subpath and the client directive:

```bash
node -e "console.log(Object.keys(require('./packages/components/package.json').exports).includes('./scroll-area'))"
head -c 13 packages/components/dist/components/ScrollArea/ScrollAreaRoot.js
head -c 13 packages/components/dist/components/ScrollArea/index.js
```

Expected: `true`; then `"use client";`; then anything that is **not** `"use client";` (the index must stay server-safe).

- [ ] **Step 9: Lint, typecheck and commit**

Run:

```bash
pnpm --filter @oztix/roadie-components lint
pnpm --filter @oztix/roadie-components typecheck
```

Expected: both clean.

```bash
git add packages/components/src/components/ScrollArea packages/components/src/index.tsx packages/components/package.json
git commit -m "feat(scroll-area): add ScrollArea compound over Base UI"
```

---

### Task 2: Edge-fade affordance

A scroll hint: the content fades out at whichever edge has more to scroll, and the fade disappears once you reach that end. Base UI already publishes the state — `data-overflow-y-start` / `data-overflow-y-end` (and the `-x-` pair) land on the viewport whenever there is content past that edge — so this is pure CSS driven off attributes that already exist. No measurement, no JS.

**Files:**

- Modify: `packages/components/src/components/ScrollArea/variants.ts` (`scrollAreaViewportVariants`)
- Modify: `packages/components/src/components/ScrollArea/ScrollAreaViewport.tsx`
- Modify: `packages/components/src/components/ScrollArea/index.tsx` (export the new type)
- Modify: `packages/components/src/index.tsx` (barrel re-export of the new type)
- Test: `packages/components/src/components/ScrollArea/ScrollArea.test.tsx`

**Interfaces:**

- Consumes: `ScrollAreaViewport` and `scrollAreaViewportVariants` from Task 1.
- Produces:
  - `ScrollArea.Viewport` gains a `fade` prop: `'none' | 'y' | 'x' | 'both'`, default `'none'`.
  - `export type ScrollAreaFade = 'none' | 'y' | 'x' | 'both'` from `variants.ts`, re-exported from `index.tsx` and the barrel.
  - `--scroll-area-fade-size`, a custom property a consumer can override to change the fade depth.

**Two constraints that shape the implementation:**

1. **The fade must be opt-in, defaulting to `none`.** A mask on the scroll container masks everything it paints — including a `position: sticky` header, which would fade as it pins. `Navigator.Pane` (Task 4) has exactly that header and therefore does **not** opt in. Document the interaction rather than trying to special-case it.
2. **Declaring literal unions inline on the prop.** Do not type `fade` as `VariantProps<typeof scrollAreaViewportVariants>['fade']` — `react-docgen-typescript` can't drill into CVA's conditional types and the prop vanishes from `<PropsDefinitions>`. Inline the union on the prop and export a sibling type alias. See `docs/solutions/build-errors/react-docgen-cva-literal-props.md`.

---

- [ ] **Step 1: Write the failing test**

Append to `packages/components/src/components/ScrollArea/ScrollArea.test.tsx`:

```tsx
describe('ScrollArea edge fade', () => {
  const viewportOf = (container: HTMLElement) =>
    container.querySelector<HTMLElement>('[data-slot="scroll-area-viewport"]')!

  it('applies no mask by default', () => {
    const { container } = render(
      <ScrollArea>
        <ScrollArea.Viewport>
          <p>Content</p>
        </ScrollArea.Viewport>
      </ScrollArea>
    )

    expect(viewportOf(container).className).not.toContain('mask-image')
  })

  it('masks the block axis for fade="y"', () => {
    const { container } = render(
      <ScrollArea>
        <ScrollArea.Viewport fade='y'>
          <p>Content</p>
        </ScrollArea.Viewport>
      </ScrollArea>
    )
    const className = viewportOf(container).className

    expect(className).toContain('to_bottom')
    expect(className).not.toContain('to_right')
  })

  it('masks the inline axis for fade="x"', () => {
    const { container } = render(
      <ScrollArea>
        <ScrollArea.Viewport fade='x'>
          <p>Content</p>
        </ScrollArea.Viewport>
      </ScrollArea>
    )
    const className = viewportOf(container).className

    expect(className).toContain('to_right')
    expect(className).not.toContain('to_bottom')
  })

  it('intersects both masks for fade="both"', () => {
    const { container } = render(
      <ScrollArea>
        <ScrollArea.Viewport fade='both'>
          <p>Content</p>
        </ScrollArea.Viewport>
      </ScrollArea>
    )
    const className = viewportOf(container).className

    expect(className).toContain('to_bottom')
    expect(className).toContain('to_right')
    expect(className).toContain('mask-composite:intersect')
  })

  it('only opens a fade on the edge Base UI reports as overflowing', () => {
    const { container } = render(
      <ScrollArea>
        <ScrollArea.Viewport fade='y'>
          <p>Content</p>
        </ScrollArea.Viewport>
      </ScrollArea>
    )
    const className = viewportOf(container).className

    // The gradient stops sit at 0 until Base UI flags the edge, so a
    // non-overflowing area paints an inert full-opacity mask.
    expect(className).toContain('data-[overflow-y-start]')
    expect(className).toContain('data-[overflow-y-end]')
  })

  it('lets a consumer retune the fade depth', () => {
    const { container } = render(
      <ScrollArea>
        <ScrollArea.Viewport
          fade='y'
          style={{ '--scroll-area-fade-size': '4rem' } as CSSProperties}
        >
          <p>Content</p>
        </ScrollArea.Viewport>
      </ScrollArea>
    )

    expect(
      viewportOf(container).style.getPropertyValue('--scroll-area-fade-size')
    ).toBe('4rem')
  })
})
```

Add `import type { CSSProperties } from 'react'` to the top of the test file.

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter @oztix/roadie-components test -- ScrollArea`
Expected: FAIL — TypeScript rejects the unknown `fade` prop, and the mask assertions find no such classes.

- [ ] **Step 3: Add the fade variant**

In `packages/components/src/components/ScrollArea/variants.ts`, replace `scrollAreaViewportVariants` with:

```ts
export type ScrollAreaFade = 'none' | 'y' | 'x' | 'both'

// The fade is two gradient stops driven off Base UI's overflow-edge data
// attributes. Both stops sit at 0 until the matching edge reports overflow, so
// the mask is inert (fully opaque) when there's nothing past the edge — no
// conditional mask-image, one declaration that both edges write into.
//
// The stops snap rather than animate: they're plain custom properties, and
// Base UI flips the attribute at `overflowEdgeThreshold`. Registering them with
// `@property` to make them transitionable is a deliberate non-goal — the snap
// is at the exact moment the content stops overflowing, where a transition
// would read as lag.
const fadeY = [
  'data-[overflow-y-start]:[--scroll-area-fade-top:var(--scroll-area-fade-size)]',
  'data-[overflow-y-end]:[--scroll-area-fade-bottom:var(--scroll-area-fade-size)]',
  '[mask-image:linear-gradient(to_bottom,transparent_0,black_var(--scroll-area-fade-top),black_calc(100%-var(--scroll-area-fade-bottom)),transparent_100%)]'
]

const fadeX = [
  'data-[overflow-x-start]:[--scroll-area-fade-left:var(--scroll-area-fade-size)]',
  'data-[overflow-x-end]:[--scroll-area-fade-right:var(--scroll-area-fade-size)]',
  '[mask-image:linear-gradient(to_right,transparent_0,black_var(--scroll-area-fade-left),black_calc(100%-var(--scroll-area-fade-right)),transparent_100%)]'
]

// Base UI sets `overflow: scroll` inline here and hides the native bar. An
// `overflow-*` Tailwind class cannot beat that — clamp an axis with the `style`
// prop instead. `overscroll-contain` stops a scroll gesture chaining into the
// page on iOS.
export const scrollAreaViewportVariants = cva(
  [
    'size-full overscroll-contain',
    'focus-visible:outline-2 focus-visible:-outline-offset-2',
    'focus-visible:outline-[var(--intent-border-strong)]',
    // Zero by default so an edge with nothing past it draws no fade.
    '[--scroll-area-fade-size:2rem]',
    '[--scroll-area-fade-top:0px] [--scroll-area-fade-bottom:0px]',
    '[--scroll-area-fade-left:0px] [--scroll-area-fade-right:0px]'
  ],
  {
    variants: {
      fade: {
        none: '',
        y: fadeY,
        x: fadeX,
        both: [
          ...fadeY.slice(0, 2),
          ...fadeX.slice(0, 2),
          '[mask-image:linear-gradient(to_bottom,transparent_0,black_var(--scroll-area-fade-top),black_calc(100%-var(--scroll-area-fade-bottom)),transparent_100%),linear-gradient(to_right,transparent_0,black_var(--scroll-area-fade-left),black_calc(100%-var(--scroll-area-fade-right)),transparent_100%)]',
          '[mask-composite:intersect]'
        ]
      }
    },
    defaultVariants: { fade: 'none' }
  }
)
```

- [ ] **Step 4: Wire the prop through the viewport leaf**

In `packages/components/src/components/ScrollArea/ScrollAreaViewport.tsx`, replace the type and function with:

```tsx
export type ScrollAreaViewportProps = ScrollAreaPrimitive.Viewport.Props &
  RefAttributes<HTMLDivElement> & {
    /**
     * Fade the content out at any edge with more to scroll. `y` fades top and
     * bottom, `x` fades left and right, `both` intersects the two. Override
     * `--scroll-area-fade-size` (default `2rem`) to retune the depth.
     *
     * A mask applies to everything the viewport paints — including a
     * `position: sticky` header, which will fade as it pins. Leave this at
     * `none` for areas with sticky content.
     *
     * @default 'none'
     */
    fade?: ScrollAreaFade
  }

/**
 * The scroll container. Read `scrollTop` / call `scrollTo` / listen for
 * `scroll` on **this** element, not on the root.
 */
export function ScrollAreaViewport({
  className,
  fade,
  ...props
}: ScrollAreaViewportProps) {
  return (
    <ScrollAreaPrimitive.Viewport
      data-slot='scroll-area-viewport'
      className={cn(scrollAreaViewportVariants({ fade, className }))}
      {...props}
    />
  )
}
```

and update its imports:

```tsx
import {
  type ScrollAreaFade,
  scrollAreaViewportVariants
} from './variants'
```

- [ ] **Step 5: Export the type**

In `packages/components/src/components/ScrollArea/index.tsx`, add to the type re-export block:

```ts
export type { ScrollAreaFade } from './variants'
```

and in `packages/components/src/index.tsx`, add `type ScrollAreaFade,` to the `ScrollArea` export block.

- [ ] **Step 6: Run the tests to verify they pass**

Run: `pnpm --filter @oztix/roadie-components test -- ScrollArea`
Expected: PASS — 15 tests.

- [ ] **Step 7: Verify the mask compiles and renders**

jsdom does not evaluate `mask-image`, so the tests above only prove the classes are attached. Prove the CSS in a browser — the arbitrary-value syntax above (underscores for spaces, `calc()` without inner spaces) is exactly where Tailwind v4 arbitrary values go wrong silently.

```bash
pnpm --filter @oztix/roadie-components build
pnpm --filter docs dev
```

Open `/debug/rsc-smoke` (or any page), add a temporary `<ScrollArea.Viewport fade='y'>` block, and confirm in DevTools that the computed `mask-image` is a real gradient and not `none`. If Tailwind dropped it, the class will be absent from the compiled CSS — check `packages/core/src/css/safelist.html` conventions and consider moving the mask declarations into a `@utility` in the core CSS rather than fighting arbitrary-value escaping. Remove the temporary block before committing.

- [ ] **Step 8: Lint, typecheck and commit**

```bash
pnpm --filter @oztix/roadie-components lint
pnpm --filter @oztix/roadie-components typecheck
git add packages/components/src/components/ScrollArea packages/components/src/index.tsx
git commit -m "feat(scroll-area): add opt-in edge-fade scroll affordance"
```

---

### Task 3: RSC canary + docs page

**Files:**

- Modify: `docs/src/app/debug/rsc-smoke/page.tsx`
- Create: `docs/src/app/components/scroll-area/page.mdx`

**Interfaces:**

- Consumes: `ScrollArea` from Task 1 and the `fade` prop from Task 2, via both `@oztix/roadie-components/scroll-area` and the root barrel.
- Produces: nothing later tasks depend on.

Context: the docs component index (`docs/src/app/components/page.tsx`) is generated by reading each folder's `page.mdx` and parsing its `export const metadata`. Adding the folder is the whole registration — there is no sidebar list to edit. Live examples in `tsx-live` fences resolve names from `docs/src/components/CodePreview.tsx`'s `scope`, which already spreads the entire `@oztix/roadie-components` barrel, so the Task 1 barrel export is what makes `<ScrollArea>` available in MDX.

- [ ] **Step 1: Add ScrollArea to the RSC canary**

In `docs/src/app/debug/rsc-smoke/page.tsx`, add to the barrel import block:

```tsx
  ScrollArea as ScrollAreaViaBarrel,
```

(keep the alphabetical order of that named-import list: it goes after `PopoverViaBarrel`).

Add to the subpath imports, after the `RadioGroup` line:

```tsx
import { ScrollArea } from '@oztix/roadie-components/scroll-area'
```

Add a section inside the page's `<main>`, after the last existing `<section>`:

```tsx
<section className='grid gap-4'>
  <h2 className='text-display-ui-3 text-strong'>
    ScrollArea — bare root, <code>.Root</code> alias, and barrel
  </h2>
  <ScrollArea className='h-32 rounded-xl border border-subtle'>
    <ScrollArea.Viewport className='p-3'>
      <p>Subpath, bare root.</p>
    </ScrollArea.Viewport>
    <ScrollArea.Scrollbar>
      <ScrollArea.Thumb />
    </ScrollArea.Scrollbar>
  </ScrollArea>
  <ScrollArea.Root className='h-32 rounded-xl border border-subtle'>
    <ScrollArea.Viewport className='p-3'>
      <p>Subpath, explicit .Root alias.</p>
    </ScrollArea.Viewport>
  </ScrollArea.Root>
  <ScrollAreaViaBarrel className='h-32 rounded-xl border border-subtle'>
    <ScrollAreaViaBarrel.Viewport className='p-3'>
      <p>Root barrel import.</p>
    </ScrollAreaViaBarrel.Viewport>
  </ScrollAreaViaBarrel>
</section>
```

- [ ] **Step 2: Verify the canary builds**

Run: `pnpm --filter docs build`
Expected: build succeeds. A regression here surfaces as `Element type is invalid` at prerender time — that means `index.tsx` picked up a `'use client'` directive it must not have.

- [ ] **Step 3: Write the docs page**

Create `docs/src/app/components/scroll-area/page.mdx` **by hand** (never run Prettier on it). Follow `docs/contributing/COMPONENT_DOC_TEMPLATE.md` — section order Import → Examples → Guidelines → Accessibility → PropsDefinitions:

````mdx
export const metadata = {
  title: 'ScrollArea',
  description: 'A scroll container with a consistent custom scrollbar',
  status: 'beta',
  category: 'Layout',
}

import { PropsDefinitions } from '@/components/PropsDefinitions'

# ScrollArea

A scroll container with a consistent custom scrollbar across platforms.

## Import

```tsx
import { ScrollArea } from '@oztix/roadie-components/scroll-area'
```

## Examples

### Default

The viewport is the scroll container. Give the root a height — it never sizes
itself.

```tsx-live
<ScrollArea className='h-48 rounded-xl border border-subtle'>
  <ScrollArea.Viewport className='p-4'>
    <div className='grid gap-3'>
      {Array.from({ length: 20 }, (_, i) => (
        <p key={i}>Row {i + 1}</p>
      ))}
    </div>
  </ScrollArea.Viewport>
  <ScrollArea.Scrollbar>
    <ScrollArea.Thumb />
  </ScrollArea.Scrollbar>
</ScrollArea>
```

### Horizontal

Wrap the content in `ScrollArea.Content` so it measures at its natural width,
and render a `horizontal` scrollbar.

```tsx-live
<ScrollArea className='rounded-xl border border-subtle'>
  <ScrollArea.Viewport className='p-4'>
    <ScrollArea.Content>
      <div className='flex gap-3'>
        {Array.from({ length: 12 }, (_, i) => (
          <div
            key={i}
            className='grid size-24 shrink-0 place-content-center rounded-lg emphasis-subtle'
          >
            {i + 1}
          </div>
        ))}
      </div>
    </ScrollArea.Content>
  </ScrollArea.Viewport>
  <ScrollArea.Scrollbar orientation='horizontal'>
    <ScrollArea.Thumb />
  </ScrollArea.Scrollbar>
</ScrollArea>
```

### Both axes

Render both scrollbars plus a `Corner` so they don't overlap where they meet.

```tsx-live
<ScrollArea className='h-48 rounded-xl border border-subtle'>
  <ScrollArea.Viewport className='p-4'>
    <ScrollArea.Content>
      <div className='grid w-[48rem] gap-3'>
        {Array.from({ length: 20 }, (_, i) => (
          <p key={i}>A wide row that overflows both axes — row {i + 1}</p>
        ))}
      </div>
    </ScrollArea.Content>
  </ScrollArea.Viewport>
  <ScrollArea.Scrollbar />
  <ScrollArea.Scrollbar orientation='horizontal' />
  <ScrollArea.Corner />
</ScrollArea>
```

### Always-visible scrollbar

`keepMounted` keeps the scrollbar in the DOM even when the viewport doesn't
overflow, so layout doesn't shift when content grows.

```tsx-live
<ScrollArea className='h-48 rounded-xl border border-subtle'>
  <ScrollArea.Viewport className='p-4'>
    <p>Short content — the bar stays mounted.</p>
  </ScrollArea.Viewport>
  <ScrollArea.Scrollbar keepMounted>
    <ScrollArea.Thumb />
  </ScrollArea.Scrollbar>
</ScrollArea>
```

### Edge fade

`fade` softens the content at any edge with more to scroll, and clears once you
reach that end. Override `--scroll-area-fade-size` to retune the depth.

```tsx-live
<ScrollArea className='h-48 rounded-xl border border-subtle'>
  <ScrollArea.Viewport fade='y' className='px-4'>
    <div className='grid gap-3 py-4'>
      {Array.from({ length: 20 }, (_, i) => (
        <p key={i}>Row {i + 1}</p>
      ))}
    </div>
  </ScrollArea.Viewport>
  <ScrollArea.Scrollbar>
    <ScrollArea.Thumb />
  </ScrollArea.Scrollbar>
</ScrollArea>
```

Use `fade='x'` on a horizontal area, or `fade='both'` when either axis can
overflow.

```tsx-live
<ScrollArea className='rounded-xl border border-subtle'>
  <ScrollArea.Viewport fade='x' className='py-4'>
    <ScrollArea.Content>
      <div className='flex gap-3 px-4'>
        {Array.from({ length: 12 }, (_, i) => (
          <div
            key={i}
            className='grid size-24 shrink-0 place-content-center rounded-lg emphasis-subtle'
          >
            {i + 1}
          </div>
        ))}
      </div>
    </ScrollArea.Content>
  </ScrollArea.Viewport>
  <ScrollArea.Scrollbar orientation='horizontal'>
    <ScrollArea.Thumb />
  </ScrollArea.Scrollbar>
</ScrollArea>
```

### Sticky content

`position: sticky` works against the viewport, so a sticky header pins to the
top of the scroll container. Leave `fade` at `none` here — the mask applies to
everything the viewport paints, so a top fade would fade the header as it pins.

```tsx-live
<ScrollArea className='h-48 rounded-xl border border-subtle'>
  <ScrollArea.Viewport>
    <header className='sticky top-0 border-b border-subtle bg-raised px-4 py-2 text-strong'>
      Sticky header
    </header>
    <div className='grid gap-3 p-4'>
      {Array.from({ length: 20 }, (_, i) => (
        <p key={i}>Row {i + 1}</p>
      ))}
    </div>
  </ScrollArea.Viewport>
  <ScrollArea.Scrollbar>
    <ScrollArea.Thumb />
  </ScrollArea.Scrollbar>
</ScrollArea>
```

## Guidelines

- **Give the root a height constraint.** `ScrollArea` doesn't size itself. Inside
  a grid or flex parent it also needs `min-h-0` (the root variant sets this) or
  the content's intrinsic height wins and nothing scrolls.
- **Read scroll state from the viewport, not the root.** `scrollTop`,
  `scrollTo`, and the `scroll` event all live on
  `[data-slot="scroll-area-viewport"]`.
- **Use `style`, not a class, to clamp an axis.** Base UI sets
  `overflow: scroll` as an inline style on the viewport, which a Tailwind
  `overflow-*` class can't beat. To stop horizontal drag on a vertical area,
  pass `style={{ overflowX: 'clip' }}`.
- **Skip `ScrollArea.Content` on vertical-only areas.** It adds a
  `min-width: fit-content` box that sticky children would have to escape. Reach
  for it when the area scrolls horizontally.
- **Don't combine `fade` with sticky content.** The mask applies to everything
  the viewport paints, so a sticky header fades as it pins. Pick one.
- **The scrollbar hides on touch.** Coarse pointers get the platform's own
  transient overlay bar instead. If an area's only scroll hint is the bar, add
  `fade` so touch users get one too.
- **Don't wrap the page.** Roadie's app shell gives scroll to panes and other
  bounded regions; a document-level custom scrollbar loses the browser's
  built-in scroll affordances.

## Accessibility

- The viewport is a real scroll container, so keyboard scrolling (arrows,
  Page Up/Down, Home/End, Space) works natively once it is focused. Base UI
  makes it focusable when it overflows.
- The scrollbar and thumb are pointer affordances only — nothing keyboard-only
  or screen-reader-only depends on them.
- Roadie hides the bar at rest and reveals it on hover or while scrolling; the
  fade is wrapped in `motion-safe`, so `prefers-reduced-motion` gets an instant
  swap. On coarse pointers the bar is hidden entirely and the platform's own
  overlay bar takes over.
- `fade` is decoration only — it masks paint, never content, so nothing is
  removed from the accessibility tree or from find-in-page.

<PropsDefinitions componentPath='packages/components/src/components/ScrollArea/index.tsx' />
````

- [ ] **Step 4: Verify the docs page renders**

Run: `pnpm --filter docs build`
Expected: succeeds, and `/components/scroll-area` is in the output. Then start the dev server and check the page by eye:

```bash
pnpm --filter docs dev
```

Visit `http://localhost:3000/components/scroll-area`. Confirm: the vertical bar fades in on hover, the horizontal example scrolls sideways, the both-axes example shows a corner, and the sticky header pins.

- [ ] **Step 5: Commit**

```bash
git add docs/src/app/debug/rsc-smoke/page.tsx docs/src/app/components/scroll-area
git commit -m "docs(scroll-area): add component page and RSC canary coverage"
```

---

### Task 4: `Navigator.Pane` adopts `ScrollArea`

**Files:**

- Modify: `packages/components/src/components/Navigator/NavigatorPane.tsx` (whole file)
- Modify: `packages/components/src/components/Navigator/variants.ts:58-84` (`navigatorPaneVariants`, plus a new `navigatorPaneViewportVariants`)
- Modify: `packages/components/src/components/Navigator/index.tsx` (export the new variant)
- Test: `packages/components/src/components/Navigator/Navigator.test.tsx`

**Interfaces:**

- Consumes: `ScrollArea` from Task 1 — specifically `ScrollArea` (root, accepts `render`), `ScrollArea.Viewport` (accepts `ref`, `onScroll`, `style`), `ScrollArea.Scrollbar`, `ScrollArea.Thumb`; and the DOM contract `data-slot="scroll-area-viewport"`. The `fade` prop from Task 2 is deliberately **not** used — see below.
- Produces:
  - `navigatorPaneViewportVariants` — exported from `Navigator/variants.ts` and re-exported from `Navigator/index.tsx`.
  - DOM contract: the pane is still `<section data-slot="navigator-pane">`; the scroll container is now a nested `<div data-slot="navigator-pane-viewport">` (it carries **both** that slot and Base UI's `scroll-area-viewport` slot — the Navigator-specific one is what Navigator's own tests and any consumer CSS target).
  - `NavigatorPaneProps` is unchanged (`role`, `collapseNav`, plus `ComponentProps<'section'>`).

**Why the root stays a `<section>`:** `navigatorContentVariants` styles the pane stack with `[&>*:not(:last-child)]` child selectors, and `NavigatorPane`'s `syncBar` decides which pane is on top with `el.nextElementSibling !== null`. Both are structural facts about `Navigator.Content`'s direct children. Rendering `ScrollArea` with `render={<section />}` keeps the pane one element, in the same position, with the same `data-slot` — nothing outside the pane has to change.

- [ ] **Step 1: Write the failing tests**

In `packages/components/src/components/Navigator/Navigator.test.tsx`, replace the existing test at lines 57-69:

```tsx
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
```

with:

```tsx
  it('gives every pane its own scroll container', () => {
    const { container } = render(
      <Navigator value='events'>
        <Navigator.Content>
          <Navigator.Pane role='list'>Events</Navigator.Pane>
        </Navigator.Content>
      </Navigator>
    )
    const pane = container.querySelector('[data-slot="navigator-pane"]')!
    const viewport = pane.querySelector<HTMLElement>(
      '[data-slot="navigator-pane-viewport"]'
    )!

    expect(pane.tagName).toBe('SECTION')
    expect(viewport).toBeTruthy()
    expect(viewport).toHaveAttribute('data-slot', 'navigator-pane-viewport')
  })

  it('clips the pane horizontally through style, which beats the inline overflow', () => {
    const { container } = render(
      <Navigator value='events'>
        <Navigator.Content>
          <Navigator.Pane role='list'>Events</Navigator.Pane>
        </Navigator.Content>
      </Navigator>
    )
    const viewport = container.querySelector<HTMLElement>(
      '[data-slot="navigator-pane-viewport"]'
    )!

    expect(viewport.style.overflowX).toBe('clip')
  })

  it('keeps a pane child scrollable by the pane viewport, not the section', () => {
    const { container } = render(
      <Navigator value='events'>
        <Navigator.Content>
          <Navigator.Pane role='list'>
            <p>Events</p>
          </Navigator.Pane>
        </Navigator.Content>
      </Navigator>
    )
    const viewport = container.querySelector<HTMLElement>(
      '[data-slot="navigator-pane-viewport"]'
    )!

    expect(viewport.textContent).toContain('Events')
  })
```

Then re-point every **scroll-driving** query in the file from the pane to the viewport. Add this helper directly above `describe('collapseNav', ...)` (currently line 1810):

```tsx
  // The pane's scroll container is ScrollArea's viewport, not the <section>.
  const scrollerOf = (root: ParentNode) =>
    root.querySelector<HTMLElement>('[data-slot="navigator-pane-viewport"]')!
```

and change each of these to use it (leave every *structural* `[data-slot="navigator-pane"]` query alone — only the ones followed by a `scrollTop` / `scrollTo` / `fireEvent.scroll` change):

| Line (pre-edit) | Before | After |
| --- | --- | --- |
| 1825 | `const pane = container.querySelector('[data-slot="navigator-pane"]')!` | `const pane = scrollerOf(container)` |
| 1847 | same | same |
| 1869 | same | same |
| 1892 | same | same |
| 1915 | same | same |
| 1960 | `const list = document.querySelector('[data-slot="navigator-pane"]')!` | `const list = scrollerOf(document)` |
| 2014 | same | same |
| 2065 | inside `const collapse = (container) => { const pane = container.querySelector('[data-slot="navigator-pane"]')! …` | `const pane = scrollerOf(container)` |
| 2187 | `const pane = container.querySelector('[data-slot="navigator-pane"]') as HTMLElement` | `const pane = scrollerOf(container)` |

The `collapse` helper at 2064-2069 and the tab-bar suites at 2175+ live in a different `describe` than the helper above, so define a second copy of `scrollerOf` at the top of `describe('Navigator collapsed edge circles', …)` rather than hoisting it to module scope — keeping each suite self-contained matches the file's existing style.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm --filter @oztix/roadie-components test -- Navigator`
Expected: FAIL. The three new assertions fail on a missing `[data-slot="navigator-pane-viewport"]`, and every re-pointed `collapseNav` test fails at `scrollerOf(...)` returning `null` (`Cannot set property scrollTop of null`).

- [ ] **Step 3: Add the viewport variant**

In `packages/components/src/components/Navigator/variants.ts`, replace `navigatorPaneVariants` (lines 58-84) with:

```ts
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
    'overflow-hidden rounded-2xl max-md:rounded-none emphasis-raised'
  ],
  {
    variants: {
      role: {
        list: 'md:w-[24rem] md:shrink-0',
        detail: 'md:min-w-0 md:flex-1'
      }
    },
    defaultVariants: { role: 'list' }
  }
)

// The scroll container. `overscroll-contain` stops a pane's scroll chaining
// into the document on iOS. The horizontal axis is clamped in JS, not here:
// Base UI writes `overflow: scroll` as an inline style on the viewport and an
// `overflow-x-*` class cannot beat it — see NavigatorPane. Panes run full
// height under the floating tab bar on mobile, so the last rows need padding
// to clear the ~70px pill plus its offset.
export const navigatorPaneViewportVariants = cva([
  'size-full overscroll-contain',
  'max-md:pb-24'
])
```

Add the export in `packages/components/src/components/Navigator/index.tsx` to the existing `export { … } from './variants'` block, right after `navigatorPaneVariants`:

```ts
  navigatorPaneViewportVariants,
```

- [ ] **Step 4: Rewrite `NavigatorPane.tsx`**

Replace the whole of `packages/components/src/components/Navigator/NavigatorPane.tsx` with:

```tsx
'use client'

import {
  type ComponentProps,
  type UIEvent,
  use,
  useEffect,
  useLayoutEffect,
  useRef
} from 'react'

import { cn } from '@oztix/roadie-core/utils'

import { ScrollArea } from '../ScrollArea'
import { NavigatorContext } from './NavigatorContext'
import { NavigatorPaneContext } from './NavigatorPaneContext'
import {
  type NavigatorPaneRole,
  navigatorPaneVariants,
  navigatorPaneViewportVariants
} from './variants'

// Small enough that a nudge collapses the bar, large enough that overscroll
// rubber-banding at the top doesn't flicker it.
const NAV_COLLAPSE_THRESHOLD = 24

// Base UI sets `overflow: scroll` inline on the viewport, so a Tailwind
// `overflow-x-hidden` class loses. Without this a child a hair too wide (a long
// venue name, a code block) drags the whole pane sideways. Wide children that
// need it own their horizontal scroll inside their own containers.
const CLIP_HORIZONTAL = { overflowX: 'clip' } as const

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
  onScroll,
  children,
  ...props
}: NavigatorPaneProps) {
  const {
    navCollapsed,
    setNavCollapsed,
    pinExpanded,
    setPinExpanded,
    setActivePaneScroller
  } = use(NavigatorContext)
  // Two elements, two jobs: the section is the pane in the stack (siblings,
  // surface, sizing); the viewport is what actually scrolls.
  const paneRef = useRef<HTMLElement | null>(null)
  const viewportRef = useRef<HTMLDivElement | null>(null)
  const prevScrollTop = useRef(0)

  // Task 6 keeps earlier panes mounted off-canvas, so mount/unmount can't hand
  // the bar back on navigation. Instead the visible (last) pane is the sole
  // authority: it syncs the bar from its own real scrollTop whenever it may
  // have become the top pane — mount, re-render after a pop, and scroll. A
  // non-collapse top pane forces the bar expanded. Comparing against the live
  // bar state (not a private ref) keeps the sync sound across sibling panes
  // while still skipping redundant setState.
  const syncBar = () => {
    const el = paneRef.current
    const viewport = viewportRef.current
    if (!el || !viewport || el.nextElementSibling !== null) return
    const scrollTop = viewport.scrollTop
    const scrolledDown = scrollTop > prevScrollTop.current
    prevScrollTop.current = scrollTop

    // The manual-expand pin holds the bar open while scrolled. It clears the
    // moment the user scrolls down again (iOS re-collapse) or reaches the top.
    if (pinExpanded && (scrolledDown || scrollTop <= NAV_COLLAPSE_THRESHOLD)) {
      setPinExpanded(false)
    }

    const next =
      collapseNav && scrollTop > NAV_COLLAPSE_THRESHOLD && !pinExpanded
    if (next === navCollapsed) return
    setNavCollapsed(next)
  }

  useLayoutEffect(syncBar)

  // The pin belongs to whichever pane is visible; drop it when this pane
  // unmounts so it never leaks to the pane revealed behind it.
  useEffect(() => () => setPinExpanded(false), [setPinExpanded])

  // The visible (last) pane owns the scroll-to-top the collapsed active circle
  // triggers. Registered every render so a pop that re-exposes this pane
  // re-claims it; cleared on cleanup so an unmount or a newly-pushed pane hands
  // it off. Reduced motion is read at tap time — an imperative one-off scroll.
  useLayoutEffect(() => {
    const el = paneRef.current
    const viewport = viewportRef.current
    if (!el || !viewport || el.nextElementSibling !== null) return
    setActivePaneScroller(() => {
      const smooth =
        typeof window.matchMedia !== 'function' ||
        !window.matchMedia('(prefers-reduced-motion: reduce)').matches
      viewport.scrollTo({ top: 0, behavior: smooth ? 'smooth' : 'auto' })
    })
    return () => setActivePaneScroller(null)
  })

  const handleScroll = (event: UIEvent<HTMLElement>) => {
    onScroll?.(event)
    syncBar()
  }

  return (
    <ScrollArea
      ref={paneRef}
      render={<section />}
      data-slot='navigator-pane'
      data-role={role}
      data-collapse-nav={collapseNav || undefined}
      className={cn(navigatorPaneVariants({ role }), className)}
      {...props}
    >
      <ScrollArea.Viewport
        ref={viewportRef}
        data-slot='navigator-pane-viewport'
        className={navigatorPaneViewportVariants()}
        style={CLIP_HORIZONTAL}
        onScroll={handleScroll}
      >
        <NavigatorPaneContext value={role}>{children}</NavigatorPaneContext>
      </ScrollArea.Viewport>
      <ScrollArea.Scrollbar>
        <ScrollArea.Thumb />
      </ScrollArea.Scrollbar>
    </ScrollArea>
  )
}

NavigatorPane.displayName = 'Navigator.Pane'
```

Notes for the implementer:

- `onScroll` moves from the section to the viewport. That is the intended behaviour change — the section never scrolls, so a consumer's `onScroll` on it would never fire.
- `ref={paneRef}` on `ScrollArea` lands on the rendered `<section>` because Base UI forwards the ref to the rendered element.
- Do **not** wrap the children in `ScrollArea.Content`. It sets `min-width: fit-content`, which would defeat the horizontal clamp and give the sticky `Navigator.Pane.Header` an extra box to escape.
- Do **not** pass `fade`. A pane's `Navigator.Pane.Header` is `position: sticky`, and the mask would fade it as it pins — the header would wash out exactly when it becomes the thing anchoring the view. Panes keep the scrollbar as their only affordance, which is why the mobile pane is worth a specific look in Task 5 step 3 (the bar is hidden on touch).

- [ ] **Step 5: Run the tests to verify they pass**

Run: `pnpm --filter @oztix/roadie-components test -- Navigator`
Expected: PASS — the full Navigator suite, including the sliding-indicator and collapsed-edge-circle suites.

If `useSlidingIndicator` tests fail, check that no indicator's `trackRef` was pointed at a pane — the indicator tracks the tab bar and the secondary strip, neither of which is inside a pane viewport, so this should not happen. If it does, it is a real coupling that needs resolving before continuing.

- [ ] **Step 6: Run the whole package suite, lint and typecheck**

Run:

```bash
pnpm --filter @oztix/roadie-components test
pnpm --filter @oztix/roadie-components lint
pnpm --filter @oztix/roadie-components typecheck
```

Expected: all clean. If typecheck passes locally but CI later disagrees, delete every tsbuildinfo and re-run:

```bash
find . -name "*.tsbuildinfo" -not -path "*/node_modules/*" -delete && pnpm typecheck
```

- [ ] **Step 7: Commit**

```bash
git add packages/components/src/components/Navigator
git commit -m "feat(navigator): move pane scrolling into ScrollArea's viewport"
```

---

### Task 5: Browser verification and the Navigator docs update

jsdom models none of the things that make this risky. This task is where the change is actually proven.

**Files:**

- Modify: `docs/src/app/components/navigator/page.mdx`
- Create: `docs/solutions/component-patterns/base-ui-scroll-area-inline-overflow.md`

**Interfaces:**

- Consumes: the shipped behaviour from Tasks 1, 2 and 4.
- Produces: nothing code depends on.

- [ ] **Step 1: Build the packages and start the docs site**

The docs site resolves `@oztix/roadie-components` through `dist`, so a source-only change is invisible until you rebuild **and restart** the dev server — otherwise you get "module not found" or stale behaviour.

```bash
pnpm --filter @oztix/roadie-core build
pnpm --filter @oztix/roadie-components build
pnpm --filter docs dev
```

- [ ] **Step 2: Verify the desktop pane**

The docs site's own shell uses `Navigator` (`docs/src/app/layout.tsx`), so every page is a live test. At a desktop width, on a long page such as `/components/navigator`:

1. The pane scrolls, and a rounded thumb fades in on the pane's right edge while scrolling, then fades out.
2. The thumb sits **inside** the pane's rounded corners — no bar bleeding past the card edge.
3. The pane's own sticky `Navigator.Pane.Header` (visible on the mobile layout; on desktop confirm on a page that renders one with a heading) pins to the top of the scroll container and does not scroll away.
4. `OnThisPage` (`docs/src/components/OnThisPage.tsx`) still highlights headings while scrolling — it scopes its observer to the pane content; if it broke, its root/scroll assumptions need re-pointing at the viewport.
5. No horizontal drag: grab a wide code block's page area and try to drag sideways. The block scrolls inside itself; the pane does not move.

- [ ] **Step 3: Verify the mobile pane stack and `collapseNav`**

Resize to 390px wide (or use device emulation):

1. Scroll a pane down — the floating tab bar collapses to the two edge circles.
2. Scroll back to the top — the bar expands.
3. Tap the collapsed active circle once — the bar reopens and stays open (pinned) without navigating.
4. Tap the now-expanded active tab — the pane scrolls smoothly to the top.
5. Navigate into a sub-page (push a second pane), then back — the revealed pane is still scrolled where you left it and the bar re-collapses to match.
6. Confirm the last rows of pane content clear the floating bar (the `max-md:pb-24` on the viewport).
7. Overscroll at the top of a pane — the page behind must not rubber-band (`overscroll-contain` on the viewport).
8. **No Roadie scrollbar is drawn.** Device emulation reports a coarse pointer, so `pointer-coarse:hidden` should suppress it. Confirm on a real device that the platform's own transient overlay bar appears on scroll — if it doesn't, Base UI's scrollbar-hiding CSS is suppressing it and the pane has no scroll affordance at all on touch. That is the one outcome that would justify revisiting the touch decision.

- [ ] **Step 3b: Verify the edge fade on the docs page**

At `/components/scroll-area`, on the two fade examples:

1. At the top of the vertical example there is **no** top fade; scroll down and it appears. Scroll to the bottom and the bottom fade clears.
2. The horizontal example fades the leading and trailing edges the same way.
3. The sticky example (which leaves `fade` at `none`) shows a crisp, unfaded header.
4. Inspect a faded viewport in DevTools and confirm the computed `mask-image` is a real gradient, not `none`.

- [ ] **Step 4: Verify reduced motion**

Enable "Reduce motion" at the OS level (macOS: System Settings → Accessibility → Display) and reload. The scrollbar must appear/disappear instantly rather than fading, and the tap-to-scroll-to-top must jump rather than smooth-scroll.

- [ ] **Step 5: Fix anything the browser found, then re-run the suite**

If any of steps 2-4 fail, fix it and re-run:

```bash
pnpm --filter @oztix/roadie-components test -- Navigator
```

Add a regression test for anything that broke and was fixable in jsdom (a `data-slot` query, a ref target, a class). Behaviour that only exists in a real browser (sticky, overscroll, fades) gets a note in the solutions doc below instead — do not fake it with a jsdom test that asserts nothing real.

- [ ] **Step 6: Write the solutions note**

Create `docs/solutions/component-patterns/base-ui-scroll-area-inline-overflow.md`:

```markdown
---
module: components
tags: [base-ui, scroll-area, navigator, overflow, css]
problem_type: best-practice
---

# Base UI ScrollArea sets `overflow` inline — Tailwind classes can't clamp an axis

## Problem

`ScrollArea.Viewport` renders with an inline `style={{ overflow: 'scroll' }}`.
An `overflow-x-hidden` (or `overflow-x-clip`) Tailwind class on the same
element loses to it, so content wider than the viewport drags the whole area
sideways even though no horizontal scrollbar is rendered.

`Navigator.Pane` hit this directly: before adopting ScrollArea it relied on
`overflow-y-auto overflow-x-hidden` to stop a long venue name or a wide code
block dragging the pane.

## Solution

Pass the clamp through the `style` prop, which Base UI merges after its own
defaults so the consumer wins:

```tsx
<ScrollArea.Viewport style={{ overflowX: 'clip' }}>
```

`overflow-x: clip` is valid alongside `overflow-y: scroll`; `hidden` is not
(the pair computes back to `auto`).

## Related

- Not rendering a horizontal `ScrollArea.Scrollbar` hides the *bar*, not the
  *overflow* — they are separate concerns.
- `ScrollArea.Content` sets `min-width: fit-content`, which defeats the clamp.
  Omit it on vertical-only areas.
- The scroll container is the viewport, not the root: `scrollTop`, `scrollTo`
  and the `scroll` event all move inward when a component adopts ScrollArea.
- `fade` and `position: sticky` are mutually exclusive. The mask applies to
  everything the viewport paints, so a sticky header fades as it pins. This is
  why `Navigator.Pane` — which owns a sticky `Pane.Header` — opts out.
```

- [ ] **Step 7: Update the Navigator docs page**

In `docs/src/app/components/navigator/page.mdx` (edit **by hand**, no Prettier), add to the Guidelines section:

```mdx
- **Panes scroll through a `ScrollArea` viewport.** `Navigator.Pane` renders a
  [`ScrollArea`](/components/scroll-area) whose viewport
  (`[data-slot="navigator-pane-viewport"]`) is the real scroll container. An
  `onScroll` handler you pass to `Navigator.Pane` is attached there, and
  anything reading `scrollTop` or calling `scrollTo` on a pane must target the
  viewport, not the `<section>`.
```

- [ ] **Step 8: Rebuild the docs and commit**

Run: `pnpm --filter docs build`
Expected: succeeds.

```bash
git add docs/src/app/components/navigator/page.mdx docs/solutions/component-patterns/base-ui-scroll-area-inline-overflow.md
git commit -m "docs(navigator): document the ScrollArea viewport as the pane's scroll container"
```

---

## Follow-up (out of scope for this plan)

The user explicitly asked for these to be a separate pass once `Navigator.Pane`
has proved the pattern. Do **not** fold them into this plan.

1. **The More overflow pane** — `navigatorOverflowPaneVariants`
   (`Navigator/variants.ts:212`, `max-h-[60dvh] overflow-y-auto
   overscroll-contain`). Lowest risk: no sticky header, no scroll listener.
2. **The desktop rail** — `navigatorRailVariants` (`Navigator/variants.ts:101`).
   Rarely overflows; mostly cosmetic parity.
3. **The secondary strip** — `navigatorSecondaryStripVariants`
   (`Navigator/variants.ts:292`, horizontal `overflow-x-auto`). Carries a real
   coupling: `useSlidingIndicator` reads `track.scrollLeft` off the strip
   element (`useSlidingIndicator.ts:66-68`), so moving the scroll inward means
   the indicator's track and its scroller stop being the same element. That
   needs resolving before the strip can adopt ScrollArea.
4. **Other Roadie scroll owners** — `Select`/`Combobox`/`Autocomplete` popups
   and `Dialog.Viewport` all use `overflow-y-auto` today. Evaluate whether a
   custom bar helps inside a popup before changing them.
