'use client'

import {
  type CSSProperties,
  type RefObject,
  useCallback,
  useEffect,
  useState
} from 'react'

import { useIsomorphicLayoutEffect } from '../../utils/useIsomorphicLayoutEffect'

/**
 * Every Navigator destination carries this pair — see NavigatorDestination.
 *
 * The pill tracks `data-current`, not `aria-current`. They agree on every
 * declared destination and part on one case: a section sitting on a sub-route
 * it never declared holds the pill — otherwise the rail reads as though
 * nowhere is selected — while `aria-current` stays with the exact page,
 * because the section is where you are, not the page you are on.
 *
 * `querySelector` returns the first match in document order, which is only
 * safe because nothing upstream lets two destinations in the same track
 * carry it at once: `NavigatorPrimary` gates every route tab's currency on no
 * disclosure being open (see `disclosureOpen`), so an open panel or the More
 * overflow is the sole current tab; the rail's own panel button never sets it
 * at all. A declared Secondary takes it from its parent, so a section and its
 * child can never both hold it. If a future currency-bearing control breaks
 * that invariant, this selector silently measures the wrong element instead
 * of erroring — tighten it (e.g. scope past disclosures) if that ever needs
 * enforcing in code rather than by convention.
 */
export const ACTIVE_DESTINATION_SELECTOR =
  '[data-slot="navigator-item"][data-current]'

export type SlidingIndicatorState = {
  style: CSSProperties | undefined
  ready: boolean
}

type Geometry = { left: number; top: number; width: number; height: number }

const sameGeometry = (a: Geometry | null, b: Geometry | null) =>
  a === b ||
  (a !== null &&
    b !== null &&
    a.left === b.left &&
    a.top === b.top &&
    a.width === b.width &&
    a.height === b.height)

/**
 * The active element's layout box in the track's content space, or null when
 * the `offsetParent` chain doesn't reach the track.
 *
 * Offsets rather than rects because a rect includes `translate`/`scale`: the
 * tab bar's collapse animates its tabs on transforms alone, so a rect sampled
 * while that transition runs reports the travelling circle — a full column
 * left of the tab — and nothing corrects it once the bar expands, because no
 * border box ever changed for the ResizeObserver to see. Offsets are layout,
 * which changes discretely on the commit that swaps the classes, so they are
 * already final whenever this runs. They are also already in content space,
 * which is why no `scrollLeft`/`scrollTop` correction belongs here.
 *
 * Each surface's track is `relative` — it has to be, since the indicator is
 * absolutely positioned inside it — so it is normally the `offsetParent`
 * directly. The walk covers a positioned wrapper appearing in between.
 */
const layoutBoxWithin = (
  active: HTMLElement,
  track: HTMLElement
): Geometry | null => {
  let left = 0
  let top = 0
  let node: Element | null = active

  while (node instanceof HTMLElement && node !== track) {
    left += node.offsetLeft
    top += node.offsetTop
    node = node.offsetParent
  }

  return node === track
    ? { left, top, width: active.offsetWidth, height: active.offsetHeight }
    : null
}

/**
 * Fallback for a track the `offsetParent` chain can't reach — one made a
 * containing block by `transform`/`filter` rather than `position`, and jsdom,
 * which has no layout at all. Rect deltas are viewport-space; the indicator is
 * positioned in the track's content space, so a scrolled track needs its
 * offset added back.
 */
const rectBoxWithin = (active: HTMLElement, track: HTMLElement): Geometry => {
  const trackRect = track.getBoundingClientRect()
  const activeRect = active.getBoundingClientRect()

  return {
    left: activeRect.left - trackRect.left + track.scrollLeft,
    top: activeRect.top - trackRect.top + track.scrollTop,
    width: activeRect.width,
    height: activeRect.height
  }
}

/**
 * Measures the current `[aria-current]` destination inside `trackRef` and
 * publishes its box as `--active-tab-*` custom properties — the same var names
 * Base UI's Tabs indicator uses, so the consuming CSS reads the same either way.
 *
 * Role-neutral on purpose: it reads navigation currency, never `aria-selected`,
 * so the same hook drives the tab bar, the secondary strip and the rail.
 */
export function useSlidingIndicator(
  trackRef: RefObject<HTMLElement | null>
): SlidingIndicatorState {
  const [geometry, setGeometry] = useState<Geometry | null>(null)

  const measure = useCallback(() => {
    const track = trackRef.current
    const active = track?.querySelector<HTMLElement>(
      ACTIVE_DESTINATION_SELECTOR
    )

    if (!track || !active) {
      setGeometry((previous) => (previous === null ? previous : null))
      return
    }

    const next = layoutBoxWithin(active, track) ?? rectBoxWithin(active, track)

    setGeometry((previous) => (sameGeometry(previous, next) ? previous : next))
  }, [trackRef])

  // The indicator is a child of the element `trackRef` points at, so React
  // attaches the track's ref after this first layout effect — `trackRef.current`
  // is null on mount and only the ResizeObserver's initial observation (below)
  // recovers it. Don't drop the `typeof ResizeObserver` guard or "simplify"
  // this effect on that assumption: without it there is no indicator, ever.
  //
  // No dependency array on purpose: the track's contents (which destination
  // is `[aria-current]`) can change on a commit that leaves the active value
  // untouched — e.g. the secondary strip swapping to a new section's items,
  // published a tick after the value change by a sibling's effect. Re-running
  // on every commit is what catches that; `measure` only calls `setGeometry`
  // when the box actually moved, so this can't loop.
  useIsomorphicLayoutEffect(measure)

  useEffect(() => {
    const track = trackRef.current
    if (!track || typeof ResizeObserver === 'undefined') return

    const observer = new ResizeObserver(measure)
    observer.observe(track)
    for (const destination of track.querySelectorAll<HTMLElement>(
      '[data-slot="navigator-item"]'
    )) {
      observer.observe(destination)
    }
    return () => observer.disconnect()
  }, [trackRef, measure])

  const ready = geometry !== null && geometry.width > 0 && geometry.height > 0

  return {
    ready,
    style: geometry
      ? ({
          '--active-tab-left': `${geometry.left}px`,
          '--active-tab-top': `${geometry.top}px`,
          '--active-tab-width': `${geometry.width}px`,
          '--active-tab-height': `${geometry.height}px`
        } as CSSProperties)
      : undefined
  }
}
