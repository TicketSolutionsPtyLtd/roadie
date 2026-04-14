---
title: Docs and compound component conventions improvements
type: feat
status: completed
date: 2026-04-14
---

# Docs and compound component conventions improvements

Four related upgrades to the docs site and the compound component conventions that feed it: migrate every compound to the Carousel conventions, collapse subcomponent props behind accordions, truncate long code previews behind a "View code" button, and add an "On this page" rail to every docs page.

## Progress

| Phase                                             | Status         | PR                                                             | Notes                                                                                                                                                                                                                                                                                                                                                                                                                             |
| ------------------------------------------------- | -------------- | -------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **1 — Compound migration**                        | ✅ Done        | [#36](https://github.com/TicketSolutionsPtyLtd/roadie/pull/36) | All 10 compounds migrated to Pattern A. Scope expanded during execution: (a) `LinkButton` / `LinkIconButton` CVA literal props inlined after a missed-grep discovery, (b) `PropsDefinitions` filter + interfaceName logic rewritten so every compound page renders full subcomponent sections (was meant for Phase 2 but deferring it left Card/Fieldset/etc looking broken).                                                     |
| **2 — `PropsDefinitions` subcomponent accordion** | ✅ Done        | [#38](https://github.com/TicketSolutionsPtyLtd/roadie/pull/38) | Compound subcomponents collapse into a closed-by-default accordion with prop-count badges. Siblings like `Button` / `IconButton` render as inline cards rather than accordion items. The accordion is rendered by a dedicated `'use client'` wrapper (`docs/src/components/PropsAccordion.tsx`) so `<Accordion.Item>` dot-access works — see the "RSC client-reference proxy" note below, and the tracked follow-up for path (c). |
| **2.5 — `/parts` subpath export (follow-up)**     | ⬜ Not started | —                                                              | Ship `@oztix/roadie-components/parts` as a dedicated entry point for server-component consumers, re-exporting every Pattern A compound's subcomponents as bare names. Systemic fix to the RSC-proxy problem that Phase 2 worked around with a client-component wrapper. Documents the constraint in `COMPOUND_PATTERNS.md` as a first-class concern.                                                                              |
| **3C — `CodePreview` view-code toggle**           | ✅ Done        | —                                                              | Static and live editor panes truncate at 5 source lines with a centred "View code" button and bottom fade-out; "Hide code" control collapses again. Live preview never truncated; copy-to-clipboard always copies the full source.                                                                                                                                                                                                |
| **3D — "On this page" right rail**                | ✅ Done        | —                                                              | New `OnThisPage` client component scans `<main>` for `h2`/`h3` after mount, auto-assigns slug ids when MDX/TSX pages don't supply them, and renders a sticky right rail at `lg`+ with IntersectionObserver active-state and smooth-scroll on click. Outer layout grid widened to `lg:max-w-[76rem]` with a `[minmax(0,56rem)_12rem]` split so the rail sits beside the existing `container-4xl` content area. `rehype-slug` wired into `next.config.mjs` (string form, for Next 16's serializable-options requirement). |

### What changed from the original plan during Phase 1

- **`LinkButton` / `LinkIconButton` added to Phase 1 scope.** The plan's acceptance grep for `VariantProps<typeof v>['key']` was based on a flawed escape in my initial grep and reported "clean". Re-running the grep correctly surfaced two offenders (`LinkButton.tsx`, `LinkIconButton.tsx`). Fixed in the same PR; new exported type aliases `LinkButtonIntent`, `LinkButtonEmphasis`, `LinkButtonSize`, `LinkIconButtonSize`.
- **`PropsDefinitions` renderer was rewritten in Phase 1.** The original plan assumed Pattern A migration alone would surface subcomponent sections. It doesn't — the existing component filter drops any component with zero props after `propFilter` strips HTML-only attributes. For every compound whose subcomponents are `ComponentProps<'div'>` (Card.Header, Fieldset.Legend, Field.HelperText, …), the sections silently disappeared. Same story for three Carousel parts (`Header`, `Item`, `Dots`) that were already missing on `main`. The fix: (1) keep every PascalCase entry through the filter, (2) always derive section headings from `displayName` rather than the first prop's `parent.name`, (3) render a "forwards all standard HTML attributes" fallback inside zero-prop subcomponent sections.
- **The type-alias-vs-interface rule is no longer load-bearing for heading consistency.** With the new renderer, headings come from `displayName` unconditionally — both `type X = Base & { ... }` and `interface X extends Base` forms render identical dot-notation headings. The rule stands in `COMPOUND_PATTERNS.md` and `AGENTS.md` as a style preference (matching Carousel, composes better with CVA intersections), but is no longer required for correctness. `docs/solutions/build-errors/react-docgen-cva-literal-props.md` has a 2026-04-14 update note explaining the resolution.

### Phase 2 scope change after code review

- **Initial attempt:** Phase 2 first tried importing `Accordion` into `PropsDefinitions` (a server component) via a named specifier and using `<Accordion.Item>` dot-access directly. That rendered as "Element type is invalid: undefined".
- **Initial (incorrect) diagnosis:** assumed the bundler was tree-shaking the module-top-level `Accordion.Item = AccordionItem` assignments as dead code when `Accordion` was the only bound name, and added `AccordionItem` / `AccordionTrigger` / `AccordionContent` to the package barrel as named exports.
- **Correct diagnosis (from code review):** inspecting `packages/components/dist/Accordion.js` shows the assignments survive the build — they're present as `m.Item=h, m.Trigger=g, m.Content=_` at the bottom of the compiled chunk. The actual cause is Next.js's **RSC client-reference proxy**: because `Accordion/index.tsx` has `'use client'`, Next hands the server bundle a proxy object for the module that only forwards explicitly-named exports. Property assignments done inside the client module body never cross the proxy — they're invisible from server context. This also explains why an `import * as RC from '@oztix/roadie-components'` namespace attempt blew up with `Q.createContext is not a function`: server-side it tried to actually evaluate the client module.
- **Landed fix:** moved the accordion usage into a dedicated `'use client'` wrapper at `docs/src/components/PropsAccordion.tsx` and reverted the package barrel to its original state. Client-to-client imports don't hit the RSC proxy, so `<Accordion.Item>` dot-access resolves normally.
- **Follow-up tracked as Phase 2.5 above:** the wrapper is a tactical unblock, not a systemic fix. Any future server component that wants to consume a compound's subcomponents will hit the same wall. The planned fix is a `@oztix/roadie-components/parts` subpath export that re-exports every Pattern A compound's subcomponents as bare names — documented in `COMPOUND_PATTERNS.md` as the required import path for server-component consumers.

## Overview

The Carousel work landed the cleanest compound conventions in the codebase so far — Pattern A assembly, type-alias prop shapes, index-injection context, dev-only warnings via `process.env.NODE_ENV`. But nine other compounds still ship the legacy `Object.assign + cast` form and mixed `interface extends` prop types, which means `react-docgen-typescript` silently drops most of their props from the docs site. At the same time, the docs' `PropsDefinitions`, `CodePreview`, and root layout haven't caught up to the patterns modern design-system sites (shadcn, Base UI) use to stay scannable at scale.

This plan bundles the four improvements into one coordinated push because they share the same surface area (`PropsDefinitions` and compound definitions are tightly coupled) and the same validation path (load a component page, confirm everything still renders and every prop still appears).

## Problem Statement

1. **Compound components drift from the Carousel standard.** Ten compounds use `Object.assign + cast`, which breaks subcomponent prop extraction in `react-docgen-typescript`. Eleven subcomponent prop types use `interface … extends` instead of `type … = … & { … }`, which produces inconsistent section headings in the docs (`FieldLabelProps` vs `Field.LabelProps`). The only codified reference is `docs/contributing/COMPOUND_PATTERNS.md`, and it mostly describes the _target_ state without explicitly checklist-ing the migration work.
2. **`PropsDefinitions` dumps every subcomponent inline.** On a component like `Carousel` or `Select` with ten-plus subcomponents, a reader lands in a wall of definition lists and loses the shape of the main component. Subcomponents should be hidden behind expandable sections, with only the root component's props visible by default — matching how every modern docs site handles compound APIs.
3. **`CodePreview` has no height ceiling.** Long examples (Carousel with multiple slides, Steps with seven items) dominate the page. shadcn's convention is to collapse code over ~5 lines behind a "View code" button with the first lines visible under a fade-out, so the reader can glance at the shape before expanding.
4. **No "On this page" sub-nav.** Pages with six-plus examples rely entirely on scrolling. There's no way to jump to a specific variant, and no visual indicator of where you are in a long page. Left-rail nav handles between-page navigation; right-rail TOC handles within-page navigation.

## Proposed Solution

Four work streams, each building on shared primitives where useful:

### A. Compound components → Carousel conventions

- Migrate every `Object.assign + cast` compound to Pattern A (named exports + property assignment).
- Convert every subcomponent `interface X extends Y` to `type X = Y & { … }`.
- Verify every subcomponent has a dot-notation `displayName` set.
- Confirm no component uses `VariantProps<typeof v>['key']` on a public prop shape (grep already confirms clean).
- Confirm any future dev-only warnings use `process.env.NODE_ENV` with the `typeof process` guard + `declare const process`, never `import.meta.env.DEV`.
- Update `docs/contributing/COMPOUND_PATTERNS.md` with an explicit checklist section summarising the rules so future contributors have a single source of truth.

### B. `PropsDefinitions` → accordion for subcomponents

- Identify the root component from the first parsed entry (it's already deduplicated and ordered).
- Render the root's props table inline, exactly like today.
- Render every other component (the subcomponents) inside a single `<Accordion type="multiple">` (from `@oztix/roadie-components`) where each item collapses that subcomponent's props.
- Accordion items stay closed by default; the label shows the subcomponent name (e.g. `Carousel.Header`) and a prop count (`5 props`).
- Inherited prop groups stay inside each subcomponent panel exactly as they render today.

### C. `CodePreview` → truncate + "View code"

- Count newlines in the trimmed code string. If > 5, render only the first 5 lines with a bottom fade-out mask and a floating "View code" button in the middle of the preview.
- Clicking "View code" expands to full height and swaps the label to "Hide code".
- Truncation applies to both the static-highlighted path and the `LiveEditor` path — the preview (runtime output) is never truncated, only the editor/code pane.
- Preserve copy-to-clipboard: the button still copies the full code string, not the visible 5 lines.

### D. "On this page" right rail

- Add a client-side TOC component that scans the `<main>` element for `h2`/`h3` after mount, builds a tree, and renders a sticky right rail at `lg` and above.
- Use `IntersectionObserver` to track the active heading and highlight it.
- Headings must have `id`s. MDX pages need `rehype-slug` added to `next.config.mjs`; TSX foundation/tokens pages already set `id`s manually or can be updated to do so.
- Main layout's grid changes from single-column to `lg:grid-cols-[minmax(0,1fr)_12rem]` so the rail sits to the right of content without pushing it narrower on mobile/md. Below `lg`, the rail is hidden.
- The rail hides automatically if there are fewer than two headings on the page, so short overview pages don't get a near-empty rail.

## Technical Approach

### Architecture

All four streams share a common constraint: `react-docgen-typescript` runs at **build time** in a Server Component (`PropsDefinitions` is async-free but it calls `parseComponentProps` during render, which in Next 16 happens at build for static export). That means any new UI (accordion, view-code toggle, TOC scroll-spy) must be a **client component** that receives already-parsed data as props.

```
PropsDefinitions (server, parses TS)
  ├─ RootPropsTable (server, static render of root props)
  └─ SubcomponentPropsAccordion (client, receives serialized prop groups)

CodePreview (client, already client — adds useState for expand/collapse)

DocsLayout (server)
  └─ main grid
       ├─ {children}           (page content, MDX or TSX)
       └─ <OnThisPage />        (client — scans DOM after mount)
```

### File-level changes

#### A. Compound migration

For each of the ten compounds below, apply the same mechanical conversion (detailed in the Migration Recipe section). No behaviour changes; purely structural + type shape.

| #   | Component    | Path                                                        | Object.assign line | Subcomponents needing `interface extends` → `type`                                                |
| --- | ------------ | ----------------------------------------------------------- | ------------------ | ------------------------------------------------------------------------------------------------- |
| 1   | Accordion    | `packages/components/src/components/Accordion/index.tsx`    | 188                | — (inline types OK)                                                                               |
| 2   | Autocomplete | `packages/components/src/components/Autocomplete/index.tsx` | 369                | —                                                                                                 |
| 3   | Breadcrumb   | `packages/components/src/components/Breadcrumb/index.tsx`   | 86                 | `BreadcrumbSeparatorProps` (line 52)                                                              |
| 4   | Card         | `packages/components/src/components/Card/index.tsx`         | 130                | —                                                                                                 |
| 5   | Combobox     | `packages/components/src/components/Combobox/index.tsx`     | 368                | —                                                                                                 |
| 6   | Field        | `packages/components/src/components/Field/index.tsx`        | 185                | `FieldLabelProps` (78), `FieldHelperTextProps` (149), `FieldErrorTextProps` (166)                 |
| 7   | Fieldset     | `packages/components/src/components/Fieldset/index.tsx`     | 79                 | `FieldsetLegendProps` (36), `FieldsetHelperTextProps` (51), `FieldsetErrorTextProps` (61)         |
| 8   | RadioGroup   | `packages/components/src/components/RadioGroup/index.tsx`   | 265                | `RadioGroupLabelProps` (189), `RadioGroupHelperTextProps` (229), `RadioGroupErrorTextProps` (244) |
| 9   | Select       | `packages/components/src/components/Select/index.tsx`       | 441                | `SelectHelperTextProps` (394), `SelectErrorTextProps` (407), `SelectContentProps` (425)           |
| 10  | Steps        | `packages/components/src/components/Steps/index.tsx`        | 308                | —                                                                                                 |

Root prop types (`FieldRootProps`, `FieldsetRootProps`, `CarouselProps`, etc.) are **exempt** — the `type` alias rule in `COMPOUND_PATTERNS.md` only covers subcomponents because the heading fallback only applies to subcomponents. Do not touch root props.

**Out of scope (non-compound components with `interface extends`):** `MarqueeProps`, `LabelProps`, `HighlightProps`, `RequiredIndicatorProps`, `OptionalIndicatorProps`, `CarouselProps`. These are non-compound roots so the subcomponent heading rule doesn't apply. Leave them.

#### Migration Recipe (applied to each Pattern-B compound)

Before:

```tsx
// packages/components/src/components/Card/index.tsx
function CardRoot(props: CardProps) {
  /* … */
}
CardRoot.displayName = 'Card'

function CardHeader(props: ComponentProps<'div'>) {
  /* … */
}
CardHeader.displayName = 'Card.Header'
// … other subcomponents

export const Card = Object.assign(CardRoot, {
  Header: CardHeader,
  Content: CardContent,
  Footer: CardFooter,
  Image: CardImage,
  Title: CardTitle,
  Description: CardDescription
}) as typeof CardRoot & {
  Header: typeof CardHeader
  // …
}
```

After:

```tsx
// packages/components/src/components/Card/index.tsx
export function Card(props: CardProps) {
  /* … */
}
Card.displayName = 'Card'

export function CardHeader(props: ComponentProps<'div'>) {
  /* … */
}
CardHeader.displayName = 'Card.Header'
// … other subcomponents

Card.Header = CardHeader
Card.Content = CardContent
Card.Footer = CardFooter
Card.Image = CardImage
Card.Title = CardTitle
Card.Description = CardDescription
```

Specifically:

1. Rename the root function (`CardRoot` → `Card`) and add `export`.
2. Add `export` to each subcomponent function declaration. (They remain internal names like `CardHeader` — the dot-notation is set via `displayName`.)
3. Delete the `Object.assign(...) as typeof ... & { ... }` block at the bottom.
4. Replace it with direct `Card.Header = CardHeader` assignments — no cast, TypeScript widens the function symbol automatically.
5. For any subcomponent prop type declared as `interface XProps extends Y`, rewrite as `export type XProps = Y & { /* existing own props */ }`. Preserve `export`, preserve JSDoc on members.
6. Verify the component's barrel export (`packages/components/src/index.tsx`) still imports from this file correctly. Named exports are additive so existing re-exports of `Card` keep working.
7. Run `pnpm --filter @oztix/roadie-components typecheck && pnpm --filter @oztix/roadie-components test`.

**One test-surface concern for Select, Combobox, Autocomplete:** these re-export a large number of Base UI subcomponents. Pattern A means every subcomponent becomes a top-level `export function` — that's already consistent with Carousel (which also ships 11 subcomponents). No behavioural change expected.

#### Updated `COMPOUND_PATTERNS.md`

Add a new section after the existing "Pattern A — named exports + property assignment (preferred)" called **"Checklist for new/migrated compounds"**:

```md
## Checklist for new/migrated compounds

Use this as a final pre-merge check when creating a new compound or
migrating an existing one:

- [ ] Root and every subcomponent use named `export function`
- [ ] Every subcomponent has an explicit dot-notation `displayName`
      (`Carousel.Header`, not `CarouselHeader`)
- [ ] Properties assigned directly (`Carousel.Header = CarouselHeader`),
      no `Object.assign + cast`
- [ ] Every **subcomponent** prop type is declared as
      `type X = Base & { ... }`, not `interface X extends Base`
      (root prop types are exempt)
- [ ] No CVA variant prop typed via `VariantProps<typeof v>['key']`
      on the public prop shape — inline the literal union
- [ ] Dev-only warnings use `process.env.NODE_ENV` with the
      `typeof process !== 'undefined'` guard, never `import.meta.env.DEV`
- [ ] Context-only vs index-injection decision made consciously
      (see the Decision matrix above)
- [ ] If index-injection: providers keyed with `child.key ?? index`
- [ ] Docs page renders without the `PropsDefinitions` heading dropping
      any subcomponents (visual regression check)
```

This becomes the single source of truth contributors (and this plan's reviewers) check off.

#### B. `PropsDefinitions` accordion

File: `docs/src/components/PropsDefinitions.tsx`

Current behaviour (verified): iterates deduped component list, renders each as `<dl>` with a `bg-subtler` header and inline `PropsList`s for own + inherited. All visible. The root component is always the first entry because `result.length > 0` and react-docgen-typescript orders by declaration.

New behaviour:

```tsx
import { Accordion } from '@oztix/roadie-components'

// parseComponentProps stays unchanged — still runs at build/server-render
export function PropsDefinitions({ componentPath }: PropsDefinitionsProps) {
  const components = parseComponentProps(componentPath)
  if (!components) return null

  const [root, ...subcomponents] = components

  return (
    <div className='mt-8 grid gap-4 pt-8'>
      <h2 className='text-xl font-bold'>Props</h2>
      <ComponentPropsCard info={root} />
      {subcomponents.length > 0 && (
        <Accordion type='multiple' className='grid gap-2'>
          {subcomponents.map((info) => (
            <Accordion.Item key={info.displayName} value={info.displayName}>
              <Accordion.Trigger>
                <span className='font-mono text-sm font-semibold'>
                  {info.displayName}
                </span>
                <span className='text-sm text-subtle'>
                  {countVisibleProps(info)} props
                </span>
              </Accordion.Trigger>
              <Accordion.Content>
                <ComponentPropsCard info={info} hideHeader />
              </Accordion.Content>
            </Accordion.Item>
          ))}
        </Accordion>
      )}
    </div>
  )
}
```

Where `ComponentPropsCard` is the existing `<dl>`-rendering block extracted into its own function. `hideHeader` suppresses the top `interfaceName` header when rendering inside an Accordion panel (because the panel trigger already shows the name). `countVisibleProps` sums `ownProps + every inheritedProps group` to produce the prop-count badge.

**Risk — interfaceName heading still matters for the root.** The root component still needs its interface-name heading inline. No changes to that code path. The `Object.values(componentInfo.props)[0]?.parent?.name` fallback continues to rely on the type-alias-vs-interface-extends rule, which is why stream A runs first.

**Base UI Accordion is a client component.** `PropsDefinitions` is currently a server component (it imports from `react-docgen-typescript` and uses Node's `path` module). Wrapping parts of its output in `<Accordion>` is fine — Server Components can render Client Components — but `parseComponentProps`'s result type needs to serialize cleanly across the boundary. `PropItem` contains only strings/objects, no functions, so it serializes fine.

#### C. `CodePreview` view-code toggle

File: `docs/src/components/CodePreview.tsx`

The file is already a `'use client'` component (it uses `useState`, `useEffect`, `MutationObserver`). Adding a toggle is straightforward.

Add:

```tsx
const MAX_COLLAPSED_LINES = 5

const lineCount = trimmedCode.split('\n').length
const canCollapse = lineCount > MAX_COLLAPSED_LINES
const [isExpanded, setIsExpanded] = useState(false)
```

Wrap the code-rendering block (both static `<Highlight>` pre and `<LiveEditor>`) in a container:

```tsx
;<div
  className={cn(
    'relative',
    canCollapse &&
      !isExpanded &&
      'max-h-[var(--code-collapsed-h)] overflow-hidden'
  )}
  style={
    canCollapse && !isExpanded
      ? ({
          // 5 lines of sm:text-sm (20px) * 1.5 line-height + 16px vertical padding ≈ 166px
          '--code-collapsed-h': `${5 * 24 + 32}px`
        } as CSSProperties)
      : undefined
  }
>
  {/* existing pre / LiveEditor */}
  {canCollapse && !isExpanded && (
    <>
      <div className='pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-[var(--intent-bg-sunken)] to-transparent' />
      <button
        type='button'
        onClick={() => setIsExpanded(true)}
        className='is-interactive absolute bottom-4 left-1/2 -translate-x-1/2 emphasis-normal rounded-full px-4 py-1.5 text-sm font-medium'
      >
        View code
      </button>
    </>
  )}
</div>
{
  canCollapse && isExpanded && (
    <div className='flex justify-center border-t border-subtler py-2'>
      <button
        type='button'
        onClick={() => setIsExpanded(false)}
        className='is-interactive text-sm text-subtle hover:text-normal'
      >
        Hide code
      </button>
    </div>
  )
}
```

Constraints to respect:

- `CopyButton` stays absolutely positioned in the top-right and keeps copying `trimmedCode` (the full string).
- Truncation applies **only** to the code editor pane, not `LivePreview`. The preview always renders in full — it's the runnable demo.
- Line count should measure **source lines**, not rendered visual rows. A single long line that wraps counts as one line, which is correct.
- On live examples, collapsing the `LiveEditor` must not break `react-live`'s internal measurement. Testing this is a plan deliverable (see Acceptance Criteria).

#### D. "On this page" right rail

**Files to create:**

- `docs/src/components/OnThisPage.tsx` (client component — scrolls main, renders rail)

**Files to modify:**

- `docs/src/app/layout.tsx` — grid around `<main>` and `<OnThisPage />`
- `docs/next.config.mjs` — add `rehype-slug` + `rehype-autolink-headings` to `rehypePlugins`
- `docs/package.json` — add `rehype-slug`, `rehype-autolink-headings` dev deps
- `docs/src/components/mdx-components.tsx` — ensure heading components forward the generated `id` prop

**Layout change (layout.tsx):**

```tsx
<body className='overflow-x-hidden'>
  <Providers>
    <div className='flex min-h-screen max-w-[100vw] flex-row'>
      <Navigation items={items} />
      <div className='container-4xl min-w-0 flex-1 overflow-x-clip py-4 md:py-12 lg:py-20'>
        <div className='lg:grid lg:grid-cols-[minmax(0,1fr)_12rem] lg:gap-12'>
          <main className='min-w-0'>
            {children}
            <FooterNav items={items} />
          </main>
          <OnThisPage />
        </div>
      </div>
    </div>
  </Providers>
</body>
```

Why the outer `div` wraps grid instead of `main`: the existing `main` has `container-4xl` constraint. Moving that to an outer wrapper keeps the visual max-width and lets the grid column-count be defined inside.

**`OnThisPage.tsx` (client, ~60 lines):**

```tsx
'use client'

import { useEffect, useState } from 'react'

type Heading = { id: string; text: string; level: 2 | 3 }

export function OnThisPage() {
  const [headings, setHeadings] = useState<Heading[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)

  useEffect(() => {
    const mainEl = document.querySelector('main')
    if (!mainEl) return
    const nodes = mainEl.querySelectorAll<HTMLHeadingElement>('h2[id], h3[id]')
    const collected: Heading[] = Array.from(nodes).map((el) => ({
      id: el.id,
      text: el.textContent ?? '',
      level: el.tagName === 'H2' ? 2 : 3
    }))
    setHeadings(collected)

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting)
        if (visible.length > 0) setActiveId(visible[0]!.target.id)
      },
      { rootMargin: '0px 0px -70% 0px', threshold: 0 }
    )
    nodes.forEach((n) => observer.observe(n))
    return () => observer.disconnect()
  }, [])

  if (headings.length < 2) return null

  return (
    <nav
      aria-label='On this page'
      className='hidden lg:sticky lg:top-20 lg:block lg:max-h-[calc(100vh-6rem)] lg:self-start lg:overflow-y-auto'
    >
      <p className='mb-3 text-sm font-semibold text-strong'>On this page</p>
      <ul className='grid gap-2'>
        {headings.map((h) => (
          <li key={h.id} className={h.level === 3 ? 'pl-3' : ''}>
            <a
              href={`#${h.id}`}
              className={cn(
                'block text-sm transition-colors',
                activeId === h.id
                  ? 'font-semibold text-strong'
                  : 'text-subtle hover:text-normal'
              )}
            >
              {h.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  )
}
```

**Why client-side scan vs build-time extraction:** the docs site mixes `.mdx` and `.tsx` pages (`docs/src/app/tokens/reference/page.tsx`, `docs/src/app/components/page.tsx`, every foundation under `foundations/*/page.tsx`). A build-time remark plugin would handle MDX only; we'd still need a DOM scan for TSX pages. Doing one client-side DOM scan for every page is simpler, uniform, and Next 16's static export serves fully-rendered HTML, so headings exist the moment `useEffect` runs.

**Why `rehype-slug` is still needed:** MDX headings don't get `id`s by default. Adding `rehype-slug` at the `next.config.mjs` level auto-generates them from heading text, which the client scanner then reads. TSX foundation pages already add `id`s by hand or can easily be updated in the same PR (only a handful of pages).

**Fallback for TSX pages missing IDs:** `OnThisPage` only reads `h2[id], h3[id]`. Any heading without an `id` is silently skipped, so a page missing IDs just shows a shorter TOC or hides the rail entirely (`headings.length < 2` escape). This is graceful.

## System-Wide Impact

### Interaction graph

- **Stream A** changes module exports in each compound file. Any import like `import { Card } from '@oztix/roadie-components'` keeps working because the barrel re-export is still `Card` — only the internal shape changes.
- **Stream B** rewires `PropsDefinitions` — every component doc page that uses `<PropsDefinitions componentPath='…' />` will render the new layout automatically.
- **Stream C** touches the shared `CodePreview` — every `tsx-live` and `tsx` fence across every doc page gets the new behaviour.
- **Stream D** adds new layout grid columns — foundation, tokens, components, and overview pages all inherit the new right rail.

### Error & failure propagation

- If `react-docgen-typescript` can't find a component after migration, `PropsDefinitions` returns `null` and the page renders without a props table. Manual visual verification of every component page catches this.
- If `rehype-slug` fails to apply (wrong plugin version), headings render without IDs — `OnThisPage` hides itself via the `< 2 headings` guard. No crash.
- If `CodePreview`'s view-code toggle interacts badly with `react-live`'s measurement, the live preview may jump or not update correctly. This is why stream C testing explicitly runs the interactive "edit in live editor" flow.

### State lifecycle risks

- `OnThisPage` scans the DOM on mount. If a page lazy-mounts content after first paint (unlikely on SSG pages but possible), new headings won't appear in the rail. Accept this as a limitation — docs pages are static.
- `useState` for `isExpanded` in `CodePreview` is per-instance. Navigating away resets it, which is correct (user shouldn't come back to a pre-expanded example).

### API surface parity

- The compound components' **public API is unchanged**: `<Card.Header>`, `<Field.Label>`, `<Select.Content>` all work identically. Only the internal module structure changes.
- `PropsDefinitions`' prop signature is unchanged: it still takes `componentPath`.
- `CodePreview`'s fence syntax (` ```tsx-live `) is unchanged.

### Integration test scenarios

1. Load `/components/carousel` (already Pattern A) — confirm root `Carousel` props visible, every subcomponent collapsed in accordion, "View code" toggle appears on all examples > 5 lines, "On this page" rail lists every `##` heading and scroll-spy highlights the current one.
2. Load `/components/card` (newly migrated) — confirm every `Card.X` subcomponent appears in the accordion with non-zero prop counts.
3. Load `/components/select` (newly migrated with interface→type conversions) — confirm `Select.HelperTextProps`, `Select.ErrorTextProps`, `Select.ContentProps` headings render with the dot.
4. Load a foundation page like `/foundations/colors` — confirm rail still renders from TSX heading IDs.
5. Interact with a live example: click "View code" on a Carousel live example, edit the code in the editor, confirm the preview updates.
6. Delete `*.tsbuildinfo` and run cold `pnpm typecheck` — confirm no latent strict-mode errors hidden by the incremental cache.

## Acceptance Criteria

### Functional

#### A. Compound migration ✅ Done (PR #36)

- [x] All ten compounds in the migration table use Pattern A assembly
- [x] All subcomponent `interface X extends Y` declarations listed in the table are converted to `type X = Y & { … }`
- [x] Every subcomponent has an explicit dot-notation `displayName`
- [x] `grep -rn "Object.assign" packages/components/src/components` returns zero hits
- [x] `grep -rn "VariantProps<typeof.*\['" packages/components/src` returns zero hits (includes LinkButton/LinkIconButton fixes added during execution)
- [x] `grep -rn "import.meta.env" packages/components/src` returns zero hits
- [x] `COMPOUND_PATTERNS.md` has the new checklist section
- [x] **Scope addition:** every compound docs page now renders full subcomponent sections via `PropsDefinitions` filter + heading rewrite

#### B. Props accordion ✅ Done (PR #38)

- [x] Every component docs page shows the root component's props inline
- [x] Every component docs page with subcomponents shows a closed-by-default accordion with one item per subcomponent
- [x] Each accordion item's trigger shows the subcomponent display name and a prop count
- [x] Clicking an item expands it and shows the existing `<dl>` props table inside
- [x] Multiple items can be open at once (`type='multiple'`)

#### C. View-code toggle

- [x] Code examples with ≤ 5 lines render identically to today
- [x] Code examples with > 5 lines show only 5 lines plus a fade-out mask and a centred "View code" button
- [x] Clicking "View code" expands the editor to full height
- [x] A "Hide code" control at the bottom collapses it back
- [x] Copy-to-clipboard copies the full code string in both states
- [x] The live preview (runtime output) is never truncated
- [x] Editing code in an expanded live example still re-renders the preview correctly

#### D. On this page

- [x] Every docs page with ≥ 2 `h2`/`h3` headings shows a right-hand "On this page" rail at `lg` and above
- [x] The rail hides on screens below `lg`
- [x] The rail is sticky and scrolls internally when its own content overflows
- [x] Clicking a heading in the rail smooth-scrolls the page to that heading (with a sticky-header offset)
- [x] The currently-visible heading is highlighted via IntersectionObserver
- [x] MDX pages have auto-generated heading IDs via `rehype-slug`; TSX pages get IDs auto-assigned client-side from heading text
- [x] The rail hides on short pages with 0–1 headings

### Quality gates

- [ ] `pnpm --filter @oztix/roadie-components test` passes
- [ ] Cold typecheck passes (`find . -name "*.tsbuildinfo" -not -path "*/node_modules/*" -delete && pnpm typecheck`)
- [ ] `pnpm --filter docs build` completes successfully (static export)
- [ ] `pnpm lint` passes
- [ ] Manual visual QA: every component doc page loaded and confirmed rendering (list below)

## Dependencies & Risks

### Dependencies

- `rehype-slug` and `rehype-autolink-headings` (new `docs/package.json` devDeps)
- No version bumps to existing deps

### Risks

1. **`react-docgen-typescript` behaviour after Pattern A migration could surface new props that were hidden before.** Some components may have inherited props that the filter logic didn't flag because the parser never saw them. Mitigation: visual review of every component page, ready to tighten the `propFilter` in `PropsDefinitions.tsx` if noise appears.
2. **`react-live`'s `LiveEditor` may not tolerate being inside a `max-height: X; overflow: hidden` container gracefully.** The editor uses a contenteditable area; measurement could go wrong. Mitigation: test all live examples after stream C lands. Fall back to only truncating the _static_ code path if live editors break.
3. **Static export + `rehype-slug` could produce inconsistent IDs across builds** if headings contain dynamic content. Docs headings are static, so low risk — but worth a visual check.
4. **Accordion default-closed hides props from Cmd+F / in-page search.** This is a known tradeoff with any accordion-based docs. Accept it — the root props (the most commonly searched) stay inline, and users can expand all accordions with a "Show all" button if demand appears later (out of scope for v1).
5. **Grid column change affects every page, including long-form overview pages.** A 12rem right column is narrow enough to not affect reading comfort, and the `container-4xl` max-width means body content doesn't compress on `lg` screens. Verify on the widest and narrowest `lg` breakpoints.
6. **`OnThisPage` scanning main after mount means a brief flash where the rail is empty then populates.** Acceptable — users see the rail appear within ~16ms. Could be improved later with build-time extraction if it becomes jarring.
7. **Stale `tsbuildinfo`:** A migration this broad will trip the exact issue documented in `docs/solutions/build-errors/stale-tsbuildinfo-masks-local-errors.md`. The Quality Gates bullet makes cold typecheck a hard requirement.

## Implementation Phases

Sequence matters — stream A must land first, then B (which depends on stream A's type-alias fix to get correct headings), then C and D (independent, can run in parallel).

### Phase 1: Compound migration (stream A) ✅ Done — PR [#36](https://github.com/TicketSolutionsPtyLtd/roadie/pull/36)

Migrate all ten compounds in one PR. The changes are mechanical and low-risk; splitting them creates churn in the barrel exports and makes review harder.

1. ✅ Apply the Migration Recipe to each of the ten compounds.
2. ✅ Convert the listed `interface X extends Y` subcomponent types to `type X = Y & { … }`.
3. ✅ Update `COMPOUND_PATTERNS.md` with the checklist section.
4. ✅ Cold typecheck (`*.tsbuildinfo` cleanup first).
5. ✅ Run component tests — 314/314 pass.
6. ✅ Load every component docs page locally, confirm `PropsDefinitions` renders subcomponent sections with dot-notation headings.
7. ✅ **Scope addition:** `LinkButton` / `LinkIconButton` CVA literal props inlined.
8. ✅ **Scope addition:** `PropsDefinitions` filter + heading rewrite so every compound page renders full subcomponent sections (see "What changed from the original plan" at the top).
9. ✅ **Docs sync:** `AGENTS.md`, `COMPOUND_PATTERNS.md` (the standalone "Subcomponent prop types" section), and `docs/solutions/build-errors/react-docgen-cva-literal-props.md` updated to reflect that heading fallback is no longer load-bearing.

Deliverable: ~16 files changed across `packages/components`, `docs/src/components/PropsDefinitions.tsx`, and three doc files. Full diff in PR #36.

### Phase 2: PropsDefinitions accordion (stream B) ✅ Done — PR [#38](https://github.com/TicketSolutionsPtyLtd/roadie/pull/38)

> **Original scope note:** the filter + heading rewrite that was originally planned for this phase already landed in Phase 1 (PR #36). Phase 2 is just the accordion wrapping.

1. ✅ Extract existing `<dl>` block into `ComponentPropsCard` and `ComponentPropsBody` helpers inside `PropsDefinitions.tsx`.
2. ✅ Split `components` into `inlineComponents` (non-dot-notation, like `Button` + `IconButton`) and `subcomponents` (dot-notation, like `Card.Header`). The original plan assumed `[root, ...subcomponents]` but that would mis-label sibling components as compound parts.
3. ✅ Render `inlineComponents` inline as cards; pass `subcomponents` to a dedicated `'use client'` wrapper `PropsAccordion` that renders `<Accordion type='multiple'>` with one `<Accordion.Item>` per entry.
4. ✅ `ownCount` badge — counts own props only (not `own + inherited`). The badge answers "does this subcomponent add anything?"; inherited-only entries show "No own props" accurately.
5. ✅ Visual QA on every compound page via local dev server + cold docs build. Verified subcomponent counts: Select 17, Combobox 16, Autocomplete 15, Steps 11, Carousel 10, Card 6, Field 5, Breadcrumb 5, RadioGroup 4, Fieldset 3, Accordion 3. Non-compound pages (Input, Textarea, Badge) render as single inline cards with zero accordion items.
6. ✅ Code review fixes (from multi-agent review): invalid `<dl>` > `<p>` HTML in AccordionContent hoisted to a sibling `<p>`; `ComponentInfo` type alias removed in favour of inline structural typing; `Subcomponents` section label promoted from `<p>` to `<h3>`; dead early-return guard removed.
7. ✅ **RSC wrapper approach:** see the "Phase 2 scope change after code review" note at the top of this plan. Short version: server components can't see property assignments done inside `'use client'` modules, so `<Accordion.Item>` dot-access only works from a client context. `PropsAccordion.tsx` is that client context.

Deliverable: PR #38 — 2 files changed (`docs/src/components/PropsDefinitions.tsx` + new `docs/src/components/PropsAccordion.tsx`). Package barrel left untouched; no changeset required (docs-only, ignored by changeset config).

### Phase 3: CodePreview view-code + On-this-page rail (streams C and D in parallel)

Independent. Can be two separate PRs or one combined PR.

**C:**

1. ✅ Added `MAX_COLLAPSED_LINES`, `COLLAPSED_HEIGHT_PX`, `lineCount`, `canCollapse`, `isExpanded` to `CodePreview`.
2. ✅ Extracted the gradient mask + "View code" / "Hide code" affordance into a `ViewCodeShade` helper and wired it into both the static `Highlight` path and the `LiveProvider` editor pane.
3. ✅ Verified live editor interaction: clicking "View code" expands the editor, edits in the now-visible textarea propagate to `LivePreview`, and the live preview is never inside the collapsible container so it always renders full-height.
4. ✅ Visual QA on Carousel default (and other long live examples — every example >5 lines truncates).

**D:**

1. ✅ Installed `rehype-slug` (skipped `rehype-autolink-headings` — the existing MDX `a` mapping in `mdx-components.tsx` would re-style heading text as a link, which is undesirable; the rail handles in-page navigation instead).
2. ✅ Wired into `docs/next.config.mjs` as the string `'rehype-slug'` (Next 16's Turbopack loader requires serializable plugin options, so passing the imported function directly fails the build with `does not have serializable options`).
3. ✅ Created `docs/src/components/OnThisPage.tsx` (~115 lines: scan, slugify-and-assign-id fallback for TSX pages, IntersectionObserver active-state, smooth-scroll click handler with sticky-header offset, < 2 headings escape).
4. ✅ Updated `docs/src/app/layout.tsx` grid: outer wrapper now `mx-auto w-full max-w-[56rem] px-6 md:px-8 lg:max-w-[76rem] lg:px-12` containing a `lg:grid lg:grid-cols-[minmax(0,56rem)_12rem] lg:gap-8` split. Below `lg`, the layout is identical to today.
5. ✅ Foundation TSX pages were left untouched — `OnThisPage` slugifies and assigns ids on mount when a heading lacks one, so manual updates were unnecessary.
6. ✅ Visual QA on `/components/carousel`, `/components/select`, `/foundations/colors`, `/`, and 800px (mobile) — rail visible on lg, hidden on smaller.
7. ✅ Rail hides on pages with < 2 headings via the existing guard (verified in the component but no minimal page in the repo currently triggers it — the `< 2` escape is defensive).

Deliverables: one or two PRs depending on batching preference.

## Success Metrics

- Every component docs page shows every subcomponent's full props table (measurable by diffing `pnpm build` output pre/post).
- A developer scanning a docs page with ten subcomponents sees a 1-screen-tall props section instead of a 6-screen wall.
- A long example (e.g. Carousel default, ~45 lines) loads with only ~5 lines visible by default.
- Every docs page has a functioning right-rail TOC on desktop.

## Sources & References

### Internal references

- Compound conventions: `docs/contributing/COMPOUND_PATTERNS.md`
- Base UI conventions: `docs/contributing/BASE_UI.md`
- Build-error learnings:
  - `docs/solutions/build-errors/react-docgen-cva-literal-props.md`
  - `docs/solutions/build-errors/stale-tsbuildinfo-masks-local-errors.md`
  - `docs/solutions/build-errors/cross-bundler-dev-env-check.md`
- Reference implementation: `packages/components/src/components/Carousel/index.tsx`
- Current `PropsDefinitions`: `docs/src/components/PropsDefinitions.tsx:222`
- Current `CodePreview`: `docs/src/components/CodePreview.tsx:140`
- Docs root layout: `docs/src/app/layout.tsx:309`
- MDX setup: `docs/next.config.mjs:15`

### External references

- `rehype-slug`: https://github.com/rehypejs/rehype-slug
- `rehype-autolink-headings`: https://github.com/rehypejs/rehype-autolink-headings
- `react-docgen-typescript` prop filter docs: https://github.com/styleguidist/react-docgen-typescript
- shadcn/ui docs (UX reference): https://ui.shadcn.com/docs/components/date-picker

### Related rules from AGENTS.md

- "Prefer `type X = Base & { ... }` over `interface X extends Base` for subcomponent prop types" (style preference as of PR #36; no longer load-bearing for heading correctness)
- "Don't type CVA variant props as `VariantProps<typeof variants>['key']` on the public prop shape" (still required — `react-docgen-typescript` can't drill into CVA's conditional types)
- "For dev-only warnings / diagnostics in the components package, gate them on `process.env.NODE_ENV`"
- "If CI surfaces a typecheck error and `pnpm typecheck` passes locally, delete every `tsbuildinfo` in the repo"
