'use client'

import {
  type CSSProperties,
  type RefObject,
  useEffect,
  useEffectEvent,
  useRef,
  useState
} from 'react'

import { useIsomorphicLayoutEffect } from '../../utils/useIsomorphicLayoutEffect'
import { holdDuringLayoutTransitions } from './transitionHold'

/** `data-current`, not `aria-current`: a destination on an undeclared sub-route holds the pill. */
export const ACTIVE_DESTINATION_SELECTOR =
  '[data-slot="navigator-item"][data-current]'

export type SlidingIndicatorState = {
  style: CSSProperties | undefined
  ready: boolean
  /** Ready since an earlier commit and last moved to another destination on `intent`, so it slides rather than jumps. */
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

// Offsets, not rects: rects include the bar's collapse transforms and freeze
// mid-travel. Null when the offsetParent chain misses the track.
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

/** Fallback where offsetParent can't reach the track (a transform containing block, jsdom). */
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

/** Publishes the current destination's box as `--active-tab-*`; slides only on a change of `intent`. */
export function useSlidingIndicator(
  trackRef: RefObject<HTMLElement | null>,
  intent: string
): SlidingIndicatorState {
  const [geometry, setGeometry] = useState<Geometry | null>(null)
  const [ready, setReady] = useState(false)
  const [settled, setSettled] = useState(false)
  // A destination resizing, reflowing or folding into More snaps.
  const [slides, setSlides] = useState(true)
  const geometryRef = useRef<Geometry | null>(null)
  const destinationRef = useRef<HTMLElement | null>(null)
  const measuredIntentRef = useRef(intent)

  const measure = useEffectEvent(() => {
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
    if (!visible || !track || !active) {
      destinationRef.current = null
      return
    }
    const next = {
      ...box,
      right: track.clientWidth - box.left - box.width
    }
    const asked = intent !== measuredIntentRef.current
    const previous = destinationRef.current
    if (!sameGeometry(geometryRef.current, next)) {
      geometryRef.current = next
      setGeometry(next)
      setSlides(previous === null || (asked && active !== previous))
    }
    destinationRef.current = active
    measuredIntentRef.current = intent
  })

  // No deps: the pill can move without the value changing. The track ref is null on
  // first run; the ResizeObserver's first callback recovers it.
  useIsomorphicLayoutEffect(() => measure())

  useEffect(() => {
    const track = trackRef.current
    if (!track || typeof ResizeObserver === 'undefined') return

    // Resized every frame of an expand; the pill snaps to where it lands.
    const hold = holdDuringLayoutTransitions(
      track.closest('[data-slot="navigator-primary"]') ?? track,
      () => measure()
    )
    const observer = new ResizeObserver(() => hold.schedule())
    observer.observe(track)
    for (const destination of track.querySelectorAll<HTMLElement>(
      '[data-slot="navigator-item"]'
    )) {
      observer.observe(destination)
    }
    return () => {
      observer.disconnect()
      hold.dispose()
    }
  }, [trackRef])

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
