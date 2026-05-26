'use client'

import {
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState
} from 'react'

import {
  type MotionValue,
  animate,
  useMotionValue,
  useReducedMotion,
  useTransform
} from 'motion/react'

import { decideSnapTarget } from '../core'

export interface UseCartDrawerDragReturn {
  state: 'open' | 'closed'
  setState: (next: 'open' | 'closed') => void
  toggle: () => void
  /** Drawer's animated height in px. closedHeight when closed; maxHeight when open. */
  dragHeight: MotionValue<number>
  /** 0 at closedHeight → 1 at maxHeight. */
  dragProgress: MotionValue<number>
  /** Measured header (drag pill + title area) height in px. */
  headerHeight: number
  /** Measured footer (action row + safe-area padding) height in px. */
  footerHeight: number
  /** Drawer element's CSS-driven max height in px. */
  maxHeight: number
  setHeaderElement: (el: HTMLElement | null) => void
  setFooterElement: (el: HTMLElement | null) => void
  setDrawerElement: (el: HTMLElement | null) => void
  /**
   * Call from the drag region's onPointerDown. Installs document-level
   * pointermove + pointerup listeners, tracks velocity, updates `dragHeight`
   * live, and snaps on release.
   */
  handleDragStart: (e: ReactPointerEvent) => void
  /** True while a drag is in progress — callers may want to disable transitions. */
  isDragging: boolean
  reducedMotion: boolean
}

interface UseCartDrawerDragOptions {
  initialState?: 'open' | 'closed'
}

// 32px matches the drawer's vertical margins (bottom-4 + ~1rem top gap); the
// prototype uses the same viewport-minus-offset formula. `window.visualViewport`
// is preferred over `innerHeight` where available because it tracks the
// visible viewport (excludes iOS URL bar overlay).
function computeViewportMaxHeight(): number {
  if (typeof window === 'undefined') return 0
  const vh = window.visualViewport?.height ?? window.innerHeight
  return Math.max(0, vh - 32)
}

export function useCartDrawerDrag(
  opts: UseCartDrawerDragOptions = {}
): UseCartDrawerDragReturn {
  const reducedMotion = useReducedMotion() ?? false
  const initialState = opts.initialState ?? 'closed'
  const [state, setState] = useState<'open' | 'closed'>(initialState)

  // Defaults match the prototype's closedHeight breakdown: drag pill (~21) +
  // closed title area (32) = 53 header; pt-2 (8) + h-11 buttons (44) +
  // pb-0.75rem (12) = 64 footer. ResizeObserver refines these at mount and
  // skips measurements while the drawer is morphing (open or mid-transition)
  // so an open observation can't inflate closedHeight.
  const [headerHeight, setHeaderHeight] = useState(53)
  const [footerHeight, setFooterHeight] = useState(64)
  // maxHeight: how tall the drawer should be when open. Derived from the
  // viewport, NOT from the drawer's rendered height — the drawer's rendered
  // height is controlled by `dragHeight`, so observing the element itself
  // would lock us into a 0-high measurement loop. Matches prototype.
  const [maxHeight, setMaxHeight] = useState(() => computeViewportMaxHeight())
  const [isDragging, setIsDragging] = useState(false)

  const closedHeight = headerHeight + footerHeight
  const dragHeight = useMotionValue<number>(
    initialState === 'open' ? maxHeight : closedHeight
  )

  // progress: 0 at closedHeight, 1 at maxHeight. Clamp to handle the edge
  // where closedHeight === maxHeight (drawer not yet measured).
  const safeOpen = maxHeight > closedHeight ? maxHeight : closedHeight + 1
  const dragProgress = useTransform(
    dragHeight,
    [closedHeight, safeOpen],
    [0, 1],
    { clamp: true }
  )

  // Observers.
  const headerObserverRef = useRef<ResizeObserver | null>(null)
  const footerObserverRef = useRef<ResizeObserver | null>(null)

  // Measurement guard: only accept header/footer observations while the
  // drawer is fully closed. When morphing (dragProgress > 0), the header
  // includes the expanded title area and the footer includes expanded
  // subtotal/fees rows — observing those sizes would inflate closedHeight.
  const isClosedEnoughToMeasure = useCallback(
    () => dragProgress.get() < 0.05,
    [dragProgress]
  )

  const readBlockSize = (entry: ResizeObserverEntry): number => {
    const bbox = entry.borderBoxSize?.[0]?.blockSize
    return typeof bbox === 'number'
      ? bbox
      : (entry.target as HTMLElement).getBoundingClientRect().height
  }

  const setHeaderElement = useCallback(
    (el: HTMLElement | null) => {
      headerObserverRef.current?.disconnect()
      headerObserverRef.current = null
      if (!el || typeof ResizeObserver === 'undefined') return
      if (isClosedEnoughToMeasure()) {
        setHeaderHeight(el.getBoundingClientRect().height)
      }
      const ro = new ResizeObserver((entries) => {
        if (!isClosedEnoughToMeasure()) return
        for (const entry of entries) setHeaderHeight(readBlockSize(entry))
      })
      ro.observe(el)
      headerObserverRef.current = ro
    },
    [isClosedEnoughToMeasure]
  )

  const setFooterElement = useCallback(
    (el: HTMLElement | null) => {
      footerObserverRef.current?.disconnect()
      footerObserverRef.current = null
      if (!el || typeof ResizeObserver === 'undefined') return
      if (isClosedEnoughToMeasure()) {
        setFooterHeight(el.getBoundingClientRect().height)
      }
      const ro = new ResizeObserver((entries) => {
        if (!isClosedEnoughToMeasure()) return
        for (const entry of entries) setFooterHeight(readBlockSize(entry))
      })
      ro.observe(el)
      footerObserverRef.current = ro
    },
    [isClosedEnoughToMeasure]
  )

  // setDrawerElement is retained for API compatibility (CartDrawer wires a
  // ref to the drawer root) but is now a no-op — maxHeight is viewport-derived.
  const setDrawerElement = useCallback((_el: HTMLElement | null) => {}, [])

  // Keep maxHeight fresh against viewport + visualViewport resizes (URL bar
  // collapse, rotation, keyboard show/hide).
  useEffect(() => {
    if (typeof window === 'undefined') return
    const update = () => setMaxHeight(computeViewportMaxHeight())
    update()
    window.addEventListener('resize', update)
    window.visualViewport?.addEventListener('resize', update)
    return () => {
      window.removeEventListener('resize', update)
      window.visualViewport?.removeEventListener('resize', update)
    }
  }, [])

  useEffect(() => {
    return () => {
      headerObserverRef.current?.disconnect()
      footerObserverRef.current?.disconnect()
    }
  }, [])

  // When measured heights or logical state change (and the user isn't actively
  // dragging), settle the motion value to the corresponding target before paint
  // so the visual height stays coherent. useLayoutEffect — not adjust-during-
  // render — because the motion value is an external store and mutating it
  // during render isn't safe under concurrent rendering.
  useLayoutEffect(() => {
    if (isDragging) return
    dragHeight.set(state === 'open' ? maxHeight : closedHeight)
  }, [isDragging, closedHeight, maxHeight, state, dragHeight])

  const snapTo = useCallback(
    (next: 'open' | 'closed') => {
      const target = next === 'open' ? maxHeight : closedHeight
      animate(
        dragHeight,
        target,
        reducedMotion
          ? { duration: 0 }
          : { type: 'spring', damping: 30, stiffness: 300 }
      )
      setState(next)
    },
    [closedHeight, maxHeight, dragHeight, reducedMotion]
  )

  const toggle = useCallback(() => {
    snapTo(state === 'open' ? 'closed' : 'open')
  }, [state, snapTo])

  const handleDragStart = useCallback(
    (e: ReactPointerEvent) => {
      const startY = e.clientY
      const startHeight = dragHeight.get()
      const wasOpen = state === 'open'

      let lastClientY = startY
      let lastTime = Date.now()
      let velocity = 0
      setIsDragging(true)

      const onMove = (ev: PointerEvent) => {
        const delta = startY - ev.clientY // positive = dragged up = opening
        const newHeight = Math.min(
          maxHeight,
          Math.max(closedHeight, startHeight + delta)
        )

        const now = Date.now()
        const dt = now - lastTime
        if (dt > 0) {
          // px / sec; positive = moving up
          velocity = ((lastClientY - ev.clientY) / dt) * 1000
        }
        lastClientY = ev.clientY
        lastTime = now

        dragHeight.set(newHeight)
      }

      const onUp = () => {
        window.removeEventListener('pointermove', onMove)
        window.removeEventListener('pointerup', onUp)
        window.removeEventListener('pointercancel', onUp)
        setIsDragging(false)

        const currentHeight = dragHeight.get()
        const totalMove = Math.abs(currentHeight - startHeight)

        if (totalMove < 5) {
          // Low-movement release = tap = toggle.
          snapTo(wasOpen ? 'closed' : 'open')
          return
        }

        // Delegate the snap decision to the pure, unit-tested core helper. Its
        // coordinate convention is Y-position with up = negative; this hook
        // tracks height with up = positive, so we invert sign on velocity and
        // offset. Mapping: openY = 0, closedY = maxHeight - closedHeight
        // (drawer's top edge sits that far below the open position when docked).
        const target = decideSnapTarget({
          velocity: -velocity,
          offset: -(currentHeight - startHeight),
          currentState: wasOpen ? 'open' : 'closed',
          openY: 0,
          closedY: maxHeight - closedHeight
        })
        snapTo(target)
      }

      window.addEventListener('pointermove', onMove)
      window.addEventListener('pointerup', onUp)
      window.addEventListener('pointercancel', onUp)
    },
    [closedHeight, maxHeight, dragHeight, state, snapTo]
  )

  return {
    state,
    setState,
    toggle,
    dragHeight,
    dragProgress,
    headerHeight,
    footerHeight,
    maxHeight,
    setHeaderElement,
    setFooterElement,
    setDrawerElement,
    handleDragStart,
    isDragging,
    reducedMotion
  }
}
