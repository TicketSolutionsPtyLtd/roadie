# Navigator Phase 3 — the tab bar stops animating layout

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove all three of the mobile tab bar's layout-property animations,
fix an input-blocking bug the investigation uncovered, add an iOS-style select
bounce, and stop the mobile strip tracking `Tabs`' design by eye.

**Architecture:** The bar keeps **one box across both states**, so nothing needs
to grow. Collapse becomes: the pill surface fades (paint only), the middle tabs
`scale` to nothing, and the two edge circles `translate` to the edges by a
constant derived from the same container query that sizes the columns. No JS
measurement, no `matchMedia`.

**Tech Stack:** React 19, TypeScript strict, CVA, Tailwind v4, Base UI,
Vitest + React Testing Library.

## What was measured before this plan was written

All of it live, at 390×844, on `/foundations/accessibility`. Numbers here are
known-good targets, not estimates.

**The bar is already the same box in both states.** Five tabs saturate the
`max-w-[calc(100%-1rem)]` cap, so the hug-width expanded bar and the
`inset-x-2` collapsed bar land identically:

| | expanded | collapsed |
| --- | --- | --- |
| bar `x` | 8 | 8 |
| bar `width` | **374** | **374** |
| bar `height` | 68 | 56 |

This is why the fix is tractable at all. The Phase 2 follow-ups concluded it was
possible "only by removing the collapsed tabs from the layout entirely" — true
of the *current* model, which switches from `w-fit` grid to full-width flex, but
not true if the bar simply stops changing width.

**The circle travel is a constant.** Expanded, tab 1's centre is at `51.8`, so a
56px circle centred there starts at `x: 23.8` and must land at `x: 8` —
**−15.8px**, with tab 5 the mirror. That decomposes exactly as
`bar padding (8px) + (column width − circle) / 2 (7.8px)`, and the column width
is already `calc((100cqw − 2rem) / 5)`. So the travel is expressible in CSS off
the same container query — no measurement.

**Collapsed, the bar swallows all input across its full width.** `elementFromPoint`
at the collapsed bar's centre `(195, 800)` returns `navigator-tab-bar`, not the
content beneath. The bar is `374×56` with `pointer-events: auto`, and its
`flex-1` spacer is `pointer-events: auto` too. The hit chain is
`navigator-tab-bar → navigator → body → html` — the scrolling pane viewport is
**not** an ancestor, so a touch-drag starting in that strip finds no scrollable
ancestor and scrolls nothing. **On a phone the bottom 56px of every page is dead
to both tapping and swiping whenever the bar is collapsed** — which is the state
you reach by scrolling. This is a live defect on the branch today, not something
this plan introduces, and the user named fixing it as a condition of the
restructure.

**`animate-pop` already exists and is used nowhere.**
`packages/core/src/css/motion.css:107` defines `@keyframes pop` as
`scale(1) → scale(1.12) at 40% → scale(1)` — exactly the iOS bounce. The
`@utility animate-pop` at `:202` binds it to `--duration-slowest` (600ms), which
is an attention-cue duration, not a tap response. Task 3 reuses the keyframe at
a tap-appropriate duration rather than inventing a second one.

## Global Constraints

Every task's requirements implicitly include this section.

- **Only `translate` / `scale` / `opacity` may be animated.** `background-color`
  and `box-shadow` are **paint, not layout, and are explicitly allowed** — that
  is what lets the pill surface fade without a layout change.
- **Tailwind v4 emits `translate`, `scale` and `rotate` as independent CSS
  properties, never `transform`.** A `transition-[transform,…]` list paired with
  a translate utility animates nothing. **This has shipped four times on this
  branch**, with class strings that read correctly every time. Compile and read
  the emitted `transition-property`; never trust the class string.
  Note the corollary for Task 3: `@keyframes pop` animates `transform: scale()`,
  which is a *different property* from the independent `scale` the utilities
  emit. The two compose rather than conflict — but do not assume a `scale-*`
  utility will override the keyframe, or vice versa.
- **No `matchMedia` or breakpoint logic anywhere in `packages/components/src`.**
  JS owns depth; CSS owns whether depth matters.
- **Two breakpoints, never conflated.** `md` (768) flips nav form; `lg` (1024)
  flips pane arrangement. The tab bar is a nav-form concern: `md:`.
- **`Navigator` imports from `Pane`, never the reverse.**
- **Act-warning budgets: `Navigator.test.tsx` ≤ 2, whole suite ≤ 5. The suite is
  EXACTLY at 5** (Navigator 2, Tabs 3, plus one each in `IconButton.test.tsx`
  and `paneStack.test.ts`). No headroom. A new test that adds a warning breaches
  it; fix the warning or consolidate, never raise the number.
- **`pnpm --filter … test -- <file>` does not filter.** Use
  `cd packages/components && pnpm vitest run <path>`.
- **Prove every new assertion fails against the unfixed code.**
- **`react-hooks/exhaustive-deps` is not registered in `packages/components`** —
  an `eslint-disable` for it is a hard error.
- **`docs/src/app/debug/pane-stack/` is the user's untracked file.** Never
  stage, edit or delete it. Stage explicit paths only.
- **Never run `pnpm --filter docs build`** — the docs dev server runs on 9614.
- **Every rendered leaf carries a kebab-case `data-slot`.**
- **Comments explain *why*, never *what*.** A comment left false by a change is
  a defect — this branch has shipped two of those in the last day.
- Use the **Playwright MCP tools** for browser work; the chrome-devtools MCP
  profile is held by a stale Chrome. `browser_resize` to 390×844, and **have the
  probe report `innerWidth`** — an all-zero reading earlier in this project was
  the `md:hidden` desktop branch, and a naive alignment check passed trivially
  against two empty rects.

---

## File structure

**Modified**

| File | Change |
| --- | --- |
| `packages/components/src/components/Navigator/variants.ts` | tab bar keeps one box; tab collapse moves to `scale`/`opacity`; circle travel becomes a `translate` constant; indicator gains a translate-only tab-bar surface; strip variants import shared fragments |
| `packages/components/src/components/Navigator/NavigatorPrimary.tsx` | pill backing element; `pointer-events` gating; spacer removal |
| `packages/components/src/components/Navigator/NavigatorTab.tsx` | select-bounce on the icon |
| `packages/components/src/components/Navigator/NavigatorIndicator.tsx` | translate-only positioning for the tab bar |
| `packages/core/src/css/motion.css` | a tap-duration bounce utility beside `animate-pop` |
| `packages/components/src/components/Tabs/variants.ts` | export the shared fragments the strip currently copies |
| `packages/components/src/components/Navigator/Navigator.test.tsx` | new suites per task |

---

## Task 1: The bar keeps one box, and stops swallowing input

The largest task. It has a delegated sub-decision — read Step 3 before starting.

**Files:**
- Modify: `packages/components/src/components/Navigator/variants.ts:125-215`
- Modify: `packages/components/src/components/Navigator/NavigatorPrimary.tsx:510-565`
- Test: `packages/components/src/components/Navigator/Navigator.test.tsx`

**Interfaces:**
- Produces: `navigatorTabBarPillVariants` — the backing surface's CVA, exported
  from `variants.ts` and re-exported from `Navigator/index.tsx` alongside
  `navigatorTabBarVariants`.
- Consumes: `navigatorTabBarVariants({ collapsed, hidden })` and
  `navigatorTabVariants({ active, presentation })`, both already in use at
  `NavigatorPrimary.tsx:521` and `NavigatorTab.tsx:76`.

- [ ] **Step 1: Reproduce the input-blocking bug and record the numbers**

Before changing anything, at 390×844 on `/foundations/accessibility`, scroll the
pane to collapse the bar and run this. You need the failing baseline to prove
the fix:

```js
async () => {
  const pane = document.querySelector('[data-slot="pane-viewport"]')
  pane.scrollTop = 800
  pane.dispatchEvent(new Event('scroll', { bubbles: true }))
  await new Promise((r) => setTimeout(r, 800))
  const bar = document.querySelector('nav[data-collapsed]')
  const b = bar.getBoundingClientRect()
  const hit = document.elementFromPoint(
    Math.round(b.x + b.width / 2),
    Math.round(b.y + b.height / 2)
  )
  return {
    innerWidth,
    collapsed: bar.dataset.collapsed,
    hitSlot: hit?.dataset?.slot ?? hit?.tagName,
    barBlocksMiddle: bar.contains(hit)
  }
}
```

Expected before the fix: `collapsed: 'true'`, `hitSlot:
'navigator-tab-bar'`, `barBlocksMiddle: true`.

- [ ] **Step 2: Write the failing tests**

Three behaviours, all of which fail today. Put them in `Navigator.test.tsx`
alongside the existing tab-bar suite — find it by searching for
`data-collapsed`, and reuse that block's helpers (`tabBarOf` exists; the rail
carries identically-labelled controls, so every query must be bar-scoped).

```tsx
  it('leaves the collapsed bar transparent to input in the middle', async () => {
    // The collapsed bar spans the full width but shows only two edge circles.
    // Everything between them must reach the page beneath — jsdom has no hit
    // testing, so this pins the mechanism: the bar itself takes no pointer
    // events and each circle puts them back.
    const { container } = render(tree({ collapsed: true }))
    await flushViewportMeasurement()

    const bar = tabBarOf(container)!
    expect(bar).toHaveClass('pointer-events-none')
    for (const circle of bar.querySelectorAll('[data-circle-side]')) {
      expect(circle).toHaveClass('pointer-events-auto')
    }
  })

  it('collapses a middle tab with scale, never a layout property', async () => {
    const { container } = render(tree({ collapsed: true }))
    await flushViewportMeasurement()

    const hidden = tabBarOf(container)!.querySelector(
      '[data-slot="navigator-item"]:not([data-circle-side])'
    )!
    expect(hidden).toHaveClass('scale-0', 'opacity-0')
    expect(hidden).not.toHaveClass('max-w-0')
  })

  it('never names a layout property in the bar or tab transitions', async () => {
    // The branch's non-negotiable, pinned. Guards the exact regression this
    // task exists to remove, and would fail against today's
    // transition-[padding,…] and transition-[max-width,…].
    const { container } = render(tree({ collapsed: true }))
    await flushViewportMeasurement()

    const bar = tabBarOf(container)!
    const banned = ['padding', 'max-width', 'width', 'height', 'left', 'top']
    const classes = [
      bar.className,
      ...Array.from(bar.querySelectorAll('[data-slot="navigator-item"]')).map(
        (tab) => tab.className
      )
    ].join(' ')
    const transitions = classes.match(/transition-\[[^\]]+\]/g) ?? []
    expect(transitions.length).toBeGreaterThan(0)
    for (const transition of transitions) {
      for (const property of banned) {
        expect(transition).not.toContain(property)
      }
    }
  })
```

`tree({ collapsed: true })` may not exist in the shape you need — the bar's
collapse is driven by scroll state through context, not a prop. **Read how the
existing collapsed-bar tests drive it and follow that**, rather than adding a
test-only prop. If no existing test reaches the collapsed state, say so in your
report and drive it the way `NavigatorPrimary.tsx:369` derives `collapsed`.

- [ ] **Step 3: Run the tests, confirm they fail, then settle the pill mechanism**

Run: `cd packages/components && pnpm vitest run src/components/Navigator/Navigator.test.tsx -t 'collapsed bar'`

Expected: all three FAIL — there is no `pointer-events-none`, the hidden tab is
`max-w-0` not `scale-0`, and both transition lists name layout properties.

**The delegated decision.** The bar must be full width so the circles reach the
screen edges at any tab count, while the visible pill must hug its tabs so the
expanded look is unchanged. That needs the surface to be its own element. Two
mechanisms are viable and the choice depends on how the grid actually behaves —
**prototype both in the live browser and report which you chose and why**:

- **(a) Grid-area overlay.** The pill is a grid child placed in the same area as
  the tabs (`[grid-area:1/1/-1/-1]`), so it inherits the content's width.
  Cheapest markup, but `-1` resolves against the *explicit* grid, and this grid
  builds its columns implicitly via `grid-flow-col auto-cols-[…]` — verify it
  spans all tabs rather than one column before committing to it.
- **(b) Hug wrapper.** An inner `mx-auto w-fit relative` wrapper holds the grid,
  with the pill absolutely positioned to `inset-0` inside it. Robust regardless
  of grid behaviour, but the circles then need to escape that wrapper to reach
  the bar's edges — position them against the bar instead.

Whichever you pick, these hold: the pill carries `emphasis-floating rounded-full`
and `aria-hidden`, it is behind the tabs, and it fades on collapse via **opacity
only**.

- [ ] **Step 4: Rewrite `navigatorTabBarVariants`**

The bar's box stops changing. Drop the `collapsed` variant's width and padding
switch, keep `px-2 py-1` in both states, and remove `padding` from the
transition list:

```ts
    'motion-safe:transition-[background-color,box-shadow,translate,opacity,visibility] motion-safe:transition-discrete motion-reduce:transition-none'
```

`background-color` and `box-shadow` stay — they are paint, they are how the
surface now disappears, and they were already there. `padding` goes because
nothing changes it any more.

The `collapsed` variant reduces to input gating and nothing else:

```ts
      collapsed: {
        // The bar keeps its box when collapsed — only the surface fades and
        // the circles translate. It still spans the full width, so it must
        // stop taking input or it swallows every tap and swipe in the bottom
        // 56px of the page; each circle puts pointer events back.
        true: 'pointer-events-none',
        false: ''
      }
```

Delete the `flex-1` spacer at `NavigatorPrimary.tsx:564` — with the circles
translating rather than being pushed apart, nothing needs to space them, and the
spacer is one of the two elements currently blocking input. The comment above it
mentions a future CartDrawer mini-bar occupying that space; carry that note to
wherever it now belongs rather than dropping it.

- [ ] **Step 5: Rewrite the tab presentations**

In `navigatorTabVariants`, the transition loses both layout properties:

```ts
    'motion-safe:transition-[scale,translate,opacity,background-color] motion-reduce:transition-none'
```

and the three presentations become:

```ts
        // Full pill tab: icon over label, width from the bar's grid column.
        expanded: 'px-1 py-1.5 scale-100 opacity-100',
        // Collapsed floating circle. `translate-x` carries it to the bar's
        // padding edge: half the slack between the column and the circle,
        // plus the bar's own px-2. Derived from the same container query that
        // sizes the columns, so it needs no measurement.
        circle:
          'size-14 place-content-center bg-raised opacity-100 shadow-xl pointer-events-auto scale-100',
        // Collapsed, not a circle: scaled away but kept in the AT tree, so a
        // screen-reader user keeps the full destination set. It keeps its grid
        // track, which is now harmless — the bar no longer changes width.
        hidden: 'scale-0 px-0 opacity-0 pointer-events-none'
```

The circle's edge travel is `calc(0.5rem + ((100cqw - 2rem) / 5 - 3.5rem) / 2)`
— **−** that for the left circle, **+** for the right. Express it as a
`translate-x-[…]` / `-translate-x-[…]` pair keyed off `circleSide`, and confirm
the emitted `transition-property` contains `translate` and not `transform`.

`order-first` / `order-last` at `NavigatorTab.tsx:70-74` were what put the
circles at the ends of the collapsed flex row. With the grid keeping its
columns, reordering may now move a circle out of its own column and break the
translate constant — check whether they are still needed and say what you found.

Add `data-circle-side={circleSide}` to the rendered tab so the tests above can
select circles without asserting on classes.

- [ ] **Step 6: Run the tests, typecheck and lint**

```bash
cd packages/components && pnpm vitest run src/components/Navigator/Navigator.test.tsx
```
Expected: PASS, act warnings ≤ 2. Report the count.

```bash
cd /Users/lukebrooker/Code/roadie && pnpm typecheck && pnpm lint
```

- [ ] **Step 7: Verify in a real browser — the part that actually proves it**

```bash
pnpm --filter @oztix/roadie-components build
```

At 390×844 on `/foundations/accessibility`, collapsed and expanded, confirm all
of the following. The first two are the user's stated conditions.

```js
async () => {
  const pane = document.querySelector('[data-slot="pane-viewport"]')
  const bar = document.querySelector('nav[data-collapsed]')
  const at = async (top) => {
    pane.scrollTop = top
    pane.dispatchEvent(new Event('scroll', { bubbles: true }))
    await new Promise((r) => setTimeout(r, 800))
    const b = bar.getBoundingClientRect()
    const hit = document.elementFromPoint(
      Math.round(b.x + b.width / 2),
      Math.round(b.y + b.height / 2)
    )
    const circles = [...bar.querySelectorAll('[data-circle-side]')].map((c) => {
      const r = c.getBoundingClientRect()
      return { side: c.dataset.circleSide, x: Math.round(r.x), right: Math.round(r.right) }
    })
    return {
      collapsed: bar.dataset.collapsed,
      box: { x: Math.round(b.x), width: Math.round(b.width) },
      barBlocksMiddle: bar.contains(hit),
      hitSlot: hit?.dataset?.slot ?? hit?.tagName,
      pillOpacity: getComputedStyle(
        bar.querySelector('[data-slot="navigator-tab-bar-pill"]')
      ).opacity,
      transitionProperty: getComputedStyle(bar).transitionProperty,
      circles
    }
  }
  return { innerWidth, expanded: await at(0), collapsed: await at(800) }
}
```

Required:

- `innerWidth: 390` — if it is not, you are measuring the `md:hidden` desktop
  branch and every other number is meaningless
- **`collapsed.barBlocksMiddle: false`**, with `hitSlot` naming page content —
  the user's first condition
- **`collapsed.pillOpacity: '0'`** — the user's second condition, no visible
  background
- `expanded.box` and `collapsed.box` **identical**
- `transitionProperty` contains neither `padding` nor `transform`
- collapsed circles flush to the bar's padding edge: left `x` and right `right`
  matching the expanded box inset by `px-2`

Then confirm by hand, because a rect is not a rendering:

- a **drag** starting between the two collapsed circles scrolls the pane
- the collapse and expand animate smoothly rather than snapping, and
  `prefers-reduced-motion` suppresses them
- the expanded bar looks unchanged from `main`'s — compare screenshots
- **at fewer than five tabs**, the collapsed circles still reach the screen
  edges. `/components/navigator`'s examples have shorter bars; if none does,
  say so rather than skipping the check

- [ ] **Step 8: Commit**

```bash
git add packages/components/src/components/Navigator
git commit -m "fix(navigator): keep the tab bar's box on collapse and stop it swallowing input"
```

---

## Task 2: The tab bar's indicator slides on `translate`

`navigatorIndicatorVariants` at `variants.ts:411` transitions
`left, top, width, height` — four layout properties — for all three surfaces.

The tab bar's tabs are equal-width by construction
(`auto-cols-[calc((100cqw-2rem)/5)]`), so its indicator only ever **moves**. It
needs no resize and therefore no `scaleX`.

**The rail and the strip are out of scope and stay as they are.** Their items
are variable-width, so they would need `scaleX` plus a counter-scaled inner
element to avoid distorting `rounded-full` corners and the `emphasis-raised`
shadow while animating. That is a separate piece of work. Do not start it, and
do not leave a comment implying the remaining two are an oversight — record them
as deliberate.

**Files:**
- Modify: `packages/components/src/components/Navigator/variants.ts:404-440`
- Modify: `packages/components/src/components/Navigator/NavigatorIndicator.tsx`
- Test: `packages/components/src/components/Navigator/Navigator.test.tsx`

**Interfaces:**
- Consumes: `useSlidingIndicator(trackRef)` from `useSlidingIndicator.ts`, which
  publishes `--active-tab-left/top/width/height` and a `ready` flag. Its
  measurement already adds `track.scrollLeft`/`scrollTop` back, so the values
  are in the track's content space. **Do not change the hook** — both other
  surfaces depend on it unchanged.

- [ ] **Step 1: Write the failing test**

```tsx
  it('slides the tab bar indicator on translate, not on layout properties', async () => {
    const { container } = render(tree())
    await flushViewportMeasurement()

    const indicator = tabBarOf(container)!.querySelector(
      '[data-slot="navigator-indicator"]'
    )!
    const transitions = indicator.className.match(/transition-\[[^\]]+\]/g) ?? []
    expect(transitions.length).toBeGreaterThan(0)
    for (const transition of transitions) {
      expect(transition).toContain('translate')
      for (const property of ['left', 'top', 'width', 'height']) {
        expect(transition).not.toContain(property)
      }
      expect(transition).not.toContain('transform')
    }
  })
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `cd packages/components && pnpm vitest run src/components/Navigator/Navigator.test.tsx -t 'slides the tab bar indicator'`

Expected: FAIL — the class is
`motion-safe:data-[ready=true]:transition-[left,top,width,height]`.

- [ ] **Step 3: Give the indicator a translate-driven tab-bar surface**

The shared base at `variants.ts:411` currently applies the layout transition to
every surface. Move it into the per-surface branches so `rail` and `strip` keep
today's behaviour, and add a `tabBar` surface that is positioned once and moved
with `translate`:

- position it at the track's origin with `left-0 top-0` and the measured
  `w-[var(--active-tab-width)] h-[var(--active-tab-height)]`, which do not
  transition
- move it with `translate-x-[var(--active-tab-left)]
  translate-y-[var(--active-tab-top)]`
- transition `translate` only:
  `motion-safe:data-[ready=true]:transition-[translate]`

Keep `data-[ready=false]`'s no-transition behaviour exactly — it is what stops
the pill sliding in from (0,0) on first paint, and it is easy to lose here
because the pill now sits at the origin until its first translate.

Add a comment recording *why* the rail and strip did not follow: variable-width
items would need `scaleX` and a counter-scale, which is separate work — not an
oversight.

- [ ] **Step 4: Run the tests, typecheck and lint**

```bash
cd packages/components && pnpm vitest run src/components/Navigator/Navigator.test.tsx
```
Expected: PASS, act warnings ≤ 2.

- [ ] **Step 5: Verify in a real browser**

At 390×844, tap between tabs and confirm the pill slides rather than snapping,
lands exactly on the active tab, and does **not** slide in from the corner on
first paint. Then read the emitted CSS, because the class string is not
evidence — this exact trap has shipped four times on this branch:

```js
() => {
  const bar = document.querySelector('nav[data-collapsed]')
  const ind = bar.querySelector('[data-slot="navigator-indicator"]')
  const active = bar.querySelector('[data-slot="navigator-item"][aria-current]')
  const i = ind.getBoundingClientRect()
  const a = active.getBoundingClientRect()
  return {
    innerWidth,
    transitionProperty: getComputedStyle(ind).transitionProperty,
    translate: getComputedStyle(ind).translate,
    transform: getComputedStyle(ind).transform,
    alignedOnActive:
      i.width > 1 && Math.abs(i.x - a.x) < 1.5 && Math.abs(i.width - a.width) < 1.5
  }
}
```

Required: `transitionProperty` is exactly `translate`; `translate` is a real
pixel pair, not `none`; `alignedOnActive: true`. Also confirm the **rail's**
indicator at 1200px still tracks — the surfaces share one variant and one hook.

- [ ] **Step 6: Commit**

```bash
git add packages/components/src/components/Navigator
git commit -m "fix(navigator): slide the tab bar indicator on translate"
```

---

## Task 3: An iOS select bounce on the tab icon

The user's request: "a slight scale up and back down animation to tabs when
selecting, just like iOS."

The keyframe already exists — `@keyframes pop` at
`packages/core/src/css/motion.css:107` is `scale(1) → scale(1.12) at 40% →
scale(1)`. Reuse it. The existing `@utility animate-pop` binds it to
`--duration-slowest` (600ms), which is an attention-cue duration; a tap response
wants `--duration-moderate` (200ms) and the spring easing the file already
defines for transforms.

**Files:**
- Modify: `packages/core/src/css/motion.css:202-205`
- Modify: `packages/components/src/components/Navigator/NavigatorTab.tsx:56-58`
- Test: `packages/components/src/components/Navigator/Navigator.test.tsx`

**Interfaces:**
- Produces: `@utility animate-pop-tap` in core, available to every package.
- Consumes: `presentNavIcon(icon, active, className)` from
  `presentNavIcon.tsx`, called at `NavigatorTab.tsx:57` — the third argument is
  the icon's class string, which is where the utility goes.

- [ ] **Step 1: Add the utility to core**

Beside `animate-pop` in `motion.css`:

```css
/* A tap response, not an attention cue: `animate-pop` runs the same keyframe
   at 600ms, which reads as a notification. Selecting a tab wants the bounce to
   land under the finger. `--ease-spring` is the file's transform easing. */
@utility animate-pop-tap {
  animation: pop var(--duration-moderate) var(--ease-spring);
}
```

The reduced-motion reset at `motion.css:304` already flattens every animation to
`0.01ms`, so this needs no `motion-reduce:` guard of its own — **verify that in
the compiled CSS rather than assuming it**, and say so in your report.

- [ ] **Step 2: Write the failing test**

```tsx
  it('bounces a tab icon when it becomes the active destination', async () => {
    const { container } = render(tree())
    await flushViewportMeasurement()

    const bar = tabBarOf(container)!
    const activeIcon = bar
      .querySelector('[data-slot="navigator-item"][aria-current]')!
      .querySelector('[data-slot="navigator-tab-icon"]')!
    const idleIcon = bar
      .querySelector('[data-slot="navigator-item"]:not([aria-current])')!
      .querySelector('[data-slot="navigator-tab-icon"]')!

    expect(activeIcon).toHaveClass('animate-pop-tap')
    expect(idleIcon).not.toHaveClass('animate-pop-tap')
  })
```

This needs the icon to carry `data-slot="navigator-tab-icon"`. Check whether
`presentNavIcon` already sets one; add it if not, following the repo's
kebab-case dot-path rule.

**Slot naming, corrected during Task 2:** a tab-bar tab renders through
`NavigatorDestination` and so carries `data-slot="navigator-item"`, the same as
a rail row — there is no `navigator-tab` slot. Scope every tab query through
`tabBarOf(container)`, because the rail carries identically-labelled controls.

- [ ] **Step 3: Run it and confirm it fails**

Run: `cd packages/components && pnpm vitest run src/components/Navigator/Navigator.test.tsx -t 'bounces a tab icon'`

Expected: FAIL — no such class, and possibly no such `data-slot`.

- [ ] **Step 4: Apply it to the active tab's icon**

At `NavigatorTab.tsx:57`, the icon renders as
`presentNavIcon(icon, active, 'size-7')`. Add the utility when `active`:

```tsx
      {presentNavIcon(icon, active, cn('size-7', active && 'animate-pop-tap'))}
```

A CSS animation runs when the element starts matching its selector, so the
bounce fires as a tab *becomes* active and does not re-fire on re-render. Record
in a comment that re-tapping an already-active tab does **not** re-bounce — iOS
scrolls to top instead, which `Pane.Header`'s compact title already does.

Apply it to the **tab bar only**. The rail and the strip are not tap targets in
the same sense and were not part of the request; if you find the same icon
helper feeding them, scope the change so they are unaffected and say so.

- [ ] **Step 5: Run the tests, typecheck and lint**

```bash
cd packages/components && pnpm vitest run src/components/Navigator/Navigator.test.tsx
cd /Users/lukebrooker/Code/roadie && pnpm typecheck && pnpm lint
```
Expected: PASS, act warnings ≤ 2.

- [ ] **Step 6: Verify in a real browser**

```bash
pnpm --filter @oztix/roadie-core build && pnpm --filter @oztix/roadie-components build
```

The utility lives in core, so **core must be rebuilt or the class compiles to
nothing** — and a class that compiles to nothing still passes the jsdom test
above. Confirm the rule exists:

```js
() => {
  const icon = document.querySelector(
    'nav[data-collapsed] [data-slot="navigator-item"][aria-current] [data-slot="navigator-tab-icon"]'
  )
  const s = getComputedStyle(icon)
  return {
    innerWidth,
    animationName: s.animationName,
    animationDuration: s.animationDuration,
    animationTimingFunction: s.animationTimingFunction.slice(0, 40)
  }
}
```

Required: `animationName: 'pop'`, `animationDuration: '0.2s'`. If
`animationName` is `none`, the utility did not compile — check the safelist at
`packages/core/src/css/safelist.html`.

Then tap between tabs at 390px and watch it: the icon should bounce once,
briefly, and settle. If 1.12 reads as too much or 200ms as too slow at this
size, **report what you observed and recommend a value** rather than changing
the shared keyframe — it is a core token and other packages may adopt it.

- [ ] **Step 7: Commit**

```bash
git add packages/core/src/css/motion.css packages/components/src/components/Navigator
git commit -m "feat(navigator): bounce a tab icon when it becomes selected"
```

---

## Task 4: The strip stops tracking `Tabs` by eye

Three copies of one design, one of them explicitly maintained by eye:

- `navigatorSecondaryStripContentVariants` composes
  `tabsListVariants({ emphasis: 'subtle' })` — already an import, fine
- `NavigatorItem`'s `'strip'` branch composes
  `tabsTabVariants({ emphasis: 'subtle', size: 'sm' })` — also an import
- `navigatorIndicatorVariants`' `strip` surface carries a comment admitting it
  "visually echoes `tabsIndicatorVariants({ emphasis: 'subtle' })` … but can't
  import it: this indicator's positioning and var mapping are Navigator's own,
  so the two are kept in sync **by eye, not by import**"

**Migrating the strip to the real `Tabs` was tried in Phase 2 and correctly
refused**, verified against Base UI's source rather than its docs: `TabsTab`
hardcodes `role='tab'` regardless of `render`, so an anchor loses its link role;
`useCompositeItem`'s roving tabindex leaves only the active tab in Tab order;
and `aria-controls` is always emitted, resolving to nothing without a
`Tabs.Panel`. **Do not retry that migration.** This task is the agreed
alternative: export the shared *appearance* from `Tabs/variants.ts` so the third
copy imports it instead of tracking it.

**Files:**
- Modify: `packages/components/src/components/Tabs/variants.ts`
- Modify: `packages/components/src/components/Navigator/variants.ts` (the
  `strip` surface of `navigatorIndicatorVariants`)
- Test: `packages/components/src/components/Tabs/Tabs.test.tsx`

**Interfaces:**
- Produces: `tabsIndicatorSurfaceClass` — the appearance-only fragment
  (surface, radius, emphasis) shared by `tabsIndicatorVariants` and
  Navigator's `strip` surface, exported from `Tabs/variants.ts`. It must carry
  **no positioning and no CSS-variable mapping**: those are what differ between
  the two, and conflating them is what made the split necessary.

- [ ] **Step 1: Write the failing test**

The real failure mode is drift — the two falling out of sync — so pin them
*together*. In `Tabs.test.tsx`:

```tsx
  it('shares its indicator surface with the Navigator strip', () => {
    // The strip cannot use Tabs.Indicator (its positioning and var mapping are
    // Navigator's own), so the appearance is imported instead of copied. This
    // pins that it is genuinely one source: a change to the fragment reaches
    // both, and neither may inline its own copy.
    expect(tabsIndicatorSurfaceClass).not.toBe('')
    expect(tabsIndicatorVariants({ emphasis: 'subtle' })).toContain(
      tabsIndicatorSurfaceClass
    )
    expect(navigatorIndicatorVariants({ surface: 'strip' })).toContain(
      tabsIndicatorSurfaceClass
    )
  })
```

Importing a Navigator variant into `Tabs.test.tsx` crosses component folders. If
that offends the package's test conventions, put the test in
`Navigator.test.tsx` instead and import the Tabs fragment there — **the
direction that matters is that `Navigator` imports from `Tabs`, never the
reverse**, matching the `Navigator` → `Pane` seam. Say which you chose.

- [ ] **Step 2: Run it and confirm it fails**

Expected: FAIL — `tabsIndicatorSurfaceClass` does not exist.

- [ ] **Step 3: Extract the fragment**

In `Tabs/variants.ts`, lift the appearance out of `tabsIndicatorVariants` into
an exported constant, then compose it back so `Tabs` behaviour is unchanged.
Keep positioning and var mapping where they are.

- [ ] **Step 4: Import it into the strip surface**

In `navigatorIndicatorVariants`, replace the `strip` surface's hand-copied
appearance with the imported fragment, keeping Navigator's own positioning and
`--active-tab-*` mapping. **Delete the "kept in sync by eye, not by import"
comment** and replace it with one recording what is now shared and what
deliberately is not.

- [ ] **Step 5: Prove `Tabs` is visually unchanged**

The risk is regressing `Tabs` while refactoring for `Navigator`'s benefit.

```bash
cd packages/components && pnpm vitest run src/components/Tabs/Tabs.test.tsx
```
Expected: PASS with no snapshot churn. `Tabs.test.tsx` contributes 3 of the
suite's 5 act warnings — that count must not rise.

Then at `http://localhost:9614/components/tabs`, compare each emphasis against
`main` at 390 and 1200px.

- [ ] **Step 6: Run the full suite, typecheck and lint**

```bash
cd packages/components && pnpm vitest run
cd /Users/lukebrooker/Code/roadie && pnpm typecheck && pnpm lint
```
Report both act-warning counts.

- [ ] **Step 7: Verify the strip is unchanged**

At 390×844 on `/foundations/accessibility`, the strip's indicator must look and
behave exactly as before — this task is a refactor with no intended visual
change. Confirm it still scrolls, the indicator still tracks under scroll, and
it still hugs the header's bottom edge.

- [ ] **Step 8: Commit**

```bash
git add packages/components/src/components/Tabs packages/components/src/components/Navigator
git commit -m "refactor(tabs): share the indicator surface with the Navigator strip"
```

---

## Definition of done

From a cleared incremental-build state, and **with `--force`** so Turbo does not
replay a cache:

```bash
find . -name "*.tsbuildinfo" -not -path "*/node_modules/*" -delete
pnpm typecheck --force && pnpm lint --force && pnpm test --force
```

All three pass. Act warnings ≤ 2 in `Navigator.test.tsx` and ≤ 5 across the
suite — report both, and remember the suite is already exactly at 5.

At 390×844: the collapsed bar blocks no input in its middle, shows no
background, keeps the expanded bar's box, and animates only `translate`,
`scale`, `opacity`, `background-color` and `box-shadow`. The indicator slides on
`translate`. A tab icon bounces once when it becomes selected. The strip and
`Tabs` are visually unchanged.

At 1200px the rail is unregressed.

The branch is unmerged with no upstream. Do not merge or push.
