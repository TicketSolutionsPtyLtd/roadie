# Pane header collapse, title alignment, and scrollbars

> **Status (2026-09-11): landed.** Shipped as `Pane.BodyTitle`, not `Pane.LargeTitle`. Checkboxes below were never ticked; the code is the record.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The four items the user reported from screenshots, in
[`2026-07-28-navigator-phase-3-queue.md`](2026-07-28-navigator-phase-3-queue.md):
a `Pane.Header` collapse that jumps, a docs title that does not line up with its
document, a scrollbar that runs under the header, and scrollbars that sit
further from the pane edge than intended.

**Architecture:** `Pane` gains the iOS large-title arrangement — the large title
lives in the *scrolling content* and simply scrolls away, while the header keeps
a constant height and cross-fades in its compact echo. Nothing resizes, so
nothing can snap, and a title in the content is aligned with the document by
construction. The existing in-header placement keeps working unchanged.

**Tech Stack:** React 19, TypeScript strict, CVA, Tailwind v4, Base UI
(`ScrollArea`), Vitest + React Testing Library.

## What was measured before this plan was written

Live at 1440×900 on `http://localhost:9614/components/icon-button`, scoped to
the **detail** pane (an unscoped `querySelector` returns the list pane's title —
that mistake cost a probe already).

**Q1 — the header holds full height through the whole fade, then snaps.**

| t (ms) | header height | large title opacity | compact opacity |
| --- | --- | --- | --- |
| 0–45 | 110.4 | 1 | 0 |
| 58 → 308 | **110.4 throughout** | 0.61 → 0.0004 | 0.39 → 0.9996 |
| **333** | **64** | 0 | 1 |

The header's computed `transition-property` is **`box-shadow`** — its height is
never animated. The cause is in `variants.ts:228-245`:
`paneTitleVariants`' collapsed branch is `'hidden scale-95 opacity-0'` with
`transition-[scale,opacity,display]` and `transition-discrete`. `allow-discrete`
holds `display: block` for the full 300ms fade, then flips it to `none`,
collapsing the grid row **46.4px in one frame** with the compact title already
fully opaque.

The content does **not** lurch: scroll anchoring compensates (`scrollTop`
400 → 354, exactly the 46px). The visible defect is the header snapping around
an already-settled title.

The asymmetry is the tell. `paneTitleCompactVariants` (`variants.ts:256-274`)
deliberately uses `invisible`, not `hidden`, with the comment *"Not `hidden`: it
keeps its cell so the row's centre never reflows as it appears."* The same
reasoning was never applied to the large title — because for the large title,
keeping its cell is exactly what the collapse is trying to reclaim.

**That is why this cannot be fixed in place.** A header that shows a large title
expanded and not collapsed *must* change height, and height is a layout
property. iOS does not solve this — it avoids it: the nav bar is a constant
height and the large title is part of the scroll view.

**Q2 — the title is 32px left of the document.** Title `x: 556`, first body
paragraph `x: 588`, pane `x: 540`. The header pads by `--content-inset` (16px);
the docs content adds 48px.

**Q3 — the scrollbar runs under the header.** Scrollbar `y: 16`, header bottom
`y: 122` — 106px of it sits behind the header and past the pane's rounded
corner.

**Q4 — the visible thumb is 6px from the pane edge, not 4.** The scrollbar track
is 4px in (`me-1`), and the thumb is a further 2px in (`p-0.5`).

## Global Constraints

Every task's requirements implicitly include this section.

- **Only `translate` / `scale` / `opacity` may be animated.**
  `background-color` and `box-shadow` are paint and allowed. **Never `height`,
  `padding`, `width`, `top` or `left`** — that is the whole reason Q1 needs an
  arrangement change rather than a transition tweak.
- **Tailwind v4 emits `translate`, `scale` and `rotate` as independent CSS
  properties, never `transform`.** A `transition-[transform,…]` list paired with
  a translate utility animates nothing. **This has shipped four times on this
  branch** with class strings that read correctly every time. Read the emitted
  `transition-property`.
- **`Navigator` imports from `Pane`, never the reverse.** `Pane` defines empty
  contexts; `Navigator` fills them.
- **Do not break the mobile strip's edge-to-edge bleed.** It bleeds by
  `-mx-(--content-inset)` and cancels the header's bottom padding through
  `--pane-header-pad-b`, both published by `Pane.Header`. Any change to the
  header's insets or padding must be checked against the strip at 390×844.
- **`Pane.Title` deliberately does not compose `surfaceTitleClass`** — it is a
  page heading, while `Dialog.Title` and `Drawer.Title` head compact overlays.
  Guard tests exist in those files. Do not "fix the inconsistency".
- **Existing in-header `Pane.Title` placement must keep working.** This plan is
  additive; a consumer who does not migrate sees no behaviour change.
- Act warnings: `Pane.test.tsx` ≤ 2, whole suite ≤ 5, **sitting exactly at 5**
  (Navigator 2, Tabs 3, and one each in `IconButton.test.tsx` /
  `paneStack.test.ts`). No headroom.
- **`pnpm --filter … test -- <file>` does not filter.** Use
  `cd packages/components && pnpm vitest run <path>`.
- **Prove every new assertion fails against the unfixed code.**
- **`docs/src/app/debug/pane-stack/` is the user's untracked file.** Never
  stage, edit or delete it. Stage explicit paths only.
- **Never run `pnpm --filter docs build`** — the dev server runs on 9614.
- Comments explain *why*, never *what*; a comment left false is a defect.
- Use the **Playwright MCP tools**; every probe must return `innerWidth`, and
  must scope to the detail pane rather than `querySelector`-ing the first match.

---

## File structure

**Created**

| File | Responsibility |
| --- | --- |
| `packages/components/src/components/Pane/PaneLargeTitle.tsx` | The scrolling large title; registers its text with the pane so the header can echo it |

**Modified**

| File | Change |
| --- | --- |
| `packages/components/src/components/Pane/PaneContext.ts` | carries the registered large-title text |
| `packages/components/src/components/Pane/PaneRoot.tsx` | holds that state |
| `packages/components/src/components/Pane/PaneHeader.tsx` | renders the compact echo for a content-placed title; constant height |
| `packages/components/src/components/Pane/variants.ts` | large-title variants; header height no longer varies |
| `packages/components/src/components/Pane/index.tsx` | exports `Pane.LargeTitle` |
| `packages/components/src/components/ScrollArea/ScrollAreaScrollbar.tsx` | scrollbar clears the header and sits 4px in |
| `docs/src/components/Navigation.tsx` | docs adopt the content-placed title |
| `docs/src/app/components/pane/page.mdx` | document the arrangement |

---

## Task 1: `Pane.LargeTitle` — a title that scrolls away

The header stops changing height. The large title moves into the scrolling
content, where it scrolls out of view naturally, and the header's compact echo
cross-fades in as it goes — the same cross-fade that exists today, minus the
thing that snapped.

**Files:**
- Create: `packages/components/src/components/Pane/PaneLargeTitle.tsx`
- Modify: `packages/components/src/components/Pane/PaneContext.ts`
- Modify: `packages/components/src/components/Pane/PaneRoot.tsx`
- Modify: `packages/components/src/components/Pane/PaneHeader.tsx`
- Modify: `packages/components/src/components/Pane/variants.ts`
- Modify: `packages/components/src/components/Pane/index.tsx`
- Test: `packages/components/src/components/Pane/Pane.test.tsx`

**Interfaces:**
- Produces: `PaneLargeTitle` (`displayName 'Pane.LargeTitle'`,
  `data-slot='pane-large-title'`), `PaneLargeTitleProps = ComponentProps<'h1'> &
  { render?: (props: ComponentProps<'h1'>) => ReactElement }`. Exported from
  `index.tsx` as `Pane.LargeTitle`.
- Consumes: `PaneContext` from `./PaneContext`, which today carries
  `{ collapsed, scrollToTop }`. It gains `largeTitle: ReactNode | null` and
  `setLargeTitle: (node: ReactNode | null) => void`.

**Why an `<h1>` default, unlike `Pane.Title`'s `<h2>`:** a content-placed large
title *is* the view's heading — there is no page `<h1>` above it to collide
with, which is the reason `Pane.Title` defaults to `<h2>`. Both keep `render`.

- [ ] **Step 1: Write the failing tests**

Add to `Pane.test.tsx`. Follow the file's existing `Pane` render helpers rather
than inventing new ones, and scope queries to the pane under test.

```tsx
describe('Pane.LargeTitle', () => {
  it('renders in the content, not in the header', async () => {
    const { container } = render(
      <Pane role='detail' current>
        <Pane.Header />
        <Pane.LargeTitle>Reports</Pane.LargeTitle>
      </Pane>
    )
    await flushViewportMeasurement()

    const large = container.querySelector('[data-slot="pane-large-title"]')!
    expect(large).not.toBeNull()
    expect(large.closest('[data-slot="pane-header"]')).toBeNull()
    expect(
      screen.getByRole('heading', { name: 'Reports', level: 1 })
    ).toBeInTheDocument()
  })

  it('gives the header a compact echo of it', async () => {
    const { container } = render(
      <Pane role='detail' current>
        <Pane.Header />
        <Pane.LargeTitle>Reports</Pane.LargeTitle>
      </Pane>
    )
    await flushViewportMeasurement()

    const echo = container
      .querySelector('[data-slot="pane-header"]')!
      .querySelector('[data-slot="pane-title-compact"]')!
    expect(echo).not.toBeNull()
    expect(echo).toHaveAccessibleName('Scroll to top')
  })

  it('never hides the large title with display, so the header cannot reflow', async () => {
    // The 46px one-frame snap this arrangement exists to remove came from
    // `hidden` on the in-header title: `allow-discrete` held `display: block`
    // for the whole fade, then dropped the row in a single frame.
    const { container } = render(
      <Pane role='detail' current>
        <Pane.Header />
        <Pane.LargeTitle>Reports</Pane.LargeTitle>
      </Pane>
    )
    await flushViewportMeasurement()

    const large = container.querySelector('[data-slot="pane-large-title"]')!
    expect(large).not.toHaveClass('hidden')
    const transitions = large.className.match(/transition-\[[^\]]+\]/g) ?? []
    for (const transition of transitions) {
      expect(transition).not.toContain('display')
      expect(transition).not.toContain('height')
    }
  })

  it('leaves the header the same height whether or not it is collapsed', async () => {
    // jsdom has no layout, so this pins the mechanism: no class on the header
    // varies with `collapsed` in a way that changes its box.
    const { container } = render(
      <Pane role='detail' current>
        <Pane.Header />
        <Pane.LargeTitle>Reports</Pane.LargeTitle>
      </Pane>
    )
    await flushViewportMeasurement()

    const header = container.querySelector('[data-slot="pane-header"]')!
    for (const banned of ['h-', 'py-', 'pt-', 'pb-']) {
      const varying = Array.from(header.classList).filter(
        (c) => c.startsWith(`data-[collapsed`) && c.includes(banned)
      )
      expect(varying).toEqual([])
    }
  })
})
```

- [ ] **Step 2: Run them and confirm they fail for the right reason**

Run: `cd packages/components && pnpm vitest run src/components/Pane/Pane.test.tsx -t 'Pane.LargeTitle'`

Expected: FAIL — `Pane.LargeTitle is not a function`. If any passes, it is not
testing what it claims.

- [ ] **Step 3: Extend `PaneContext`**

Add to the context value:

```ts
  /**
   * Text of a content-placed `Pane.LargeTitle`, so `Pane.Header` can render
   * its compact echo without the title being one of its own children. Null
   * when the consumer places a `Pane.Title` in the header instead.
   */
  largeTitle: ReactNode | null
  setLargeTitle: (node: ReactNode | null) => void
```

Hold the state in `PaneRoot`. **Register from an effect, not from render** —
React 19 double-invokes render in StrictMode, and this repo's dev-warning rule
exists for the same reason. Give `setLargeTitle` a stable identity
(`useCallback` with no changing deps) or the registration effect will loop; that
exact loop has been hit twice on this branch.

- [ ] **Step 4: Create `PaneLargeTitle.tsx`**

```tsx
'use client'

import { type ComponentProps, type ReactElement, use, useEffect } from 'react'

import { cn } from '@oztix/roadie-core/utils'

import { PaneContext } from './PaneContext'
import { paneLargeTitleVariants } from './variants'

export type PaneLargeTitleProps = ComponentProps<'h1'> & {
  /** Replace the rendered element. */
  render?: (props: ComponentProps<'h1'>) => ReactElement
}

/**
 * The view's heading, placed in the pane's scrolling content so it scrolls
 * away as the reader moves down — the arrangement iOS uses for large titles.
 *
 * The header keeps a constant height and cross-fades in a compact echo of this
 * text instead. Nothing resizes, so the collapse cannot snap; an in-header
 * `Pane.Title` has to drop its row to reclaim the space, and does so in one
 * frame at the end of the fade.
 *
 * Defaults to `<h1>` rather than `Pane.Title`'s `<h2>`: a content-placed title
 * is the view's own heading, with no page heading above it to collide with.
 */
export function PaneLargeTitle({
  className,
  children,
  render,
  ...props
}: PaneLargeTitleProps) {
  const pane = use(PaneContext)
  const setLargeTitle = pane?.setLargeTitle

  useEffect(() => {
    if (!setLargeTitle) return
    setLargeTitle(children)
    return () => setLargeTitle(null)
  }, [setLargeTitle, children])

  const resolved = {
    'data-slot': 'pane-large-title',
    className: cn(paneLargeTitleVariants(), className),
    children,
    ...props
  }

  return render ? render(resolved) : <h1 {...resolved} />
}

PaneLargeTitle.displayName = 'Pane.LargeTitle'
```

Add to `variants.ts`:

```ts
// The content-placed large title. No collapse variant and no transition: it
// scrolls out of view on the pane's own scroll, which is the point — the
// header's echo is what fades. Matches `paneTitleVariants`' type so the two
// arrangements read identically.
export const paneLargeTitleVariants = cva(['text-display-ui-3 text-strong'])
```

- [ ] **Step 5: Render the echo from `PaneHeader`**

Today the compact echo is emitted by `PaneTitle` as a sibling of its `<h2>`.
When the title is content-placed there is no `Pane.Title` in the header, so the
header must render the echo itself from `pane.largeTitle`.

Extract the echo into one shared piece used by both paths rather than writing a
second copy — a duplicated button is exactly the maintainability finding this
repo's review rubric calls Important. Keep every current property of it: the
`aria-label='Scroll to top'`, the `tabIndex={collapsed ? undefined : -1}`, the
`aria-hidden` inner `<span>`, and `paneTitleCompactVariants`.

Guard the case where a consumer supplies **both** an in-header `Pane.Title` and
a content `Pane.LargeTitle`: two echoes in one grid cell. Emit one echo (prefer
the in-header `Pane.Title`, which is the older contract) and warn in dev via
`isDev()` from `packages/components/src/utils/isDev.ts`, **from an effect**.

- [ ] **Step 6: Stop the header's height varying**

Check `paneHeaderVariants` for anything keyed on `collapsed` that changes its
box, and remove it for the content-placed arrangement. **Leave the in-header
arrangement's behaviour alone** — a consumer still using `Pane.Title` in the
header keeps today's collapse, snap included. Say in your report exactly which
classes you found and which you changed.

- [ ] **Step 7: Wire the export**

`Pane.LargeTitle = PaneLargeTitle` in `index.tsx`, added to the type
intersection, plus `export type { PaneLargeTitleProps }`.

- [ ] **Step 8: Run the tests, typecheck and lint**

```bash
cd packages/components && pnpm vitest run src/components/Pane/Pane.test.tsx
cd /Users/lukebrooker/Code/roadie && pnpm typecheck && pnpm lint
```
Expected: PASS. Report `Pane.test.tsx`'s act-warning count and the suite's.

- [ ] **Step 9: Commit**

```bash
git add packages/components/src/components/Pane
git commit -m "feat(pane): add Pane.LargeTitle, a title that scrolls away instead of collapsing the header"
```

---

## Task 2: The docs adopt it

Migrating the docs proves the arrangement on a real consumer and fixes **Q2** by
construction — a title in the content column is aligned with the document
because it is *in* the document.

**Files:**
- Modify: `docs/src/components/Navigation.tsx:415-423`
- Modify: `docs/src/app/components/pane/page.mdx`
- Test: manual, in a browser

- [ ] **Step 1: Move the title out of the header**

`Navigation.tsx:419-422` currently renders
`<Pane.Title render={(p) => <h1 {...p} />}>{pageTitles[pathname]}</Pane.Title>`
inside `Pane.Header`. Render `<Pane.LargeTitle>` at the top of the pane's
content instead, above `#docs-content`'s existing children, keeping the same
`pageTitles[pathname]` source and the same conditional (`!showAppearance &&
pageTitles[pathname]`).

`Pane.LargeTitle` already defaults to `<h1>`, so the `render` prop that was
forcing `<h1>` is no longer needed — drop it.

**Keep exactly one `<h1>` per page.** The homepage and `/debug/*` routes declare
no `metadata.title` and keep their own in-content heading; that is unchanged and
the comment above the conditional already says so — verify it is still true
after your edit rather than assuming.

- [ ] **Step 2: Check the title's alignment**

The point of the exercise. At 1440×900 on `/components/icon-button`, scoped to
the **detail** pane (the widest one — an unscoped query returns the list pane):

```js
() => {
  const p = [...document.querySelectorAll('[data-slot="pane"]')]
    .reduce((a, b) => (b.getBoundingClientRect().width > a.getBoundingClientRect().width ? b : a))
  const title = p.querySelector('[data-slot="pane-large-title"]')
  const body = document.querySelector('#docs-content p')
  return {
    innerWidth,
    titleX: Math.round(title.getBoundingClientRect().x),
    bodyX: Math.round(body.getBoundingClientRect().x),
    delta: Math.round(body.getBoundingClientRect().x - title.getBoundingClientRect().x),
    h1Count: document.querySelectorAll('h1').length
  }
}
```

Required: `delta: 0` (it was **32**), and `h1Count: 1`.

- [ ] **Step 3: Check the collapse no longer snaps**

Re-run the frame capture from this plan's preamble. Required: the header's
height is **constant across every frame** — no 110.4 → 64 step — while the
compact echo fades in.

- [ ] **Step 4: Check nothing else regressed**

- the compact echo still scrolls the pane to top when tapped
- the on-this-page rail still lists and highlights the right headings
  (`useDocHeadings` collects `h2, h3` from `#docs-content` and seeds from every
  existing id — an `<h1>` entering that container is new, so **verify** rather
  than assume)
- at 390×844 the mobile section strip still bleeds edge to edge and hugs the
  header's bottom with no gap

- [ ] **Step 5: Document the arrangement**

Add a section to `docs/src/app/components/pane/page.mdx` covering both
placements: `Pane.LargeTitle` in the content (recommended — constant header, no
snap) and `Pane.Title` in the header (supported, and what the collapse costs).
Follow `COMPONENT_DOC_TEMPLATE.md`'s section order.

**Never run `prettier --write` on `.mdx`** — it empties the file, and that has
happened on this branch. The pre-commit hook runs `turbo format`, so **verify
the file is intact after committing** and restore from git if not.

- [ ] **Step 6: Commit**

```bash
git add docs/src packages/components/src/components/Pane
git commit -m "docs(pane): put the page title in the content so it aligns and the header stops snapping"
```

---

## Task 3: Scrollbars clear the header and sit 4px in

Both are `ScrollArea.Scrollbar` and both are small; they are one task because
they are the same element and the same file.

**Q3:** the scrollbar spans the full viewport, so it runs up behind a sticky
`Pane.Header` and past the pane's rounded top corner. It should start below the
header.

**Q4:** the track is 4px from the pane edge (`me-1`) but the visible thumb is a
further 2px in (`p-0.5`), so it reads as 6px. The user asked for ~4px on the
**thumb**.

**Files:**
- Modify: `packages/components/src/components/ScrollArea/ScrollAreaScrollbar.tsx`
- Modify: `packages/components/src/components/ScrollArea/variants.ts`
- Modify: `packages/components/src/components/Pane/variants.ts` (if the offset
  is published by the header)
- Test: `packages/components/src/components/ScrollArea/ScrollArea.test.tsx`

**Interfaces:**
- Consumes: `--pane-header-pad-b`, already published by `Pane.Header` for the
  mobile strip to cancel. If you publish a header *height* for the scrollbar to
  offset against, follow that existing naming and say so.

- [ ] **Step 1: Decide where the offset comes from, and say so**

`ScrollArea` is a general component and must not know about `Pane`. Two shapes
work; pick one and justify it in your report:

- **(a)** `Pane` publishes its header height as a custom property and the
  pane's own scrollbar offsets by it, leaving `ScrollArea` untouched. Keeps the
  seam clean — `Pane` knows about headers, `ScrollArea` does not.
- **(b)** `ScrollArea.Scrollbar` grows an inset prop that `Pane` passes. More
  general, but adds public API for one consumer.

**(a) is the seam this repo already uses** (`--pane-header-pad-b` exists for
exactly this kind of coupling), so it is the default unless you find a reason
against it.

- [ ] **Step 2: Write the failing tests**

jsdom has no layout, so pin the mechanism. Prove both RED first.

```tsx
  it('insets the scrollbar so it starts below the header', async () => {
    // The bar spans the viewport, which extends under a sticky Pane.Header;
    // without an offset it runs past the pane's rounded top corner.
    // …assert the scrollbar carries the offset, scoped to a Pane with a Header
  })

  it('sits the thumb 4px from the pane edge', async () => {
    // The track's own padding is inside its margin, so the visible thumb is
    // the sum of both — the margin has to account for it.
  })
```

Write the real assertions against whatever mechanism Step 1 chose; do not ship
the comments as the test.

- [ ] **Step 3: Implement**

For Q4 the arithmetic is: thumb inset = scrollbar margin + scrollbar padding.
It is `me-1` (4px) + `p-0.5` (2px) = 6px today, and the target is 4px. **Do not
simply drop the padding** — it is what gives the thumb its track. Adjust the
margin and say what the resulting numbers are.

- [ ] **Step 4: Verify in a real browser**

At 1440×900 on `/components/icon-button`, scoped to the detail pane:

```js
() => {
  const p = [...document.querySelectorAll('[data-slot="pane"]')]
    .reduce((a, b) => (b.getBoundingClientRect().width > a.getBoundingClientRect().width ? b : a))
  const pr = p.getBoundingClientRect()
  const header = p.querySelector('[data-slot="pane-header"]')
  const sb = p.querySelector('[data-slot="scroll-area-scrollbar"]')
  const thumb = sb.querySelector('[data-slot="scroll-area-thumb"]')
  return {
    innerWidth,
    scrollbarTop: Math.round(sb.getBoundingClientRect().y),
    headerBottom: Math.round(header.getBoundingClientRect().bottom),
    startsBelowHeader: sb.getBoundingClientRect().y >= header.getBoundingClientRect().bottom - 1,
    thumbInsetFromPaneRight: Math.round(pr.right - thumb.getBoundingClientRect().right)
  }
}
```

Required: `startsBelowHeader: true` (it is `false` today, scrollbar `y: 16`
against a header bottom of `122`), and `thumbInsetFromPaneRight: 4` (it is `6`).

Then check the scrollbar is still usable — drag it, and confirm it still
reaches the bottom of the pane and does not overlap the rounded bottom corner.

- [ ] **Step 5: Check every other `ScrollArea` consumer**

`ScrollArea` is used by the rail, the mobile strip, `Navigator`'s overflow and
the docs. If you changed shared variants rather than pane-specific ones,
confirm each still looks right — the rail at 1200px and the strip at 390×844 in
particular, since the strip's scrollbar is `flush` and horizontal.

- [ ] **Step 6: Commit**

```bash
git add packages/components/src/components
git commit -m "fix(pane): keep the scrollbar clear of the header and 4px from the edge"
```

---

## Definition of done

From a cleared incremental-build state, **with `--force`** so Turbo does not
replay a cache:

```bash
find . -name "*.tsbuildinfo" -not -path "*/node_modules/*" -delete
pnpm typecheck --force && pnpm lint --force && pnpm test --force
```

All three pass. Act warnings ≤ 2 in `Pane.test.tsx` and ≤ 5 across the suite —
report both, and remember the suite is already exactly at 5.

At 1440×900 on `/components/icon-button`: the header's height is constant
through the collapse, the title's left edge matches the body's, the scrollbar
starts below the header, and the thumb is 4px from the pane's edge.

At 390×844: the mobile section strip still bleeds edge to edge and hugs the
header's bottom, and the tab bar work from the previous plan is unregressed.

The branch is unmerged with no upstream. Do not merge or push.

---

## Task 4: The in-header collapse is smooth for any header content

**Added after Task 2, from the user's report:** "the Header height still jumps on
scroll. When looking on http://localhost:9614/components/pane examples."

Tasks 1–2 gave `Pane` a *smooth* arrangement and migrated the docs' detail pane
to it. They did not fix the **default**. The user's original ruling was explicit
— "we still need to fix the default for Panes so when apps use it it's smooth" —
and the default is exactly what still snaps.

Measured at 1440×900 on `/components/pane`. Sixteen panes; **one** uses
`Pane.LargeTitle`:

| pane | title | header height | scrolls |
| --- | --- | --- | --- |
| docs detail pane | `Pane.LargeTitle` | **64, constant** | yes |
| docs list pane (in the shell, on every page) | `Pane.Title` | 133.3 → snaps | yes |
| "Collapse on scroll" example | `Pane.Title` | 89.3 → snaps | yes |
| "Ticket types" example | `Pane.Title` | 154.4 → snaps | yes |

The example demonstrating collapse-on-scroll is itself the jumpy one.

### The user's direction, verbatim

> "This but try to use transforms / performant transitions if possible. Also
> account for potentially different heading sizes and header contents."

So: **animate the collapse continuously**, prefer transform/opacity wherever
they can do the work, and **derive the geometry** — the four measurements above
are all different, and none may be hardcoded.

### The honest constraint, stated up front

Transforms cannot reclaim layout space. The visual movement of the title is
already `scale` + `opacity` and stays that way. What has to change continuously
is the space the title's row occupies, and no transform does that.

So this task **knowingly animates one layout property**, and that is a
deliberate exception to the branch's rule, not an oversight. The justification
is the one the tab bar's `padding` carried in code before this week's work
removed it: it fires **once per collapse toggle**, not once per scroll frame.
**Record that reasoning in a comment at the site**, so the next reader does not
"fix" it back to a snap.

If you find a way to do it with no layout animation at all and no DOM
restructuring, take it and say so — that is a better outcome.

**Files:**
- Modify: `packages/components/src/components/Pane/variants.ts`
- Modify: `packages/components/src/components/Pane/PaneHeader.tsx` and/or
  `PaneTitle.tsx`
- Test: `packages/components/src/components/Pane/Pane.test.tsx`

- [ ] **Step 1: Reproduce, across several different header contents**

At 1440×900 on `/components/pane`, capture the header height frame by frame
through a collapse for **at least three panes with different header contents** —
the 89.3, 133.3 and 154.4 ones above. You need the failing baseline, and you
need to see that the expanded height varies, because whatever you build must not
assume it.

- [ ] **Step 2: Choose the mechanism, and justify it**

Candidates, in rough order of preference. Evaluate rather than transcribe:

- **`interpolate-size: allow-keywords` + `height: auto`** — CSS animates to and
  from intrinsic size with no JS and no measurement, so it is content-agnostic
  by construction. Check browser support against what this repo targets, and
  check whether `@media (prefers-reduced-motion)` still suppresses it.
- **`grid-template-rows: 1fr → 0fr`** on the title's row — the long-standing
  technique for exactly this, no measurement needed, works everywhere. The
  header is already a grid, so this may be a small change.
- **A measured custom property** (`ResizeObserver` publishing the expanded
  height) — content-agnostic but adds JS. This repo already measures in
  `useSlidingIndicator`, so it is not forbidden; it is just more machinery.

**Do not hardcode any height.** State which you chose and why, and what you
ruled out.

- [ ] **Step 3: Write the failing tests**

jsdom has no layout, so pin the mechanism rather than the pixels. The
discriminating assertion is that the header's collapse is **continuous** — i.e.
the title's row no longer goes to `display: none` via `hidden` +
`transition-discrete`, which is what produced the one-frame drop.

Write assertions that fail against the current code. At minimum:

- the in-header title's collapsed classes no longer include `hidden`
- whatever property now carries the collapse **is** in the emitted transition
  list
- `Pane.LargeTitle`'s constant-height behaviour is unchanged

Prove each RED before implementing.

- [ ] **Step 4: Implement**

Keep the cross-fade exactly as it is — the two titles fading and scaling is not
the problem and the user has not asked for it to change.

- [ ] **Step 5: Verify in a real browser**

At 1440×900 on `/components/pane`, for **each** of the three panes from Step 1:

- the header's height changes over multiple frames, not one — capture the
  distinct heights and show the intermediate values
- it ends at the same collapsed height it reaches today
- `prefers-reduced-motion` still suppresses the animation

Then confirm you did not regress what Tasks 1–2 fixed: the docs' detail pane
still holds a constant 64px through its collapse, and its title still aligns
with the body at `delta: 0`.

Then at 390×844, confirm the mobile section strip still bleeds edge to edge and
hugs the header's bottom — it cancels the header's bottom padding via
`--pane-header-pad-b`, and this task touches the header's box.

- [ ] **Step 6: Commit**

```bash
git add packages/components/src/components/Pane
git commit -m "fix(pane): collapse the header smoothly whatever its content"
```
