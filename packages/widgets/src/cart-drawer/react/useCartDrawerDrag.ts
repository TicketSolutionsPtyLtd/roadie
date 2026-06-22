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

import {
  MEASURE_PROGRESS_MAX,
  MOBILE_OPEN_TOP_INSET_PX,
  TAP_PX,
  VIEWPORT_MARGIN_PX,
  decideSnapTarget
} from '../../cart'

export type UseCartDrawerDragReturn = {
  state: 'open' | 'closed'
  setState: (next: 'open' | 'closed') => void
  toggle: () => void
  snapTo: (next: 'open' | 'closed') => void
  dragHeight: MotionValue<number>
  dragProgress: MotionValue<number>
  headerHeight: number
  footerHeight: number
  maxHeight: number
  setHeaderElement: (el: HTMLElement | null) => void
  setFooterElement: (el: HTMLElement | null) => void
  handleDragStart: (e: ReactPointerEvent) => void
  isDragging: boolean
  reducedMotion: boolean
}

type UseCartDrawerDragOptions = {
  initialState?: 'open' | 'closed'
}

function computeViewportMaxHeight(): number {
  if (typeof window === 'undefined') return 0
  if (window.innerWidth < 640) {
    // clientHeight is what `position: fixed` is measured against; inset keeps it clear of top chrome.
    const layoutH = document.documentElement.clientHeight || window.innerHeight
    return Math.max(0, layoutH - MOBILE_OPEN_TOP_INSET_PX)
  }
  const vh = window.visualViewport?.height ?? window.innerHeight
  return Math.max(0, vh - VIEWPORT_MARGIN_PX)
}

export function useCartDrawerDrag(
  opts: UseCartDrawerDragOptions = {}
): UseCartDrawerDragReturn {
  const reducedMotion = useReducedMotion() ?? false
  const initialState = opts.initialState ?? 'closed'
  const [state, setState] = useState<'open' | 'closed'>(initialState)

  const [headerHeight, setHeaderHeight] = useState(53)
  const [footerHeight, setFooterHeight] = useState(64)
  // Derived from the viewport, not the drawer's rendered height, to avoid a 0-high measurement loop.
  const [maxHeight, setMaxHeight] = useState(() => computeViewportMaxHeight())
  const [isDragging, setIsDragging] = useState(false)

  const closedHeight = headerHeight + footerHeight
  const dragHeight = useMotionValue<number>(
    initialState === 'open' ? maxHeight : closedHeight
  )

  // Clamp handles the edge where closedHeight === maxHeight (drawer not yet measured).
  const safeOpen = maxHeight > closedHeight ? maxHeight : closedHeight + 1
  const dragProgress = useTransform(
    dragHeight,
    [closedHeight, safeOpen],
    [0, 1],
    { clamp: true }
  )

  const headerObserverRef = useRef<ResizeObserver | null>(null)
  const footerObserverRef = useRef<ResizeObserver | null>(null)

  // Gates drag re-entry and filters out other concurrent pointers (multi-touch).
  const activePointerIdRef = useRef<number | null>(null)
  // Held in a ref so an unmount mid-drag can detach listeners and avoid a leak.
  const dragCleanupRef = useRef<(() => void) | null>(null)

  // Only measure while fully closed — morphing sizes would inflate closedHeight.
  const isClosedEnoughToMeasure = useCallback(
    () => dragProgress.get() < MEASURE_PROGRESS_MAX,
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

  // Keep maxHeight fresh against viewport + visualViewport resizes.
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
      // Detach any drag listeners still live at unmount (drag in progress).
      dragCleanupRef.current?.()
    }
  }, [])

  // useLayoutEffect: settle the motion value before paint (external store can't be mutated during render).
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
      // Re-entry guard: honour only the first pointer so a second finger can't install duplicate listeners.
      if (activePointerIdRef.current !== null) return
      const pointerId = e.pointerId
      activePointerIdRef.current = pointerId

      const startY = e.clientY
      const startHeight = dragHeight.get()
      const wasOpen = state === 'open'

      let lastClientY = startY
      let lastTime = Date.now()
      let velocity = 0
      setIsDragging(true)

      const detach = () => {
        window.removeEventListener('pointermove', onMove)
        window.removeEventListener('pointerup', onUp)
        window.removeEventListener('pointercancel', onUp)
        activePointerIdRef.current = null
        dragCleanupRef.current = null
      }

      const onMove = (ev: PointerEvent) => {
        if (ev.pointerId !== pointerId) return
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

      const onUp = (ev: PointerEvent) => {
        if (ev.pointerId !== pointerId) return
        detach()
        setIsDragging(false)

        const currentHeight = dragHeight.get()
        const totalMove = Math.abs(currentHeight - startHeight)

        if (totalMove < TAP_PX) {
          // Low-movement release = tap = toggle.
          snapTo(wasOpen ? 'closed' : 'open')
          return
        }

        // Core helper uses Y-position (up = negative); this hook tracks height (up = positive), so invert velocity/offset.
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
      dragCleanupRef.current = detach
    },
    [closedHeight, maxHeight, dragHeight, state, snapTo]
  )

  return {
    state,
    setState,
    toggle,
    snapTo,
    dragHeight,
    dragProgress,
    headerHeight,
    footerHeight,
    maxHeight,
    setHeaderElement,
    setFooterElement,
    handleDragStart,
    isDragging,
    reducedMotion
  }
}
