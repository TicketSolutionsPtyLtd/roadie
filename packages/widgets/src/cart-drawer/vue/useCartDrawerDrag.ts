import {
  type ComputedRef,
  type Ref,
  computed,
  onBeforeUnmount,
  onMounted,
  ref,
  watch
} from 'vue'

import { decideSnapTarget } from '../core'

export interface UseCartDrawerDragReturn {
  state: Ref<'open' | 'closed'>
  setState: (next: 'open' | 'closed') => void
  toggle: () => void
  /** Live drawer height in px (drag drives it; settles to closed/open on release). */
  dragHeight: Ref<number>
  /** 0 at closedHeight → 1 at maxHeight. */
  progress: ComputedRef<number>
  /** Measured header height in px. */
  headerHeight: Ref<number>
  /** Measured footer height in px. */
  footerHeight: Ref<number>
  /** headerHeight + footerHeight — the docked (closed) drawer height. */
  closedHeight: ComputedRef<number>
  /** Viewport-derived open height in px. */
  maxHeight: Ref<number>
  /** True while a pointer drag is in progress — disables the height transition. */
  isDragging: Ref<boolean>
  /** Whether the user prefers reduced motion. */
  reducedMotion: Ref<boolean>
  /** Template refs to wire onto the header / footer elements for measurement. */
  setHeaderElement: (el: HTMLElement | null) => void
  setFooterElement: (el: HTMLElement | null) => void
  /** Begin a drag from the drag region's pointerdown. */
  handleDragStart: (e: PointerEvent) => void
}

interface Options {
  initialState?: 'open' | 'closed'
}

// 32px matches the drawer's vertical margins; visualViewport is preferred over
// innerHeight where available because it excludes the iOS URL-bar overlay.
function computeViewportMaxHeight(): number {
  if (typeof window === 'undefined') return 0
  const vh = window.visualViewport?.height ?? window.innerHeight
  return Math.max(0, vh - 32)
}

export function useCartDrawerDrag(opts: Options = {}): UseCartDrawerDragReturn {
  const initialState = opts.initialState ?? 'closed'
  const state = ref<'open' | 'closed'>(initialState)

  // Defaults mirror the React skin's closedHeight breakdown (53 header / 64
  // footer). ResizeObserver refines them while the drawer is fully closed.
  const headerHeight = ref(53)
  const footerHeight = ref(64)
  const closedHeight = computed(() => headerHeight.value + footerHeight.value)
  const maxHeight = ref(computeViewportMaxHeight())
  const isDragging = ref(false)
  const reducedMotion = ref(
    typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )

  const dragHeight = ref(
    initialState === 'open' ? maxHeight.value : closedHeight.value
  )

  const progress = computed(() => {
    const span = maxHeight.value - closedHeight.value
    if (span <= 0) return state.value === 'open' ? 1 : 0
    const p = (dragHeight.value - closedHeight.value) / span
    return Math.max(0, Math.min(1, p))
  })

  // Settle height to the logical target whenever measurements / state change
  // (and the user isn't actively dragging).
  watch(
    [state, closedHeight, maxHeight, isDragging],
    () => {
      if (isDragging.value) return
      dragHeight.value =
        state.value === 'open' ? maxHeight.value : closedHeight.value
    },
    { flush: 'sync' }
  )

  let headerObserver: ResizeObserver | null = null
  let footerObserver: ResizeObserver | null = null

  // The pointer currently driving a drag (null when idle). Gates re-entry and
  // filters out events from other concurrent pointers (multi-touch).
  let activePointerId: number | null = null

  const isClosedEnoughToMeasure = () => progress.value < 0.05

  const readBlockSize = (entry: ResizeObserverEntry): number => {
    const bbox = entry.borderBoxSize?.[0]?.blockSize
    return typeof bbox === 'number'
      ? bbox
      : (entry.target as HTMLElement).getBoundingClientRect().height
  }

  const setHeaderElement = (el: HTMLElement | null) => {
    headerObserver?.disconnect()
    headerObserver = null
    if (!el || typeof ResizeObserver === 'undefined') return
    if (isClosedEnoughToMeasure()) {
      const h = el.getBoundingClientRect().height
      if (h > 0) headerHeight.value = h
    }
    headerObserver = new ResizeObserver((entries) => {
      if (!isClosedEnoughToMeasure()) return
      for (const entry of entries) {
        const h = readBlockSize(entry)
        if (h > 0) headerHeight.value = h
      }
    })
    headerObserver.observe(el)
  }

  const setFooterElement = (el: HTMLElement | null) => {
    footerObserver?.disconnect()
    footerObserver = null
    if (!el || typeof ResizeObserver === 'undefined') return
    if (isClosedEnoughToMeasure()) {
      const h = el.getBoundingClientRect().height
      if (h > 0) footerHeight.value = h
    }
    footerObserver = new ResizeObserver((entries) => {
      if (!isClosedEnoughToMeasure()) return
      for (const entry of entries) {
        const h = readBlockSize(entry)
        if (h > 0) footerHeight.value = h
      }
    })
    footerObserver.observe(el)
  }

  const updateViewport = () => {
    maxHeight.value = computeViewportMaxHeight()
  }

  onMounted(() => {
    if (typeof window === 'undefined') return
    updateViewport()
    window.addEventListener('resize', updateViewport)
    window.visualViewport?.addEventListener('resize', updateViewport)
  })

  onBeforeUnmount(() => {
    headerObserver?.disconnect()
    footerObserver?.disconnect()
    if (typeof window === 'undefined') return
    window.removeEventListener('resize', updateViewport)
    window.visualViewport?.removeEventListener('resize', updateViewport)
  })

  const setState = (next: 'open' | 'closed') => {
    state.value = next
  }

  const snapTo = (next: 'open' | 'closed') => {
    // CSS transition on the bound height animates the spring; we only set the
    // logical state + target. isDragging is false here, so the height watcher
    // settles dragHeight to the target.
    state.value = next
    dragHeight.value = next === 'open' ? maxHeight.value : closedHeight.value
  }

  const toggle = () => {
    snapTo(state.value === 'open' ? 'closed' : 'open')
  }

  const handleDragStart = (e: PointerEvent) => {
    if (typeof window === 'undefined') return
    // Re-entry guard: a second finger landing mid-drag would otherwise install
    // a duplicate listener set whose release fires snapTo with conflicting
    // targets. Honour only the first pointer until it ends.
    if (activePointerId !== null) return
    const pointerId = e.pointerId
    activePointerId = pointerId

    const startY = e.clientY
    const startHeight = dragHeight.value
    const wasOpen = state.value === 'open'

    let lastClientY = startY
    let lastTime = Date.now()
    let velocity = 0
    isDragging.value = true

    const onMove = (ev: PointerEvent) => {
      if (ev.pointerId !== pointerId) return
      const delta = startY - ev.clientY // positive = dragged up = opening
      dragHeight.value = Math.min(
        maxHeight.value,
        Math.max(closedHeight.value, startHeight + delta)
      )

      const now = Date.now()
      const dt = now - lastTime
      if (dt > 0) {
        velocity = ((lastClientY - ev.clientY) / dt) * 1000
      }
      lastClientY = ev.clientY
      lastTime = now
    }

    const onUp = (ev: PointerEvent) => {
      if (ev.pointerId !== pointerId) return
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
      activePointerId = null
      isDragging.value = false

      const currentHeight = dragHeight.value
      const totalMove = Math.abs(currentHeight - startHeight)

      if (totalMove < 5) {
        snapTo(wasOpen ? 'closed' : 'open')
        return
      }

      // Delegate to the pure, unit-tested core helper. Core's convention is
      // Y-position with up = negative; this hook tracks height with up =
      // positive, so invert velocity + offset. openY = 0, closedY =
      // maxHeight - closedHeight (drawer top edge sits that far down when docked).
      const target = decideSnapTarget({
        velocity: -velocity,
        offset: -(currentHeight - startHeight),
        currentState: wasOpen ? 'open' : 'closed',
        openY: 0,
        closedY: maxHeight.value - closedHeight.value
      })
      snapTo(target)
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
  }

  return {
    state,
    setState,
    toggle,
    dragHeight,
    progress,
    headerHeight,
    footerHeight,
    closedHeight,
    maxHeight,
    isDragging,
    reducedMotion,
    setHeaderElement,
    setFooterElement,
    handleDragStart
  }
}
