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

import { MEASURE_PROGRESS_MAX } from '../../cart'
import {
  DRAWER_SPRING,
  createDrawerDrag,
  openDrawerHeight
} from '../../cart/drawer'

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

export function useCartDrawerDrag(
  opts: UseCartDrawerDragOptions = {}
): UseCartDrawerDragReturn {
  const reducedMotion = useReducedMotion() ?? false
  const initialState = opts.initialState ?? 'closed'
  const [state, setState] = useState<'open' | 'closed'>(initialState)

  const [headerHeight, setHeaderHeight] = useState(53)
  const [footerHeight, setFooterHeight] = useState(64)
  // Derived from the viewport, not the drawer's rendered height, to avoid a 0-high measurement loop.
  const [maxHeight, setMaxHeight] = useState(() => openDrawerHeight())
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

  const [drag] = useState(() => createDrawerDrag())

  // Only measure while fully closed: morphing sizes would inflate closedHeight.
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
    const update = () => setMaxHeight(openDrawerHeight())
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
      drag.dispose()
    }
  }, [drag])

  // Where the running spring is heading, so a re-render doesn't restart it.
  const springTargetRef = useRef<number | null>(null)
  const springTo = useCallback(
    (target: number) => {
      springTargetRef.current = target
      animate(
        dragHeight,
        target,
        reducedMotion ? { duration: 0 } : DRAWER_SPRING
      )
    },
    [dragHeight, reducedMotion]
  )

  // useLayoutEffect: settle the motion value before paint (external store can't be mutated during render).
  // A `set()` under a running spring draws one frame there before the spring
  // takes it back, so a spring is retargeted instead, as when the footer
  // re-measures while the drawer closes.
  useLayoutEffect(() => {
    if (isDragging) return
    const target = state === 'open' ? maxHeight : closedHeight
    if (!dragHeight.isAnimating()) dragHeight.set(target)
    else if (springTargetRef.current !== target) springTo(target)
  }, [isDragging, closedHeight, maxHeight, state, dragHeight, springTo])

  const snapTo = useCallback(
    (next: 'open' | 'closed') => {
      springTo(next === 'open' ? maxHeight : closedHeight)
      setState(next)
    },
    [closedHeight, maxHeight, springTo]
  )

  const toggle = useCallback(() => {
    snapTo(state === 'open' ? 'closed' : 'open')
  }, [state, snapTo])

  const handleDragStart = useCallback(
    (e: ReactPointerEvent) => {
      const started = drag.start({
        pointer: e,
        wasOpen: state === 'open',
        getHeight: () => dragHeight.get(),
        setHeight: (px) => dragHeight.set(px),
        bounds: () => ({ closedHeight, maxHeight }),
        onRelease: (target) => {
          setIsDragging(false)
          snapTo(target)
        }
      })
      if (!started) return
      setIsDragging(true)
      // Hand the height over to the pointer: stop any snap spring still settling.
      dragHeight.stop()
    },
    [drag, closedHeight, maxHeight, dragHeight, state, snapTo]
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
