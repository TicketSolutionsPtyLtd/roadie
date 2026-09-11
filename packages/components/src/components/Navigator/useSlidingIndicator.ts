'use client'

import {
  type CSSProperties,
  type RefObject,
  useCallback,
  useEffect,
  useRef,
  useState
} from 'react'

import { useIsomorphicLayoutEffect } from '../../utils/useIsomorphicLayoutEffect'

/**
 * `data-current`, not `aria-current`: a section on a sub-route it never
 * declared holds the pill but not `aria-current`. Assumes at most one current
 * destination per track — the first match wins.
 */
export const ACTIVE_DESTINATION_SELECTOR =
  '[data-slot="navigator-item"][data-current]'

export type SlidingIndicatorState = {
  style: CSSProperties | undefined
  ready: boolean
  /** Ready since an earlier commit and last moved to another destination, so it slides rather than jumps. */
  settled: boolean
}

type Box = { left: number; top: number; width: number; height: number }
type Geometry = Box & { right: number }

const sameGeometry = (a: Geometry | null, b: Geometry | null) =>
  a === b ||
  (a !== null &&
    b !== null &&
    a.left === b.left &&
    a.top === b.top &&
    a.right === b.right &&
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
): Box | null => {
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
const rectBoxWithin = (active: HTMLElement, track: HTMLElement): Box => {
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
 * Publishes the current destination's box inside `trackRef` as
 * `--active-tab-*`, the names Base UI's Tabs indicator uses.
 */
export function useSlidingIndicator(
  trackRef: RefObject<HTMLElement | null>
): SlidingIndicatorState {
  const [geometry, setGeometry] = useState<Geometry | null>(null)
  const [ready, setReady] = useState(false)
  const [settled, setSettled] = useState(false)
  // A destination resizing or reflowing in place snaps; only a change of destination slides.
  const [slides, setSlides] = useState(true)
  const geometryRef = useRef<Geometry | null>(null)
  const destinationRef = useRef<HTMLElement | null>(null)

  const measure = useCallback(() => {
    const track = trackRef.current
    const active = track?.querySelector<HTMLElement>(
      ACTIVE_DESTINATION_SELECTOR
    )
    const box =
      track && active
        ? (layoutBoxWithin(active, track) ?? rectBoxWithin(active, track))
        : null
    const visible = box !== null && box.width > 0 && box.height > 0

    setReady(visible)
    // The last box is kept while unready so the pill fades out where it was.
    if (!visible || !track || !active) return
    const next = {
      ...box,
      right: track.clientWidth - box.left - box.width
    }
    if (!sameGeometry(geometryRef.current, next)) {
      geometryRef.current = next
      setGeometry(next)
      setSlides(active !== destinationRef.current)
    }
    destinationRef.current = active
  }, [trackRef])

  // The indicator is a child of the element `trackRef` points at, so React
  // attaches the track's ref after this first layout effect — `trackRef.current`
  // is null on mount and only the ResizeObserver's initial observation (below)
  // recovers it. Don't drop the `typeof ResizeObserver` guard or "simplify"
  // this effect on that assumption: without it there is no indicator, ever.
  //
  // No dependency array: which destination holds the pill can change on a
  // commit that leaves the active value untouched (a menu opening). `measure`
  // only sets geometry when the box moved, so this can't loop.
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

  useIsomorphicLayoutEffect(() => {
    if (!ready) {
      setSettled(false)
      return
    }
    if (settled) return
    // Flush the first box's styles before enabling the translate transition,
    // or the pill slides in from the track's origin.
    trackRef.current?.getBoundingClientRect()
    setSettled(true)
  }, [trackRef, ready, settled])

  return {
    ready,
    settled: ready && settled && slides,
    style: geometry
      ? ({
          '--active-tab-left': `${geometry.left}px`,
          '--active-tab-top': `${geometry.top}px`,
          '--active-tab-right': `${geometry.right}px`,
          '--active-tab-width': `${geometry.width}px`,
          '--active-tab-height': `${geometry.height}px`
        } as CSSProperties)
      : undefined
  }
}
