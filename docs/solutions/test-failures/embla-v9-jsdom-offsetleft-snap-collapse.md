---
title: Embla v9 carousel snaps collapse to a single point in jsdom because NodeHandler reads offsetLeft, not getBoundingClientRect
date: 2026-04-14
category: test-failures
problem_type: test_environment_mismatch
components:
  - packages/components/src/components/Carousel
  - embla-carousel@9.0.0-rc02
keywords:
  - embla
  - jsdom
  - vitest
  - offsetLeft
  - slidesToScroll
  - snapList
  - layout stubs
  - NodeHandler
severity: medium
related_files:
  - packages/components/src/components/Carousel/Carousel.test.tsx
  - packages/components/src/components/Carousel/index.tsx
  - packages/components/vitest.setup.ts
---

# Embla v9 snaps collapse to a single point in jsdom

## Symptom

When testing a Carousel compound built on `embla-carousel@9.0.0-rc02` under Vitest + jsdom, switching the Roadie `slidesToScroll` default from Embla's native `1` to `'auto'` made 7 of 30 existing Carousel tests fail with assertions that couldn't have been wrong — `Previous` / `Next` buttons not rendering, `selectedIndex` frozen at 0, `Dots` missing entirely:

```
FAIL  Carousel > renders Previous and Next nav buttons
FAIL  Carousel > disables Previous at the start boundary with loop=false
FAIL  Carousel > does NOT disable Previous with loop=true
FAIL  Carousel > clicking Next advances the selected index
FAIL  Carousel > clicking a dot calls goTo with that index
FAIL  Carousel > Dots render one button per slide
FAIL  Carousel > keyboard: ArrowRight advances, ArrowLeft goes back (horizontal)
```

All seven tests used a simple `basis-full` fixture with 3 `Carousel.Item` children. In real browsers with 3 full-width slides, Embla produces 3 snap positions and the carousel behaves normally. In jsdom with `slidesToScroll: 'auto'`, a debug probe showed:

```js
api.snapList() // → [0]            (length 1, not 3)
api.selectedSnap() // → 0              (can't advance)
carousel.state.snapCount // → 1
carousel.state.canScroll // → false
carousel.state.canGoToNext // → false
```

`canScroll` was false, so `Carousel.Previous` / `.Next` / `.Dots` all auto-hid themselves. The carousel was essentially inert. The same fixture with `slidesToScroll: 1` (Embla's default) had been passing for weeks — only the change to `'auto'` tripped it.

## What didn't work

**First attempt: stub `HTMLElement.prototype.getBoundingClientRect`**. The assumption was Embla reads slide rectangles via the standard DOM API, and jsdom's default `{ x: 0, y: 0, width: 0, ... }` was collapsing positions. A stub that returned incremental `x` positions per slide based on DOM index was added:

```ts
HTMLElement.prototype.getBoundingClientRect = function () {
  const isSlide = this.getAttribute('role') === 'group' && ...
  if (isSlide && this.parentElement) {
    const index = [...this.parentElement.children].indexOf(this)
    return { x: index * 800, left: index * 800, width: 800, /* ... */ }
  }
  /* default */
}
```

The debug probe showed no change — `snapList` was still `[0]`. The stub was being installed but Embla wasn't reading from it.

## Root cause

Embla v9's internal `NodeHandler.getRect` — which is what populates the `containerRect` and `slideRects` that feed `ScrollSnaps`, `SlidesToScroll`, and the whole snap-computation chain — reads layout via the **four offset properties directly**, not `getBoundingClientRect`:

```js
// node_modules/embla-carousel@9.0.0-rc02/.../embla-carousel.esm.js ≈ line 1550
function getRect(node) {
  const { offsetTop: top, offsetLeft: left, offsetWidth, offsetHeight } = node
  return {
    top,
    left,
    width: offsetWidth,
    height: offsetHeight,
    right: left + offsetWidth,
    bottom: top + offsetHeight
  }
}
```

jsdom returns `0` for `offsetTop` and `offsetLeft` on every element (there's no layout engine to compute positions from flex children), and the Carousel test file was only stubbing `offsetWidth` / `offsetHeight` / `clientWidth` / `clientHeight`. With every slide reporting `offsetLeft: 0`, Embla saw the three slides as perfectly overlapping at `x = 0`, and `slidesToScroll: 'auto'` correctly concluded there was a single snap position.

`slidesToScroll: 1` had been working only by accident: with explicit "one slide per snap" semantics Embla never needed to derive snap counts from slide positions, so the zero offsets didn't collapse anything.

## The fix

Stub `HTMLElement.prototype.offsetLeft` with a per-instance getter that returns `index * SLIDE_WIDTH` for elements matching `[role="group"][aria-roledescription="slide"]`, and keep the existing `offsetWidth` / `offsetHeight` / `clientWidth` / `clientHeight` prototype stubs alongside it. Because the stub is installed from a test-file-local `beforeAll` (not the package-wide Vitest setup), it only affects Carousel tests.

```ts
// packages/components/src/components/Carousel/Carousel.test.tsx
const SLIDE_WIDTH = 800
const SLIDE_HEIGHT = 600

function stubPerInstanceOffsetLeft() {
  const original = Object.getOwnPropertyDescriptor(
    HTMLElement.prototype,
    'offsetLeft'
  )
  Object.defineProperty(HTMLElement.prototype, 'offsetLeft', {
    configurable: true,
    get(this: HTMLElement) {
      const isSlide =
        this.getAttribute('role') === 'group' &&
        this.getAttribute('aria-roledescription') === 'slide'
      if (isSlide && this.parentElement) {
        const siblings = Array.from(this.parentElement.children)
        return siblings.indexOf(this) * SLIDE_WIDTH
      }
      return 0
    }
  })
  layoutRestores.push(() => {
    if (original) {
      Object.defineProperty(HTMLElement.prototype, 'offsetLeft', original)
    } else {
      delete (HTMLElement.prototype as unknown as Record<string, unknown>)
        .offsetLeft
    }
  })
}

beforeAll(() => {
  stubLayoutProperty('offsetWidth', SLIDE_WIDTH)
  stubLayoutProperty('offsetHeight', SLIDE_HEIGHT)
  stubLayoutProperty('clientWidth', SLIDE_WIDTH)
  stubLayoutProperty('clientHeight', SLIDE_HEIGHT)
  stubPerInstanceOffsetLeft()
})
```

With this stub in place, `api.snapList()` returns `[0, 0.333…, 0.666…]` (length 3) in jsdom, and the full 30-test Carousel suite passes whether the default is `slidesToScroll: 1` or `'auto'`.

## Secondary fallout: `selectedSnap()` before/after comparison is fragile

A related gotcha surfaced while debugging. The Carousel actions had an optimistic "only update React state if Embla didn't move" check:

```ts
const before = api?.selectedSnap()
api?.goToNext()
if (api && api.selectedSnap() !== before) return // Embla moved; skip fallback
setSelectedIndex(/* optimistic */)
```

In real browsers this works because `api.selectedSnap()` returns the new value synchronously after `goToNext()`. In jsdom under `slidesToScroll: 'auto'`, Embla was now firing `select` events even when the snap value didn't change (same snap, position 0), so `before === after` was never a reliable "Embla didn't move" signal.

The fix is to track whether `onSelect` actually ran during the call via a ref that flips inside the `onSelect` callback:

```ts
const onSelectFiredRef = useRef(false)

const onSelect = useCallback((emblaApi) => {
  onSelectFiredRef.current = true
  setSelectedIndex(emblaApi.selectedSnap())
}, [])

// In each navigation action:
goToNext: () => {
  onSelectFiredRef.current = false
  api?.goToNext()
  if (onSelectFiredRef.current) return   // onSelect already updated state
  setSelectedIndex((current) => /* optimistic fallback */)
}
```

Deterministic regardless of what `api.selectedSnap()` reports — if the real `onSelect` handler ran during the call, skip the optimistic path; otherwise fall back.

## Prevention

- **When stubbing layout for Embla (or any DOM library) in jsdom, start from the library's source.** Grep the installed package for `offsetLeft` / `getBoundingClientRect` / `clientRect` / `DOMRect` before writing stubs. An assumption about which API the library reads is cheaper to verify once than to debug later.
- **If slide positions matter for your test, stub `offsetLeft` per-slide.** Prototype-level getters with `this`-aware logic let you return different values per element without touching global setup. The same pattern works for `offsetTop` in vertical layouts.
- **Scope layout stubs to a `beforeAll` / `afterAll` inside the specific test file that needs them.** The package-wide `vitest.setup.ts` originally contained the Carousel layout stubs and they silently changed the layout characteristics of every other component's tests (flagged in an earlier review). Test-file-local stubs with paired restores don't leak across files.
- **Treat `api.selectedSnap()` before/after as unreliable**. If you need to detect whether a library callback ran during a synchronous call, use a ref flag set inside the callback itself — not a state comparison on the library's getter.

## Related files

- `packages/components/src/components/Carousel/Carousel.test.tsx` — `stubPerInstanceOffsetLeft()` definition and `beforeAll` registration.
- `packages/components/src/components/Carousel/index.tsx` — `onSelectFiredRef` flow inside `onSelect` and each navigation action.
- `packages/components/vitest.setup.ts` — package-wide setup that intentionally does NOT touch `HTMLElement` layout properties (layout stubs live per-test-file).
- Embla source: `node_modules/.pnpm/embla-carousel@9.0.0-rc02/node_modules/embla-carousel/esm/embla-carousel.esm.js` — search for `function getRect` and `NodeHandler`.

## References

- Embla Carousel v9 options reference: https://www.embla-carousel.com/api/options/
- PR #34 (`feat/carousel-component`), commit `b8a680e` — the `slidesToScroll: 'auto'` default change that surfaced the issue and the test-file fix.
