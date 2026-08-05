# Navigator Phase 3, item 0: two visible regressions

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the two user-visible regressions named as item 0 of
[`2026-07-28-navigator-phase-3-prompt.md`](2026-07-28-navigator-phase-3-prompt.md):
the mobile section-nav strip wraps instead of scrolling, and 16 hand-authored
`.tsx` docs pages still render their title in the body instead of the pane
header.

**Architecture:** Two independent fixes on `feat/navigator-component`, one in
`packages/components`, one in `docs`. Neither touches the other's files.

**Tech Stack:** React 19, TypeScript strict, CVA, Tailwind v4, Base UI
(`ScrollArea`), Next.js 16 App Router, Vitest + React Testing Library.

## Both diagnoses in the prompt were partly wrong — this plan supersedes them

Both bugs were reproduced live at 390×844 against
`http://localhost:9614/foundations/accessibility` before this plan was written.
Two of the prompt's leads do not survive that reproduction. Do not implement
the prompt's version of either.

**0a — `fitWidth={false}` is the wrong fix and would make it worse.**
`fitWidth={false}` exists to make the content wrapper *follow the viewport
width*; the rail passes it because the rail scrolls vertically. A horizontal
scroller wants the default (`true`). The wrapper is already at the default.

The real cause is that **every row-layout class sits on the wrong element.**
`navigatorSecondaryStripViewportVariants` puts `inline-flex items-center gap-1
p-1 px-[…]` on `ScrollArea.Viewport`, but `ScrollArea.Content` sits between the
viewport and the items. So the viewport's flex container has exactly one
in-flow child — the content wrapper — and the content wrapper is a plain
`display: block` box. The `Navigator.Item`s inside it are `inline-flex`, so
they wrap **as inline content**. `flex-wrap` was never involved (computed
`flex-wrap: nowrap` throughout), and `shrink-0` does nothing because the items
are not flex items of anything.

Measured on the unfixed page: 14 items across **4 rows**, strip height **136px**,
`scrollWidth === clientWidth === 390` (nothing to scroll), and zero gap between
items (`gap-1` applied to a container with one child).

The fix — moving the row onto `ScrollArea.Content` — was verified live by
patching computed styles before writing this plan: **1 row, strip height 40px,
`scrollWidth` 1361 vs `clientWidth` 390, gaps restored.** The indicator stayed
pixel-aligned with the active item both at rest and at `scrollLeft: 300`
(`useSlidingIndicator` already adds `track.scrollLeft` back, and an
absolutely-positioned child of a scroll container scrolls with its content).

**0b — the count is 16, not 18, and two pages fail the manifest's regex.**
`find docs/src/app -name page.tsx -not -path "*/debug/*"` does return 18, but:

- `docs/src/app/page.tsx` (the homepage) declares **no `metadata`** and is a
  landing page, not a doc page. It keeps its in-body `<h1>`. Deliberate
  exception, named here so nobody "fixes" it.
- `docs/src/app/components/page.tsx` declares `metadata` but has **no inline
  `<h1>` at all** — today it renders *no* `<h1>` anywhere. It gains a header
  title from this change and needs no edit.

That leaves **16** pages carrying both `metadata` and an inline
`<h1 className='text-display-prose-1 text-strong'>`.

Separately: `docs/src/app/foundations/elevation/page.tsx` and
`docs/src/app/foundations/iconography/page.tsx` write
`export const metadata: Metadata = {`. The manifest's regex is
`/export const metadata = ({[\s\S]*?})/m` and **does not match a type
annotation** — those two would silently resolve no title even after the walk
learns to read `.tsx`. The regex has to tolerate the annotation.

Also note `docs/src/components/Navigation.tsx:417-419` carries a comment
asserting that foundations pages "render their own h1 in-content … one h1 per
page either way". That was a deliberate accommodation, not an oversight. It
becomes false and must be rewritten, not deleted silently.

## Global Constraints

Every task's requirements implicitly include this section.

- **Act-warning budgets: `Navigator.test.tsx` ≤ 2, whole suite ≤ 5. The suite
  is EXACTLY at 5.** A new test that adds a warning breaches it; fix the
  warning or consolidate, never raise the number.
- **`pnpm --filter … test -- <file>` does not filter.** Use
  `cd packages/components && pnpm vitest run <path>`.
- **Never run `prettier --write` on `.mdx`** (it empties the file), and the
  pre-commit hook runs `turbo format` — verify any `.mdx` file after a commit
  that touches one. No task here should touch an `.mdx` file; if one does, that
  is a signal you are in the wrong file.
- **Never run `pnpm --filter docs build` while the docs dev server is running.**
  It is running now, on port 9614.
- **Prove every new assertion fails against the unfixed code.** A test
  asserting a class or attribute the component never renders passes
  unconditionally.
- **`docs/src/app/debug/pane-stack/` is the user's untracked working file.**
  Do not stage it, do not edit it, do not delete it.
- **`react-hooks/exhaustive-deps` is not registered in `packages/components`** —
  an `eslint-disable` for it is a hard error.
- Verify in a real browser at `http://localhost:9614`. The devtools MCP profile
  is held by a leftover Chrome from the previous session; use the Playwright
  MCP tools instead, and `browser_resize` to 390×844 for true mobile.

---

## File structure

**Modified**

| File | Change |
| --- | --- |
| `packages/components/src/components/Navigator/variants.ts` | `navigatorSecondaryStripViewportVariants` reduced to the scroll box; new `navigatorSecondaryStripContentVariants` carries the row |
| `packages/components/src/components/Navigator/NavigatorPaneChrome.tsx` | `ScrollArea.Content` gains the row class |
| `packages/components/src/components/Navigator/index.tsx` | export the new variant alongside its sibling |
| `packages/components/src/components/Navigator/Navigator.test.tsx` | one new test pinning which element carries the row |
| `docs/src/lib/component-manifest.ts` | title walk reads `page.tsx` as well as `page.mdx`; regex tolerates a type annotation; `getMdxPageTitles` → `getPageTitles` |
| `docs/src/app/layout.tsx:10,273` | renamed import and call |
| `docs/src/components/Navigation.tsx:71,417-419` | docblock + the now-false comment |
| 16 × `docs/src/app/**/page.tsx` | drop the inline `<h1>` |

---

## Task 1: The mobile section-nav strip scrolls instead of wrapping

**Files:**
- Modify: `packages/components/src/components/Navigator/variants.ts:332-338`
- Modify: `packages/components/src/components/Navigator/NavigatorPaneChrome.tsx:38`
- Modify: `packages/components/src/components/Navigator/index.tsx` (variant export list)
- Test: `packages/components/src/components/Navigator/Navigator.test.tsx`

**Interfaces:**
- Produces: `navigatorSecondaryStripContentVariants` — a CVA with no variants,
  exported from `variants.ts` and re-exported from `Navigator/index.tsx`
  alongside `navigatorSecondaryStripViewportVariants`.
- Consumes: `tabsListVariants` from `../Tabs/variants` (already imported by
  `variants.ts` for the viewport variant this task rewrites) and
  `ScrollAreaContentProps` from `../ScrollArea/ScrollAreaContent`.

- [ ] **Step 1: Write the failing test**

jsdom has no layout engine, so the row cannot be asserted by geometry here —
the live-browser check in Step 6 is what proves the pixels. What jsdom *can*
pin is the thing that was actually wrong: **which element carries the row.**
`toHaveClass` tokenises exactly, so these assertions genuinely discriminate.

Add this to the existing `describe('Navigator.Secondary', …)` block at
`Navigator.test.tsx:2280`. That block already declares everything the test
needs — `tree(active)` (line 2284), `stripOf` (2304) and `stripViewportOf`
(2309) — so reuse them rather than declaring a second harness. Both a
`Navigator.Primary` (the writer) and a `Pane.Header` (the reader) have to be
present for the strip to exist at all, which is why `tree` looks the way it
does. Scope every query to the strip: the rail carries identically-labelled
controls.

```tsx
  it('lays the strip row out on the scrolling content, not the viewport', async () => {
    // Regression guard for the wrap. ScrollArea.Content sits between the
    // viewport and the items, so a row declared on the viewport lays out one
    // block child, and the inline-flex items inside that child wrap as inline
    // content — 14 items over 4 rows, with no gap and nothing to scroll.
    const { container } = render(tree('events'))
    await flushViewportMeasurement()

    const viewport = stripViewportOf(container)!
    const content = stripOf(container)!.querySelector<HTMLElement>(
      '[data-slot="scroll-area-content"]'
    )!

    expect(content).toHaveClass('flex', 'items-center', 'gap-1')
    expect(viewport).toHaveClass('overflow-x-auto')
    expect(viewport).not.toHaveClass('gap-1')
    expect(viewport).not.toHaveClass('items-center')
    expect(
      content.querySelectorAll('[data-slot="navigator-item"]')
    ).toHaveLength(2)
  })
```

- [ ] **Step 2: Run the test and confirm it fails for the right reason**

Run: `cd packages/components && pnpm vitest run src/components/Navigator/Navigator.test.tsx -t 'lays the strip row out'`

Expected: FAIL on the first `toHaveClass` — the content wrapper's only class is
`min-w-0`, and `gap-1` / `items-center` are on the viewport. If it passes, the
assertion is not testing what it claims; fix it before continuing.

- [ ] **Step 3: Split the variant in `variants.ts`**

Replace `navigatorSecondaryStripViewportVariants` (currently lines 332-338):

```ts
// The scrolling box, and nothing else. The row itself belongs to the content
// wrapper below: `ScrollArea.Content` sits between this element and the items,
// so flex classes here would lay out a single block child, and the inline-flex
// items inside that child would wrap as inline content — which is exactly the
// bug this split fixes.
export const navigatorSecondaryStripViewportVariants = cva([
  'relative overflow-x-auto overscroll-x-contain'
])

// The row. `flex` overrides `tabsListVariants`' `inline-flex`, and the
// horizontal inset lives here rather than on the viewport so it scrolls with
// the items and the last one can still reach the pane's edge. Base UI sets
// `min-width: fit-content` inline on this element, which is what lets the row
// exceed the viewport instead of being clamped to it — do not pass
// `fitWidth={false}`, which is the opposite of what a horizontal scroller wants.
export const navigatorSecondaryStripContentVariants = cva([
  cn(
    tabsListVariants({ emphasis: 'subtle' }),
    'flex',
    'px-[calc(var(--content-inset)+var(--spacing))]'
  )
])
```

- [ ] **Step 4: Apply the row class in `NavigatorPaneChrome.tsx`**

Import `navigatorSecondaryStripContentVariants` alongside the two existing
variant imports, and replace the bare `<ScrollArea.Content>` on line 38:

```tsx
        <ScrollArea.Content
          className={navigatorSecondaryStripContentVariants()}
        >
```

Leave `fitWidth` alone — the default `true` is correct here.

Then add `navigatorSecondaryStripContentVariants` to the variant export list in
`packages/components/src/components/Navigator/index.tsx`, next to
`navigatorSecondaryStripViewportVariants`.

- [ ] **Step 5: Run the tests, typecheck and lint**

```bash
cd packages/components && pnpm vitest run src/components/Navigator/Navigator.test.tsx
```
Expected: PASS, act warnings ≤ 2. Report the count explicitly.

```bash
cd /Users/lukebrooker/Code/roadie && pnpm typecheck && pnpm lint
```
Expected: PASS.

- [ ] **Step 6: Verify in a real browser**

Rebuild the components package so the docs site picks the change up, then
restart nothing — the dev server watches `dist`:

```bash
pnpm --filter @oztix/roadie-components build
```

Resize the Playwright page to 390×844, load
`http://localhost:9614/foundations/accessibility`, and run this exactly. It is
the same probe that reproduced the bug, so the numbers are directly comparable
to the ones in this plan's preamble:

```js
async () => {
  const strip = document.querySelector('[data-slot="navigator-secondary-strip"]')
  const vp = strip.querySelector('[data-slot="navigator-secondary-strip-viewport"]')
  const ind = vp.querySelector('[data-slot="navigator-indicator"]')
  const active = vp.querySelector('[data-slot="navigator-item"][aria-current]')
  const items = [...vp.querySelectorAll('[data-slot="navigator-item"]')]
    .map((e) => Math.round(e.getBoundingClientRect().y))
  const aligned = () => {
    const i = ind.getBoundingClientRect(), a = active.getBoundingClientRect()
    return Math.abs(i.x - a.x) < 1.5 && Math.abs(i.width - a.width) < 1.5
  }
  const atRest = aligned()
  vp.scrollLeft = 300
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))
  return {
    rows: [...new Set(items)].length,
    stripHeight: Math.round(strip.getBoundingClientRect().height),
    scrollWidth: vp.scrollWidth,
    clientWidth: vp.clientWidth,
    indicatorAlignedAtRest: atRest,
    indicatorAlignedAfterScroll: aligned()
  }
}
```

Required: `rows: 1`, `stripHeight: 40`, `scrollWidth` well above `clientWidth`
(≈1361 at this width), and both `indicatorAligned*` `true`.

Then check three more things by eye at 390px, because the class split moves
padding between boxes:

- the strip still sits flush against the header's bottom edge with no gap
  (Task 22 landed `--pane-header-pad-b` for exactly this — confirm both bottoms
  are at the same y)
- it still bleeds edge to edge, full 390px
- the indicator does not slide in from the corner on first paint
  (`data-[ready=false]` guards this)

Finally confirm nothing regressed at desktop: at 1200px the strip is
`md:hidden` and the rail is unaffected by this change, but load
`/components/navigator` at 1200px and confirm the rail still scrolls and its
indicator still tracks.

- [ ] **Step 7: Commit**

```bash
git add packages/components/src/components/Navigator
git commit -m "fix(navigator): lay the mobile section strip out on its scrolling content"
```

---

## Task 2: Page titles in the header for hand-authored `.tsx` pages

Task 20 moved 45 `.mdx` titles into `Pane.Header` and left the `.tsx` pages
behind because the manifest's title walk reads `page.mdx` only. This finishes
that migration.

**Files:**
- Modify: `docs/src/lib/component-manifest.ts:31-56,75-127`
- Modify: `docs/src/app/layout.tsx:10,273`
- Modify: `docs/src/components/Navigation.tsx:71-73,415-423`
- Modify: 16 pages listed in Step 4
- Test: manual, in a browser — the docs site has no unit test for the manifest

**Interfaces:**
- Produces: `getPageTitles(): Promise<Record<string, string>>` — replaces
  `getMdxPageTitles`, same shape, now covering `page.tsx` as well as `page.mdx`.

- [ ] **Step 1: Widen the metadata regex**

`component-manifest.ts` matches metadata in two places (`readMetadata` line 35
and `collectMdxTitle` line 82) with the same literal:

```ts
content.match(/export const metadata = ({[\s\S]*?})/m)
```

Two foundations pages write `export const metadata: Metadata = {`, which this
misses. Introduce one shared constant near the top of the file and use it in
both places:

```ts
// Pages write either `export const metadata = {` or, in TypeScript,
// `export const metadata: Metadata = {`. Both have to match, or a page
// silently resolves no title.
const METADATA_RE = /export const metadata(?:\s*:\s*[\w.]+)?\s*=\s*({[\s\S]*?})/m
```

- [ ] **Step 2: Teach the title walk to read `page.tsx`**

Replace `collectMdxTitle` (lines 75-94) with a filename-agnostic version, and
rename it to match what it now does:

```ts
async function collectPageTitle(
  dir: string,
  route: string,
  out: Record<string, string>
): Promise<void> {
  // `.mdx` first: if a route somehow had both, the authored content page wins.
  for (const file of ['page.mdx', 'page.tsx']) {
    let content: string
    try {
      content = await readFile(join(dir, file), 'utf-8')
    } catch {
      continue // No page of this kind in this directory.
    }
    const match = content.match(METADATA_RE)
    if (!match) return
    try {
      const parsed = new Function(`return ${match[1]}`)()
      if (parsed.title) out[route] = parsed.title
    } catch {
      console.error(`Error parsing metadata for ${route}`)
    }
    return
  }
}
```

Rename `walkMdxTitles` → `walkPageTitles` and update its recursive call and its
call to `collectPageTitle`. Rename `getMdxPageTitles` → `getPageTitles` and
update its docblock's opening line from "sourced from every `.mdx` page's own
`metadata.title`" to "sourced from every page's own `metadata.title`, `.mdx`
and `.tsx` alike". **Leave the rest of that docblock alone** — the paragraph
about the nav rail shortening labels is still exactly right and is the reason
this reads metadata rather than nav labels.

Then update the two call sites: `docs/src/app/layout.tsx:10` (the import) and
`:273` (the call).

- [ ] **Step 3: Fix the comment that this makes false**

`docs/src/components/Navigation.tsx:416-418` currently reads:

```tsx
            {/* Pages without a mapped .mdx title (foundations, the homepage,
                debug routes) render their own h1 in-content, so no header
                title is declared here for them — one h1 per page either way. */}
```

Foundations pages are no longer in that set. Replace it with:

```tsx
            {/* The homepage and the debug routes declare no metadata.title, so
                they render no header title and keep their own in-content h1 —
                one h1 per page either way. */}
```

Also update the `pageTitles` prop docblock at line 71-72, which names
`getMdxPageTitles`.

- [ ] **Step 4: Strip the 16 inline titles**

Each of these declares `metadata.title` matching its heading exactly, so the
header renders the same text the body is losing. Remove **only** the
`<h1 className='text-display-prose-1 text-strong'>…</h1>` element:

| File | `<h1>` at |
| --- | --- |
| `docs/src/app/foundations/accessibility/page.tsx` | 17 |
| `docs/src/app/foundations/app-shell/page.tsx` | 41 |
| `docs/src/app/foundations/colors/page.tsx` | 72 |
| `docs/src/app/foundations/elevation/page.tsx` | 120 |
| `docs/src/app/foundations/iconography/page.tsx` | 72 |
| `docs/src/app/foundations/interactions/page.tsx` | 28 |
| `docs/src/app/foundations/layout/page.tsx` | 33 |
| `docs/src/app/foundations/linking/page.tsx` | 17 |
| `docs/src/app/foundations/motion/page.tsx` | 152 |
| `docs/src/app/foundations/performance/page.tsx` | 17 |
| `docs/src/app/foundations/shape/page.tsx` | 105 |
| `docs/src/app/foundations/theming/page.tsx` | 17 |
| `docs/src/app/foundations/typography/page.tsx` | 54 |
| `docs/src/app/foundations/view-transitions/page.tsx` | 17 |
| `docs/src/app/migration/page.tsx` | 90 |
| `docs/src/app/tokens/reference/page.tsx` | 86 |

**Three things not to touch:**

1. **`docs/src/app/page.tsx:45`** — the homepage's `<h1>`. It declares no
   `metadata`, gets no header title, and keeps its heading. Deliberate.
2. **`docs/src/app/components/page.tsx`** — has `metadata.title` and no inline
   `<h1>`. It gains a header title from Step 2 and needs no edit at all. It is
   the one page that currently renders no `<h1>` anywhere; confirm in Step 5
   that it now does.
3. **Every other `<h1>` string in these files is a code example**, not a page
   heading: `migration/page.tsx` lines 60, 383, 1151 and
   `foundations/typography/page.tsx` lines 227, 509, 517, 537, 544 all sit
   inside `code=` strings or prose about the type scale. Grepping `<h1` will
   surface them — match on the full `text-display-prose-1 text-strong` class
   string, and re-read each hunk before saving.

The prevailing shape is an `<h1>` and a lead paragraph inside a
`<div className='grid gap-3'>`:

```tsx
      <div className='grid gap-3'>
        <h1 className='text-display-prose-1 text-strong'>Accessibility</h1>
        <p className='text-lg text-subtle'>…</p>
      </div>
```

**Keep the lead paragraph** — it is the page's description and belongs in the
body. Where removing the `<h1>` leaves that wrapper with the paragraph as its
only child, collapse the wrapper too, since a `grid gap-3` around one element
is dead structure:

```tsx
      <p className='text-lg text-subtle'>…</p>
```

Where the wrapper still holds two or more children, leave it. Not every page
follows this shape — read each one.

These are `.tsx`, so `prettier` is safe on them, unlike the `.mdx` pages Task
20 edited. Run `pnpm format` before committing and re-read the diff.

- [ ] **Step 5: Verify in a real browser**

```bash
pnpm --filter docs typecheck
```
Expected: PASS. (Do **not** run a docs build — the dev server is running.)

Then at `http://localhost:9614`, at both 390 and 1200px, across at least
`/foundations/accessibility`, `/foundations/typography` (two
`text-display-prose-1` occurrences, only one of them the title),
`/foundations/elevation` (the `: Metadata` annotation), `/components`,
`/migration` and `/` (the untouched homepage):

```js
() => ({
  path: location.pathname,
  h1s: [...document.querySelectorAll('h1')].map((e) => ({
    text: e.textContent.trim().slice(0, 40),
    inHeader: !!e.closest('[data-slot="pane-header"]')
  }))
})
```

Required, per page:

- exactly **one** `<h1>`
- on every page except `/`, it is `inHeader: true` and its text matches that
  page's `metadata.title`
- on `/`, it is `inHeader: false` — unchanged

Then, by eye on `/foundations/typography` at 390px:

- the title collapses on scroll into the compact header title, which scrolls
  back to top on tap
- the on-this-page rail still lists the right headings and highlights the
  right one as you scroll — `useDocHeadings` collects `h2, h3` from
  `#docs-content` and seeds from every existing id, so removing an `h1` that
  never carried a rehype-slug id should be inert; confirm rather than assume
- the section strip from Task 1 still sits directly under the title

- [ ] **Step 6: Commit**

```bash
git add docs/src
git commit -m "fix(docs): source page titles from .tsx metadata so every page titles its header"
```

Then confirm nothing unexpected was swept in — `git show --stat HEAD` must not
list `docs/src/app/debug/pane-stack/`.

---

## Definition of done

From a cleared incremental-build state:

```bash
find . -name "*.tsbuildinfo" -not -path "*/node_modules/*" -delete
pnpm typecheck && pnpm lint && pnpm test
```

All three pass. Act warnings ≤ 2 in `Navigator.test.tsx` and ≤ 5 across the
suite — report both counts explicitly, and remember the suite is already
exactly at 5.

Both browser verifications above pass at 390px, and the rail is unregressed at
1200px.

The branch stays unmerged with no upstream. Do not merge or push.
